import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { scrapeEcommerceUrl, extractJsonFromText, scrapeStoreItems } from "./scraper.js";
import { scrapeProductWithStagehand, scrapeStoreWithStagehand, closeStagehand } from "./stagehand.js";

dotenv.config();

export const app = express();

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en los Secretos.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "FlipTrack Server", time: new Date().toISOString() });
});

// Helper to parse rates from DolarFlow JSON responses
function parseRateFromJson(json: any): number {
  if (json === null || json === undefined) return 0;
  if (typeof json === "number" && !isNaN(json) && json > 0) return json;
  if (typeof json === "string") {
    const match = json.replace(/,/g, ".").match(/[\d.]+/);
    if (match) {
      const num = parseFloat(match[0]);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  }

  if (Array.isArray(json)) {
    for (const item of json) {
      const val = parseRateFromJson(item);
      if (val > 0) return val;
    }
    return 0;
  }

  if (typeof json === "object") {
    const priorityKeys = [
      "promedio", "price", "precio", "rate", "tasa", "oficial", "paralelo",
      "monto", "valor", "dollar", "usd", "bcv", "value"
    ];
    for (const key of priorityKeys) {
      if (json[key] !== undefined && json[key] !== null) {
        const val = parseRateFromJson(json[key]);
        if (val > 0) return val;
      }
    }

    for (const subKey of ["data", "result", "response", "values"]) {
      if (json[subKey]) {
        const val = parseRateFromJson(json[subKey]);
        if (val > 0) return val;
      }
    }

    for (const v of Object.values(json)) {
      if (typeof v === "number" && v > 1) return v;
      if (typeof v === "string") {
        const parsed = parseRateFromJson(v);
        if (parsed > 1) return parsed;
      }
    }
  }

  return 0;
}

// ── Refuerzo determinista: Reglas estrictas de bloqueo (red + iCloud) ─────────
// Se aplican sobre el texto REAL del anuncio (título + descripción + datos
// extraídos en vivo), independientemente de lo que responda la IA. Si el artículo
// es un teléfono y no cumple las reglas estrictas, se FUERZA el veredicto
// "NO VALE LA PENA". Así la regla no depende del cumplimiento del LLM.

// Detección de teléfono basada en el TÍTULO (identidad del producto). Evita falsos
// positivos del texto completo ("teléfono de contacto", "Samsung TV", "pixel resolution").
const PHONE_PATTERN = /\b(iphone|galaxy\s+(?:s|z|a|note|j|m|f)\s?\d*|pixel\s+\d*|smartphone|celular|telefono|tel[eé]fono|xiaomi|huawei|oneplus|motorola|moto\s+g|moto\s+e)\b/i;

// Patrón fuerte de respaldo (solo se usa si no hay título): busca modelos explícitos.
const STRONG_PHONE_PATTERN = /\b(iphone|galaxy\s+(?:s|z|a|note|j|m|f)\s?\d+|pixel\s+\d+|smartphone)\b/i;

// Señales NEGATIVAS de red (bloqueado / restringido a una sola red)
const NETWORK_LOCK_SIGNALS = [
  /\blocked\s+to\b/i,
  /\blocked\s+by\b/i,
  /\bcarrier\s*lock(?:ed)?\b/i,
  /\bsim\s*lock(?:ed)?\b/i,
  /\bnetwork\s*lock(?:ed)?\b/i,
  /\blocked\s+(?:to\s+)?(?:at&?t|verizon|t-mobile|t\s*mobile|sprint|att|tmobile|cricket|metro|boost|vzw)\b/i,
  /\b(?:at&?t|verizon|t-mobile|t\s*mobile|sprint)\s+locked\b/i,
  /\bsolo\s+funciona\s+con\b/i,
  /\bonly\s+works\s+with\b/i,
  /\bbloquead[oa]\s+(?:a|por)\b/i,
  /\bbloqueo\s+de\s+(?:red|operadora|compa[nñ]ia)\b/i,
];

// Señales POSITIVAS de red (desbloqueo universal explícito)
const NETWORK_UNLOCK_SIGNALS = [
  /\bunlocked\b/i,
  /\bfactory\s+unlocked\b/i,
  /\bnetwork\s+unlocked\b/i,
  /\bdesbloquead[oa]\b/i,
  /\blibera(?:do|da)\b/i,
  /\bsin\s+bloqueo\b/i,
];

// Señales NEGATIVAS de iCloud / Find My (solo iPhone/Apple)
const ICLOUD_LOCK_SIGNALS = [
  /\bicloud\s*lock(?:ed)?\b/i,
  /\bactivation\s*lock(?:ed)?\b/i,
  /\bfind\s+my\s+(?:is\s+)?(?:on|activo|activado|active)\b/i,
  /\blocked\s+to\s+(?:an?\s+)?apple\b/i,
  /\bapple\s*id\s+lock(?:ed)?\b/i,
  /\bbloquead[oa]\s+por\s+icloud\b/i,
];

// Señales POSITIVAS de iCloud / Find My (libre de activación)
const ICLOUD_UNLOCK_SIGNALS = [
  /\bicloud\s*unlock(?:ed)?\b/i,
  /\bicloud\s*(?:cleared|off|disabled|free|removed)\b/i,
  /\bfind\s+my\s+(?:is\s+)?(?:off|disabled|apagad[oa]|desactivad[oa])\b/i,
  /\bactivation\s*unlock(?:ed)?\b/i,
  /\bdesbloquead[oa]\s+de\s+icloud\b/i,
  /\bsin\s+bloqueo\s+de\s+activaci[oó]n\b/i,
];

function enforceLockGuard(parsed: any, rawText: string, title?: string): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const txt = String(rawText || "").toLowerCase();
  const titleTxt = String(title || "").trim().toLowerCase();
  // "Es un teléfono" se decide por el TÍTULO (o patrón fuerte si no hay título).
  const isPhone = titleTxt ? PHONE_PATTERN.test(titleTxt) : STRONG_PHONE_PATTERN.test(txt);
  if (!txt || !isPhone) return false;

  const reasons: string[] = [];
  const isIphone = /\biphone\b/i.test(txt);

  // 1) Regla estricta de red: bloqueo detectado o falta de confirmación textual
  const hasLock = NETWORK_LOCK_SIGNALS.some((re) => re.test(txt));
  const hasUnlock = NETWORK_UNLOCK_SIGNALS.some((re) => re.test(txt));
  if (hasLock) {
    reasons.push("bloqueado a operadora/red específica");
  } else if (!hasUnlock) {
    reasons.push("no afirma textualmente 'Unlocked'/'Factory Unlocked'/'Network Unlocked'");
  }

  // 2) Regla estricta de iCloud (solo iPhone/Apple): bloqueo o falta de confirmación
  if (isIphone) {
    const hasIcloudLock = ICLOUD_LOCK_SIGNALS.some((re) => re.test(txt));
    const hasIcloudUnlock = ICLOUD_UNLOCK_SIGNALS.some((re) => re.test(txt));
    if (hasIcloudLock) {
      reasons.push("iCloud/Find My bloqueado (activation lock)");
    } else if (!hasIcloudUnlock) {
      reasons.push("no afirma textualmente 'iCloud unlocked'/'Find My off'");
    }
  }

  if (reasons.length === 0) return false;

  // Fuerza el veredicto determinista
  parsed.finalVerdict = parsed.finalVerdict || {};
  parsed.finalVerdict.decision = "NO VALE LA PENA";
  parsed.finalVerdict.summaryExplanation = `[GUARD DETERMINISTA] ${reasons.join("; ")}. ${parsed.finalVerdict.summaryExplanation || ""}`.trim();
  parsed.productIdentification = parsed.productIdentification || {};
  parsed.productIdentification.riskLevel = "Alto";
  if (!Array.isArray(parsed.productIdentification.riskSignals)) parsed.productIdentification.riskSignals = [];
  parsed.productIdentification.riskSignals.push(...reasons);
  console.warn(`[FlipMaster GUARD] Teléfono descartado por regla estricta: ${reasons.join("; ")}`);
  return true;
}

// Exchange Rate API (Consuming DolarFlow APIs: https://dolarflow.com/api/oficial/ & https://dolarflow.com/api/paralelo/)
app.get("/api/exchange-rate", async (_req, res) => {
  let bcvRate = 72.45;
  let paraleloRate = 84.80;
  let source = "DolarFlow API (dolarflow.com)";
  let lastUpdated = new Date().toISOString();

  try {
    const [oficialRes, paraleloRes] = await Promise.allSettled([
      fetch("https://dolarflow.com/api/oficial/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(6000),
      }),
      fetch("https://dolarflow.com/api/paralelo/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(6000),
      }),
    ]);

    if (oficialRes.status === "fulfilled" && oficialRes.value.ok) {
      try {
        const oficialJson = await oficialRes.value.json();
        const extractedOficial = parseRateFromJson(oficialJson);
        if (extractedOficial > 0) {
          bcvRate = extractedOficial;
        }
      } catch (e) {
        console.warn("Error parsing oficial rate from DolarFlow:", e);
      }
    }

    if (paraleloRes.status === "fulfilled" && paraleloRes.value.ok) {
      try {
        const paraleloJson = await paraleloRes.value.json();
        const extractedParalelo = parseRateFromJson(paraleloJson);
        if (extractedParalelo > 0) {
          paraleloRate = extractedParalelo;
        }
      } catch (e) {
        console.warn("Error parsing paralelo rate from DolarFlow:", e);
      }
    }

    const roundedBCV = Math.round(bcvRate * 100) / 100;
    const roundedParalelo = Math.round(paraleloRate * 100) / 100;

    return res.json({
      success: true,
      bcv: roundedBCV,
      paralelo: roundedParalelo,
      lastUpdated,
      source,
    });
  } catch (error: any) {
    console.error("Exchange Rate API fetch error:", error);
    const roundedBCV = Math.round(bcvRate * 100) / 100;
    const roundedParalelo = Math.round(paraleloRate * 100) / 100;
    return res.json({
      success: true,
      bcv: roundedBCV,
      paralelo: roundedParalelo,
      lastUpdated,
      source: "DolarFlow API (Valores por defecto / Fallback)",
      error: error.message,
    });
  }
});

// Live E-commerce Web Scraper Endpoint (eBay, Swappa, Mercadolibre, Amazon)
app.post("/api/scrape-url", async (req, res) => {
  try {
    const { url, firecrawlApiKey } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Ingresa una URL válida de la publicación." });
    }

    const scrapedData = await scrapeEcommerceUrl(url, firecrawlApiKey);
    return res.json({ success: true, data: scrapedData });
  } catch (error: any) {
    console.error("Scraper Endpoint Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error al extraer datos reales de la URL.",
    });
  }
});

// Detecta keys placeholder/fake del frontend (ej. "nvapi...i3", "MY_NVIDIA_API_KEY")
// para no anular la env var real NVIDIA_API_KEY del servidor.
const FAKE_NVIDIA_KEY = /^(nvapi\.\.\.|MY_NVIDIA_API_KEY)/i;

function resolveNvidiaKey(clientKey?: string): string {
  const trimmed = String(clientKey || "").trim();
  if (!trimmed || FAKE_NVIDIA_KEY.test(trimmed)) {
    return process.env.NVIDIA_API_KEY || "";
  }
  return trimmed;
}

// Test AI Connection Endpoint (NVIDIA NIM — DeepSeek)
app.post("/api/test-ai", async (req, res) => {
  try {
    const { apiKey, modelName = "deepseek-ai/deepseek-v4-flash-0731" } = req.body;
    const key = resolveNvidiaKey(apiKey);
    if (!key) {
      return res.status(400).json({ success: false, error: "No hay API key de NVIDIA configurada. Agrega tu nvapi-..." });
    }
    const t0 = Date.now();
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Responde únicamente: OK" }],
        max_tokens: 16,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const ms = Date.now() - t0;
    if (r.ok) {
      return res.json({ success: true, message: `✅ Conexión OK (${ms} ms)`, model: modelName, status: r.status });
    }
    const body = await r.text();
    let detail = "";
    try {
      const j = JSON.parse(body);
      detail = j?.error?.message || j?.message || "";
    } catch {}
    return res.json({ success: false, status: r.status, error: `HTTP ${r.status}: ${(detail || body).slice(0, 200)}` });
  } catch (err: any) {
    return res.json({ success: false, error: err?.message || "Error de conexión con NVIDIA NIM." });
  }
});

// Telegram Test Endpoint
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ success: false, error: "Faltan botToken o chatId de Telegram." });
    }
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🤖 FlipTrack conectado correctamente. Alertas de escaneo activas.",
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      return res.json({ success: true, message: "✅ Mensaje de prueba enviado a Telegram." });
    }
    return res.json({ success: false, error: j?.description || `HTTP ${r.status}` });
  } catch (err: any) {
    return res.json({ success: false, error: err?.message || "Error de conexión con Telegram." });
  }
});

// ── Stagehand Smart Scraper (complemento a Firecrawl) ────────────────────────────
// Para sitios dinámicos: ShopGoodwill (Cloudflare + lazy-loading), eBay searches,
// y cualquier sitio que Firecrawl no pueda manejar.
app.post("/api/scrape-smart", async (req, res) => {
  try {
    const { url, type = "product", browserbaseApiKey, nvidiaApiKey } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Ingresa una URL válida." });
    }

    if (type === "store") {
      const result = await scrapeStoreWithStagehand(url, {
        browserbaseApiKey,
        nvidiaApiKey,
      });
      return res.json({ success: true, ...result, method: "Stagehand" });
    }

    const result = await scrapeProductWithStagehand(url, {
      browserbaseApiKey,
      nvidiaApiKey,
    });
    if (!result) {
      return res.status(404).json({ success: false, error: "Stagehand no pudo extraer datos de la página." });
    }
    return res.json({ success: true, data: result, method: "Stagehand" });
  } catch (error: any) {
    console.error("Stagehand Smart Scraper Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error con Stagehand. Verifica que BROWSERBASE_API_KEY esté configurada.",
    });
  } finally {
    // Cerrar sesión de Stagehand para liberar recursos
    await closeStagehand().catch(() => {});
  }
});

// Scrape Store / Seller Search Endpoint (Firecrawl — esquiva CAPTCHA de eBay)
app.post("/api/scrape-store", async (req, res) => {
  try {
    const { url, firecrawlApiKey } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Ingresa la URL de la tienda o vendedor de eBay." });
    }
    // La key de Firecrawl se acepta del frontend (Ajustes) con prioridad sobre la env var
    const items = await scrapeStoreItems(url, firecrawlApiKey);
    return res.json({ success: true, items });
  } catch (error: any) {
    console.error("Store Scraper Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error al escanear la tienda. Verifica la URL y la key de Firecrawl.",
    });
  }
});

// FlipMaster AI Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  const handlerStart = Date.now();
  const DEADLINE_MS = 50000; // 50s hard limit (Vercel Hobby = 60s)
  try {
    let {
      url,
      title,
      description,
      listedPrice,
      platform = "eBay",
      declaredCondition = "Usado / Con Defectos",
      courierRate = 3.10, // USD per lb (Liberty Air — tarifa real verificada)
      minCourierFee = 25.0, // USD (mínimo por paquete < 3 lb)
      estimatedWeight = 3.5, // lbs
      exchangeRate = 84.80,
      modelName = "deepseek-ai/deepseek-v4-flash-0731",
      temperature = 0.3,
    } = req.body;

    if (!url && !title && !description) {
      return res.status(400).json({ error: "Proporciona una URL o descripción del anuncio." });
    }

    // Auto-scrape if URL is provided and title/description are brief or default
    let scrapedInfoSnippet = "";
    // Skip scraping if frontend already provided title + description
    // (prevents 60s Vercel timeout from Puppeteer)
    const hasFullDataFromFrontend = title && title.length > 5 && description && description.length > 20;
    if (!hasFullDataFromFrontend && url && typeof url === "string" && url.startsWith("http")) {
      try {
        const liveScraped = await scrapeEcommerceUrl(url);
        if (liveScraped.scrapedSuccessfully) {
          if (!title || title.length < 5) title = liveScraped.title;
          if (!description || description.length < 10) description = liveScraped.description;
          if ((!listedPrice || Number(listedPrice) === 0) && liveScraped.listedPrice > 0) {
            listedPrice = liveScraped.listedPrice;
          }
          if (liveScraped.condition) declaredCondition = liveScraped.condition;
          if (liveScraped.platform) platform = liveScraped.platform;

          scrapedInfoSnippet = `\nDATOS EXTRAÍDOS EN VIVO DE LA PÁGINA (${liveScraped.platform}):
- Título Real: ${liveScraped.title}
- Precio Real en Anuncio: $${liveScraped.listedPrice} ${liveScraped.currency}
- Condición Detectada: ${liveScraped.condition}
- Vendedor: ${liveScraped.seller || "N/A"}
- Imagen del Producto: ${liveScraped.imageUrl || "N/A"}
- Especificaciones Técnicas Encontradas: ${JSON.stringify(liveScraped.specs || {})}
- Descripción / Texto de la Publicación: ${liveScraped.description}`;
        }
      } catch (scrapeErr) {
        console.warn("Auto-scrape fallback error:", scrapeErr);
      }
    } else if (hasFullDataFromFrontend) {
      console.log("[FlipMaster] Skipping auto-scrape — frontend already provided title + description.");
    }

    // Gemini client LAZY: solo se crea si caemos al fallback de Gemini.
    // Si GEMINI_API_KEY no está configurada pero el usuario usa NVIDIA NIM,
    // el análisis con DeepSeek NO debe fallar por un error de Gemini.
    let ai: any = null;

    const systemInstruction = `Eres FlipMaster: experto en flipping de artículos usados/defectuosos para reventa en Venezuela vía casillero Miami.

REGLAS CLAVE:
- Evalúa COSTO TOTAL: puja + envío US + courier VE ($3.10/lb, min $25, + combustible $0.75/lb + gastos op $0.75/lb + gestión $1 + seguro 5% FOB + IVA 16%) + reparación.
- 'Untested' = roto. No infieras que funciona.
- Smartphones: si no dice textualmente 'Unlocked'/'Factory Unlocked' → NO VALE LA PENA.
- iPhones: si no dice textualmente 'iCloud unlocked'/'Find My off' → NO VALE LA PENA.
- ROI mínimo: 30%. Costo total ≤ 50-60% del precio de reventa.
- Usa tasa dólar: $1 USD = ${exchangeRate} VES.

Responde SOLO con JSON válido (sin markdown, sin texto extra) con esta estructura:
{"productIdentification":{"brand","model","variant","specs","declaredCondition","declaredDefects":[],"missingAccessories":[],"riskLevel":"Bajo|Medio|Alto|Crítico","riskSignals":[]},"restorationCost":{"defectsBreakdown":[{"item","estimatedPartCostUSD":0,"difficulty":"Fácil|Media|Difícil|Profesional","requiresSpecialist":false}],"optimisticCostUSD":0,"pessimisticCostUSD":0,"recommendedBudgetUSD":0},"shippingToVenezuela":{"estimatedWeightLbs":0,"internalUSFreightUSD":0,"internationalCourierUSD":0,"customsAndInsuranceUSD":0,"totalLandedShippingUSD":0,"courierNotes":""},"flipMath":{"basePriceUSD":0,"totalShippingUSD":0,"restorationPessimisticUSD":0,"totalLandedCostUSD":0,"estimatedMarketPriceVzlaUSD":0,"estimatedMarketPriceVzlaVES":0,"netProfitUSD":0,"roiPercent":0,"meetsFlipRule":false,"ruleExplanation":""},"auctionStrategy":{"isAuction":false,"maxAbsoluteBidUSD":0,"suggestedTactic":"","edgeNotes":""},"finalVerdict":{"decision":"VALE LA PENA TRAERLO|NO VALE LA PENA|DEPENDE","summaryExplanation":"","pendingQuestionsForSeller":[]},"markdownReport":"Resumen completo en Markdown español con números concretos"}
`;

    const userPrompt = `
Por favor analiza el siguiente producto para FlipTrack:
- URL/Anuncio: ${url || "Sin URL"}
- Título: ${title || "Anuncio sin título explícito"}
- Descripción/Detalles: ${description || "Sin descripción adicional"}
- Precio Declarado / Puja Actual: $${listedPrice || "Desconocido"} USD
- Plataforma: ${platform}
- Condición Declarada: ${declaredCondition}
- Peso estimado: ${estimatedWeight} lbs
${scrapedInfoSnippet}
`;

    // Guard: si el frontend manda una key fake/placeholder, se usa la env var real.
    const nvidiaKey = resolveNvidiaKey(req.body.nvidiaApiKey);

    // Texto REAL del anuncio (título + descripción + datos extraídos en vivo) para
    // el guard determinista de bloqueo de red / iCloud.
    const rawListingText = `${title || ""} ${description || ""} ${scrapedInfoSnippet || ""}`;

    // ── PASO 1: Intentar NVIDIA NIM (DeepSeek) ──────────────────────────────
    let nvidiaSuccess = false;
    if (nvidiaKey) {
      let primaryNvModel = "deepseek-ai/deepseek-v4-flash-0731";
      if (modelName === "deepseek-ai/deepseek-v4-pro-0813") {
        primaryNvModel = "deepseek-ai/deepseek-v4-pro-0813";
      }
      const nvModelsToTry = [primaryNvModel, "meta/llama-3.2-11b-vision-instruct"];

      for (const mToTry of nvModelsToTry) {
        if (Date.now() - handlerStart > DEADLINE_MS - 20000) break;
        try {
          console.log(`[FlipMaster AI] Invocando NVIDIA NIM (${mToTry})...`);
          let nvRes: Response | null = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 18000);
            const nvFetchRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${nvidiaKey.trim()}` },
              body: JSON.stringify({
                model: mToTry,
                messages: [
                  { role: "system", content: systemInstruction },
                  { role: "user", content: userPrompt + "\n\nResponde SOLO con el JSON sin texto extra." },
                ],
                temperature: Number(temperature) || 0.2,
                max_tokens: 2048,
              }),
              signal: controller.signal,
            }).finally(() => clearTimeout(timer));
            if (nvFetchRes.status === 529 && attempt < 1) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            nvRes = nvFetchRes;
            break;
          }
          if (nvRes && nvRes.ok) {
            const nvJson = await nvRes.json();
            const nvRawText = nvJson.choices?.[0]?.message?.content || nvJson.choices?.[0]?.message?.reasoning_content || "";
            if (nvRawText) {
              const clean = nvRawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
              const parsed = extractJsonFromText(clean) || extractJsonFromText(nvRawText);
              if (parsed && (parsed.productIdentification || parsed.flipMath)) {
                enforceLockGuard(parsed, rawListingText, title);
                return res.json({ success: true, data: parsed, provider: "NVIDIA NIM (DeepSeek)" });
              }
            }
          }
        } catch (nvErr: any) {
          console.warn(`[NVIDIA NIM] Error:`, nvErr.message || nvErr);
        }
      }
      console.warn("[FlipMaster AI] NVIDIA no devolvió respuesta válida. Intentando Gemini como fallback...");
    }

    // ── PASO 2: Gemini como fallback (si NVIDIA falló o no está configurado) ──
    if (!nvidiaSuccess && process.env.GEMINI_API_KEY) {
      const geminiModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite"].filter((m, i, a) => a.indexOf(m) === i);
      let response: any = null;
      let lastError: any = null;

      for (const mName of geminiModels) {
        if (Date.now() - handlerStart > DEADLINE_MS - 15000) break;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (!ai) ai = getGeminiClient();
            response = await ai.models.generateContent({
              model: mName,
              contents: userPrompt,
              config: { systemInstruction, temperature: Number(temperature) || 0.3, responseMimeType: "application/json" },
            });
            if (response && response.text) break;
          } catch (mErr: any) {
            lastError = mErr;
            const errStr = String(mErr.message || mErr);
            console.warn(`[Gemini] ${mName} attempt ${attempt + 1} error: ${errStr.slice(0, 100)}`);
            if (errStr.includes("503") || errStr.includes("429")) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            } else break;
          }
        }
        if (response && response.text) break;
      }

      if (response && response.text) {
        const rawText = response.text || "{}";
        let parsedData;
        try { parsedData = JSON.parse(rawText); } catch {
          parsedData = { rawOutput: rawText, finalVerdict: { decision: "DEPENDE", summaryExplanation: "Respuesta no estructurada de Gemini." } };
        }
        enforceLockGuard(parsedData, rawListingText, title);
        return res.json({ success: true, data: parsedData, provider: "Gemini (fallback)" });
      }
    }

    // ── PASO 3: Ambos fallaron ──────────────────────────────────────────────
    if (!nvidiaKey && !process.env.GEMINI_API_KEY) {
      return res.status(400).json({ success: false, error: "No hay API key configurada. Configura NVIDIA (nvapi-...) o Gemini en Ajustes." });
    }
    throw new Error("Ambos proveedores de IA fallaron. NVIDIA puede estar sobrecargado. Espera 30s e intenta de nuevo.");
  } catch (error: any) {
    console.error("FlipMaster API Error:", error);
    const errStr = String(error.message || error);
    const is503 = errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand");
    const is429 = errStr.includes("429") || errStr.includes("quota") || errStr.includes("Quota");
    const is529 = errStr.includes("529") || errStr.includes("overloaded") || errStr.includes("Service temporarily overloaded");

    let userMessage = error.message || "Error al procesar el análisis con FlipMaster AI.";
    if (is503) {
      userMessage = "El proveedor de IA (DeepSeek/NVIDIA) está experimentando alta demanda temporal (Error 503). Por favor intenta de nuevo en unos segundos.";
    } else if (is429) {
      userMessage = "Se ha alcanzado el límite de tasa/cuota del proveedor de IA (Error 429). Espera unos segundos e intenta nuevamente.";
    } else if (is529) {
      userMessage = "NVIDIA NIM está temporalmente sobrecargado (Error 529). Se reintentó automáticamente; espera unos segundos e intenta de nuevo.";
    }

    return res.status(is503 ? 503 : is429 ? 429 : is529 ? 529 : 500).json({
      success: false,
      error: userMessage,
    });
  }
});

// ── Global Error Handler (siempre devuelve JSON) ────────────────────────────
// Express requires exactly 4 parameters to identify an error handler.
// Without this, unhandled errors return plain text like "An error occurred..."
// which breaks the frontend JSON.parse().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[FlipMaster Global Error Handler]", err);
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Error interno del servidor.";
  if (!res.headersSent) {
    res.status(status).json({ success: false, error: message });
  }
});

// ── 404 catch-all (devuelve JSON, no HTML) ─────────────────────────────────
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ success: false, error: "Endpoint no encontrado." });
});
