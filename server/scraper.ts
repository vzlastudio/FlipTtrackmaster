import * as cheerio from "cheerio";

export interface StoreItemRaw {
  titulo: string;
  precio: number;
  enlace?: string;
  bids?: number;
  tiempoRestante?: string;
  condicion?: string;
}

/**
 * STRATEGY 0: Firecrawl — esquiva CAPTCHA de eBay (tiendas y búsquedas por vendedor).
 * Parsea el markdown devuelto: título **...**, precio $XX.XX, condición, vendedor.
 */
export async function scrapeWithFirecrawl(targetUrl: string): Promise<Partial<ScrapedProductData>> {
  const apiKey = process.env.FIRECRAWL_API_KEY || "";
  if (!apiKey) return {};

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url: targetUrl, formats: ["markdown"], waitFor: 4000 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn(`[Firecrawl] HTTP ${res.status}`);
      return {};
    }

    const json = await res.json();
    const md: string = json?.data?.markdown || "";
    if (!md) return {};

    const result: Partial<ScrapedProductData> = { extractionMethod: "Firecrawl" };

    const boldTitle = md.match(/\*\*(.{10,160}?)\*\*/);
    if (boldTitle) result.title = boldTitle[1].trim();

    const priceMatch = md.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
    if (priceMatch) result.listedPrice = parseFloat(priceMatch[1].replace(/,/g, ""));

    const condMatch = md.match(/(?:Condition|Condición)[:\s]+([^\n|]{3,60})/i);
    if (condMatch) result.condition = condMatch[1].trim();

    const sellerMatch = md.match(/(?:Seller|Vendedor)[:\s]+([^\n|]{2,60})/i);
    if (sellerMatch) result.seller = sellerMatch[1].trim();

    const clean = md.replace(/\*\*/g, "").replace(/#{1,6}\s*/g, "").replace(/\s+/g, " ").trim();
    result.description = clean.slice(0, 1500);

    const imgMatch = md.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
    if (imgMatch) result.imageUrl = imgMatch[1];

    if (result.title) result.estimatedWeight = inferWeightFromTitle(result.title);
    return result;
  } catch (err: any) {
    console.warn("[Firecrawl] scrape failed:", err?.message || err);
    return {};
  }
}

/**
 * Escanea una TIENDA o búsqueda por vendedor de eBay y devuelve items crudos.
 * Requiere FIRECRAWL_API_KEY en el servidor.
 */
export async function scrapeStoreItems(storeUrl: string): Promise<StoreItemRaw[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY || "";
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY no configurada en el servidor. El escaneo de tiendas requiere Firecrawl.");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: storeUrl, formats: ["markdown", "links"], waitFor: 5000, maxUrls: 60 }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Firecrawl store error HTTP ${res.status}`);

  const json = await res.json();
  const md: string = json?.data?.markdown || "";
  const links: string[] = json?.data?.links || [];

  const items: StoreItemRaw[] = [];
  const seen = new Set<string>();

  // 1) Links directos a /itm/ del store (fallback si el markdown no tiene filas con precio)
  for (const l of links) {
    if (items.length >= 40) break;
    if (!/\/itm\/\d+/i.test(l)) continue;
    const base = l.split("?")[0];
    if (seen.has(base)) continue;
    seen.add(base);
    items.push({ titulo: "Artículo eBay", precio: 0, enlace: base });
  }

  // 2) Filas del markdown: [Título](enlace) + precio/bids/condición en líneas cercanas
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (items.length >= 40) break;
    const linkMatch = lines[i].match(/\[([^\]]{8,140})\]\s*\((https?:\/\/[^)]*\/itm\/\d+[^)]*)\)/);
    if (!linkMatch) continue;

    const titulo = linkMatch[1].trim();
    const enlace = linkMatch[2].split("?")[0];
    if (seen.has(enlace)) continue;
    seen.add(enlace);

    let precio = 0;
    let condicion = "";
    let bids = 0;
    let tiempoRestante = "";

    for (let j = i; j < Math.min(i + 6, lines.length); j++) {
      const priceMatch = lines[j].match(/\$\s?([\d,]+(?:\.\d{2})?)/);
      if (priceMatch && precio === 0) precio = parseFloat(priceMatch[1].replace(/,/g, ""));
      const condMatch = lines[j].match(/(For parts|Untested|Used|Open box|Refurbished|Nuevo|Usado|Defectuoso)/i);
      if (condMatch && !condicion) condicion = condMatch[0];
      const bidMatch = lines[j].match(/(\d+)\s*(?:bids|pujas|ofertas)/i);
      if (bidMatch && bids === 0) bids = parseInt(bidMatch[1], 10);
      const timeMatch = lines[j].match(/(\d+[dhms]\s*\d*[dhms]*\s*\d*[dhms]*)/i);
      if (timeMatch && !tiempoRestante) tiempoRestante = timeMatch[1];
    }

    items.push({
      titulo,
      precio,
      enlace,
      bids: bids || undefined,
      condicion: condicion || undefined,
      tiempoRestante: tiempoRestante || undefined,
    });
  }

  return items;
}


export interface ScrapedProductData {
  url: string;
  platform: string;
  title: string;
  listedPrice: number;
  domesticShippingCostUSD?: number;
  currency: string;
  imageUrl: string;
  description: string;
  condition: string;
  seller: string;
  itemId?: string;
  estimatedWeight?: number;
  specs?: Record<string, string>;
  scrapedSuccessfully: boolean;
  extractionMethod?: string;
  error?: string;
}

/**
 * Safely extracts and parses JSON object from model output text.
 */
export function extractJsonFromText(responseText: string): any {
  if (!responseText) return null;

  // Try 1: Direct parse after removing markdown code blocks
  const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue to fallback
  }

  // Try 2: Extract JSON substring between outer braces { ... }
  const firstBrace = responseText.indexOf("{");
  const lastBrace = responseText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = responseText.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch (e) {
      // Ignore
    }
  }

  return null;
}

function cleanUrlPath(rawUrl: string): string {
  if (!rawUrl) return "";
  let u = rawUrl.trim();
  const qIdx = u.indexOf("?");
  if (qIdx !== -1) u = u.substring(0, qIdx);
  const hIdx = u.indexOf("#");
  if (hIdx !== -1) u = u.substring(0, hIdx);
  return u;
}

function parseNumericValue(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const match = String(val).match(/[\d,.]+/);
  if (match) {
    const num = parseFloat(match[0].replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function inferWeightFromTitle(title: string): number {
  const lower = title.toLowerCase();
  if (lower.includes("macbook") || lower.includes("laptop") || lower.includes("notebook") || lower.includes("dell") || lower.includes("thinkpad")) {
    return 3.8;
  }
  if (lower.includes("ps5") || lower.includes("playstation") || lower.includes("xbox") || lower.includes("console")) {
    return 9.5;
  }
  if (lower.includes("steam deck") || lower.includes("rog ally") || lower.includes("switch")) {
    return 3.5;
  }
  if (lower.includes("iphone") || lower.includes("galaxy") || lower.includes("phone") || lower.includes("smartphone")) {
    return 1.2;
  }
  if (lower.includes("headphone") || lower.includes("airpods") || lower.includes("audio")) {
    return 1.5;
  }
  return 3.0;
}

/**
 * Helper to call NVIDIA NIM (DeepSeek) models with retries and fallback models
 */
async function callNvidiaScraperWithFallback(
  nvidiaKey: string,
  prompt: string
): Promise<string> {
  const modelsToTry = ["deepseek-ai/deepseek-v4-flash", "deepseek-ai/deepseek-v4-pro"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${nvidiaKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const j = await res.json();
          const text = j?.choices?.[0]?.message?.content || "";
          if (text) return text;
        } else {
          const body = await res.text();
          console.warn(`[Scraper NVIDIA] Model ${model} HTTP ${res.status}: ${body.slice(0, 120)}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Scraper NVIDIA] Model ${model} attempt ${attempt + 1} error: ${String(err.message || err).slice(0, 150)}`
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  console.warn("[Scraper NVIDIA] All DeepSeek models unavailable. Falling back to HTTP DOM scraper.");
  return "";
}

/**
 * Extracts product details using NVIDIA NIM (DeepSeek) — no requiere GEMINI_API_KEY
 */
export async function scrapeWithNvidiaModel(
  targetUrl: string,
  itemId?: string
): Promise<Partial<ScrapedProductData>> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return {};
  }

  const cleanUrl = cleanUrlPath(targetUrl);

  const prompt = `Actúa como un e-commerce web scraper forense de alta precisión especializado en eBay, Amazon y Swappa.
Extrae la información REAL del anuncio de producto en la siguiente URL de eBay o ID de artículo:
URL de Producto: ${cleanUrl}
${itemId ? `ID de Artículo eBay: ${itemId}` : ""}

Extrae con máxima precisión:
1. "title": Título exacto de la publicación
2. "listedPrice" / "buy_it_now_price": Precio de compra directa o Puja Actual en USD. NÚMERO DECIMAL OBLIGATORIO (ej. 145.00 o 210.00). Si dice $145.00 escribe 145.00.
3. "domesticShippingCostUSD" / "shipping_cost": Costo de envío nacional dentro de EE.UU. hacia Miami en USD (0.00 si indica 'Free Shipping' / Gratis, o número decimal como 12.50).
4. "estimatedWeight" / "item_weight": Peso estimado o declarado del producto en libras (lbs) (ej. 3.8 para laptop MacBook, 9.5 para consola PS5, 3.5 para Steam Deck, 1.2 para iPhone).
5. "condition": Condición exacta ("Usado", "Para Repuestos / Defectuoso", "Nuevo", "Reacondicionado").
6. "seller": Nombre del Vendedor o Tienda.
7. "description": Descripción detallada de fallas o notas del vendedor.
8. "imageUrl": URL de la imagen principal.

DEBES responder ÚNICAMENTE en formato JSON válido con la siguiente estructura exacta:
{
  "title": "string",
  "listedPrice": number,
  "domesticShippingCostUSD": number,
  "estimatedWeight": number,
  "currency": "USD",
  "condition": "string",
  "seller": "string",
  "description": "string",
  "imageUrl": "string",
  "specs": {}
}`;

  try {
    const responseText = await callNvidiaScraperWithFallback(apiKey, prompt);
    const parsed = extractJsonFromText(responseText);

    if (!parsed) {
      console.warn("NVIDIA scraper response could not be parsed as JSON:", responseText.slice(0, 200));
      return {};
    }

    const titleStr = String(parsed.title || parsed.productName || "").trim();
    const rawPrice = parseNumericValue(parsed.listedPrice || parsed.buy_it_now_price || parsed.price || 0);
    const rawShipping = parseNumericValue(parsed.domesticShippingCostUSD || parsed.shipping_cost || parsed.shipping || 0);
    let rawWeight = parseNumericValue(parsed.estimatedWeight || parsed.item_weight || parsed.weight || 0);

    if (rawWeight === 0 && titleStr) {
      rawWeight = inferWeightFromTitle(titleStr);
    }

    return {
      title: titleStr,
      listedPrice: rawPrice,
      domesticShippingCostUSD: rawShipping,
      estimatedWeight: rawWeight || 3.0,
      currency: parsed.currency || "USD",
      condition: parsed.condition || "Usado",
      seller: parsed.seller || "",
      description: parsed.description || "",
      imageUrl: parsed.imageUrl || "",
      specs: parsed.specs || {},
      extractionMethod: "NVIDIA NIM (DeepSeek) Scraper",
    };
  } catch (err: any) {
    console.error("Error in scrapeWithNvidiaModel:", err.message || err);
    return {};
  }
}

export async function scrapeEcommerceUrl(targetUrl: string): Promise<ScrapedProductData> {
  const cleanTargetUrl = cleanUrlPath(targetUrl);

  const result: ScrapedProductData = {
    url: cleanTargetUrl,
    platform: "Otro",
    title: "",
    listedPrice: 0,
    currency: "USD",
    imageUrl: "",
    description: "",
    condition: "Usado",
    seller: "",
    scrapedSuccessfully: false,
    extractionMethod: "HTTP Fetch",
  };

  // Detect platform & Item ID
  const urlLower = cleanTargetUrl.toLowerCase();
  if (urlLower.includes("ebay.")) {
    result.platform = "eBay";
  } else if (urlLower.includes("mercadolibre.")) {
    result.platform = "MercadoLibre";
  } else if (urlLower.includes("swappa.com")) {
    result.platform = "Swappa";
  } else if (urlLower.includes("amazon.")) {
    result.platform = "Amazon";
  }

  const idMatch = cleanTargetUrl.match(/\/itm\/(?:[^\/]+\/)?(\d+)/i) || cleanTargetUrl.match(/(\d{9,13})/);
  if (idMatch) {
    result.itemId = idMatch[1];
  }

  // STRATEGY 0: Firecrawl (esquiva CAPTCHA de eBay)
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const fc = await scrapeWithFirecrawl(cleanTargetUrl);
      if (fc.title || (fc.listedPrice && fc.listedPrice > 0)) {
        if (fc.title) result.title = fc.title;
        if (fc.listedPrice && fc.listedPrice > 0) result.listedPrice = fc.listedPrice;
        if (fc.condition) result.condition = fc.condition;
        if (fc.seller) result.seller = fc.seller;
        if (fc.description) result.description = fc.description;
        if (fc.imageUrl) result.imageUrl = fc.imageUrl;
        if (fc.estimatedWeight) result.estimatedWeight = fc.estimatedWeight;
        result.extractionMethod = "Firecrawl";
      }
    } catch (e) {
      console.warn("Firecrawl strategy failed, continuando con las demás:", e);
    }
  }

  // STRATEGY 1: eBay oEmbed Public API
  if (result.platform === "eBay") {
    try {
      const oembedUrl = `https://www.ebay.com/services/oembed?url=${encodeURIComponent(cleanTargetUrl)}&format=json`;
      const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (oembedRes.ok) {
        const oembedJson = await oembedRes.json();
        if (oembedJson.title) {
          result.title = String(oembedJson.title).trim();
        }
        if (oembedJson.author_name) {
          result.seller = String(oembedJson.author_name).trim();
        }
        if (oembedJson.thumbnail_url) {
          result.imageUrl = String(oembedJson.thumbnail_url).trim();
        }
        result.extractionMethod = "eBay Public oEmbed API";
      }
    } catch (e) {
      console.warn("eBay oEmbed API skipped:", e);
    }
  }

  // STRATEGY 2: Standard Direct HTTP Fetch + Cheerio
  try {
    const response = await fetch(cleanTargetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const text = $(el).html();
          if (!text) return;
          const json = JSON.parse(text);
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            if (item["@type"] === "Product" || item["@type"] === "http://schema.org/Product") {
              if (item.name && !result.title) result.title = String(item.name).trim();
              if (item.image && !result.imageUrl) {
                const img = Array.isArray(item.image) ? item.image[0] : item.image;
                if (typeof img === "string") result.imageUrl = img;
                else if (img?.url) result.imageUrl = img.url;
              }
              if (item.description && !result.description) {
                result.description = String(item.description).replace(/<[^>]*>?/gm, "").trim();
              }
              if (item.offers) {
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (offer) {
                  if (offer.price) {
                    const p = parseFloat(String(offer.price).replace(/[^0-9.]/g, ""));
                    if (!isNaN(p) && p > 0) result.listedPrice = p;
                  }
                  if (offer.priceCurrency) result.currency = offer.priceCurrency;
                  if (offer.itemCondition) {
                    const condStr = String(offer.itemCondition);
                    if (condStr.includes("New")) result.condition = "Nuevo";
                    else if (condStr.includes("Used")) result.condition = "Usado";
                    else if (condStr.includes("Parts") || condStr.includes("Damaged"))
                      result.condition = "Para Repuestos / Defectuoso";
                  }
                }
              }
            }
          }
        } catch (err) {}
      });

      // Price fallback
      if (!result.listedPrice) {
        const priceText = $(".x-price-primary span, .x-bin-price span, #prcIsum, #mm-saleDscPrc").first().text().trim();
        if (priceText) {
          const match = priceText.match(/[\d,.]+/);
          if (match) {
            const cleanPrice = parseFloat(match[0].replace(/,/g, ""));
            if (!isNaN(cleanPrice)) result.listedPrice = cleanPrice;
          }
        }
      }

      // Condition fallback
      if (!result.condition || result.condition === "Usado") {
        const condText = $(".x-item-condition-text .ux-textspans, #vi-itm-cond").first().text().trim();
        if (condText) result.condition = condText;
      }
    }
  } catch (err) {
    console.warn("Direct HTTP fetch blocked or timed out, switching to DeepSeek model extraction...");
  }

  // STRATEGY 3: NVIDIA NIM (DeepSeek) Extraction
  // Run if title or listedPrice are missing or 0
  if (!result.title || result.listedPrice === 0 || !result.description || !result.estimatedWeight) {
    try {
      const nvScraped = await scrapeWithNvidiaModel(cleanTargetUrl, result.itemId);
      if (nvScraped.title) {
        if (!result.title) result.title = nvScraped.title;
        if ((!result.listedPrice || result.listedPrice === 0) && nvScraped.listedPrice) {
          result.listedPrice = nvScraped.listedPrice;
        }
        if (nvScraped.domesticShippingCostUSD !== undefined) {
          result.domesticShippingCostUSD = nvScraped.domesticShippingCostUSD;
        }
        if (nvScraped.estimatedWeight) {
          result.estimatedWeight = nvScraped.estimatedWeight;
        }
        if (!result.description && nvScraped.description) {
          result.description = nvScraped.description;
        }
        if (!result.seller && nvScraped.seller) result.seller = nvScraped.seller;
        if (!result.imageUrl && nvScraped.imageUrl) result.imageUrl = nvScraped.imageUrl;
        if (nvScraped.condition) result.condition = nvScraped.condition;
        if (nvScraped.specs) result.specs = nvScraped.specs;
        result.extractionMethod = "NVIDIA NIM (DeepSeek) Scraper";
      }
    } catch (e) {
      console.error("NVIDIA scraper fallback error:", e);
    }
  }

  // Fallback inferred weight if missing
  if (!result.estimatedWeight && result.title) {
    result.estimatedWeight = inferWeightFromTitle(result.title);
  }

  // Final validation
  if (result.title && result.listedPrice > 0) {
    result.scrapedSuccessfully = true;
  } else if (result.title) {
    result.scrapedSuccessfully = true; // Title extracted
  } else {
    result.error = "No se pudo extraer la información del anuncio. Verifica que la URL sea un enlace activo de eBay o completa los campos manualmente.";
  }

  return result;
}

