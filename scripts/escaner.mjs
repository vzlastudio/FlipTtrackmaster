#!/usr/bin/env node
/**
 * FlipTrack — Escáner Automático de Tiendas eBay (standalone)
 * ===========================================================
 * Lee las tiendas de scripts/tiendas.json, escanea cada una con Firecrawl
 * (esquiva CAPTCHA de eBay), analiza los candidatos con NVIDIA NIM (DeepSeek)
 * y envía un resumen por Telegram.
 *
 * USO:
 *   node scripts/escaner.mjs                          # escaneo completo
 *   node scripts/escaner.mjs --dry-run                # solo scrape (sin IA ni Telegram)
 *   node scripts/escaner.mjs --tiendas mi.json        # otro archivo de tiendas
 *   node scripts/escaner.mjs --max-items 5            # máx items por tienda (default 10)
 *   node scripts/escaner.mjs --no-telegram            # sin notificación
 *
 * VARIABLES DE ENTORNO (.env o export):
 *   FIRECRAWL_API_KEY     (obligatoria — para el scrape)
 *   NVIDIA_API_KEY        (obligatoria — para el análisis con DeepSeek)
 *   TELEGRAM_BOT_TOKEN    (opcional — alertas)
 *   TELEGRAM_CHAT_ID      (opcional — alertas)
 *   TIENDAS_JSON          (opcional — ruta al JSON de tiendas)
 *
 * AUTOMATIZACIÓN: ver README.md (HERMES local con cron, Vercel Cron,
 * GitHub Actions schedule). Exit code 0 = OK, 1 = error.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ── Mini dotenv (sin dependencias: script 100% standalone) ─────────────────
function cargarEnv(ruta = path.join(process.cwd(), ".env")) {
  try {
    const txt = readFileSync(ruta, "utf8");
    for (const linea of txt.split("\n")) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

// ── Args ───────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    dryRun: args.includes("--dry-run"),
    noTelegram: args.includes("--no-telegram"),
    maxItems: parseInt(get("--max-items") || process.env.MAX_ITEMS || "10", 10),
    tiendasPath: get("--tiendas") || process.env.TIENDAS_JSON,
  };
}

// ── Utilidades ─────────────────────────────────────────────────────────────
function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.substring(first, last + 1));
    } catch {}
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

// ── 1) Scrape de tienda con Firecrawl ──────────────────────────────────────
async function scrapeTienda(tienda) {
  const apiKey = process.env.FIRECRAWL_API_KEY || "";
  if (!apiKey) throw new Error("Falta FIRECRAWL_API_KEY en el entorno.");
  console.log(`\n📡 Escaneando: ${tienda.nombre} (${tienda.url})`);

  const { ok, status, json } = await fetchJson("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      url: tienda.url,
      formats: ["markdown", "links"],
      waitFor: 5000,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!ok) throw new Error(`Firecrawl HTTP ${status} para ${tienda.nombre}`);

  // Solo parseamos el markdown: contiene título + precio + condición + pujas por
  // item. El array "links" de Firecrawl NO se usa para construir items porque
  // no trae precio (y marcar seen con ellos haría que el parser de markdown
  // saltara los items con precio real).
  const md = json?.data?.markdown || "";
  const lines = md.split("\n");
  const items = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (items.length >= 60) break;
    // Línea de título con enlace real a un listing: [titulo](https://www.ebay.com/itm/123456...)
    const m = lines[i].match(/\[([^\]]{8,160})\]\s*\((https?:\/\/[^)]*\/itm\/\d+[^)]*)\)/);
    if (!m) continue;
    let titulo = m[1].replace(/Opens in a new window or tab$/i, "").trim();
    // Evitar placeholders patrocinados sin datos reales
    if (/^Shop on eBay$/i.test(titulo)) continue;
    const enlace = m[2].split("?")[0];
    if (seen.has(enlace)) continue;
    seen.add(enlace);

    // Buscar precio / condición / pujas en las líneas siguientes al título
    let precio = 0, condicion = "", bids = 0;
    for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
      const pm = lines[j].match(/\$\s?([\d,]+(?:\.\d{2})?)/);
      if (pm && precio === 0) precio = parseFloat(pm[1].replace(/,/g, ""));
      const cm = lines[j].match(/(For parts|Parts Only|Untested|Pre-Owned|Open box|Refurbished|AS-IS|Nuevo|Usado|Defectuoso)/i);
      if (cm && !condicion) condicion = cm[0];
      const bm = lines[j].match(/(\d+)\s*(?:bids|pujas|ofertas)/i);
      if (bm && bids === 0) bids = parseInt(bm[1], 10);
      if (precio > 0 && condicion && bids > 0) break;
    }
    // Solo items con precio conocido (sin precio no se puede evaluar el flip)
    if (precio > 0) {
      items.push({ titulo, precio, enlace, bids: bids || undefined, condicion: condicion || undefined });
    }
  }

  console.log(`   → ${items.length} items encontrados`);
  return items;
}

// Fallback: si el markdown no produjo items (eBay cambió el layout), reintenta
// con la URL de búsqueda /sch/m.html?_ssn= y notifica para no fallar en silencio.
async function scrapeTiendaConFallback(tienda) {
  const items = await scrapeTienda(tienda);
  if (items.length === 0 && !/\/sch\//.test(tienda.url)) {
    const altUrl = `https://www.ebay.com/sch/m.html?_ssn=${encodeURIComponent((tienda.url.match(/\/str\/([^/]+)/) || [])[1] || tienda.nombre)}&_sop=1`;
    console.log(`   ↻ Fallback: reescaneando como búsqueda de vendedor → ${altUrl}`);
    return scrapeTienda({ ...tienda, url: altUrl });
  }
  return items;
}

// ── 2) Análisis con NVIDIA NIM (DeepSeek) ──────────────────────────────────
const SYSTEM_PROMPT = `Actúa como "FlipMaster", experto en flipping de electrónica usada/defectuosa para reventa en Venezuela vía casillero Miami (Liberty Express $3.10/lb, mínimo $25, +combustible $0.75/lb +G.Op $0.75/lb +gestión aduanal $1 +seguro 5% FOB +IVA 16%). "Untested" = roto. Evalúa el COSTO TOTAL (puja + envío + repuestos + riesgo). Reventa local estimada con base en tu conocimiento del mercado venezolano.

REGLA ESTRICTA DE COMPATIBILIDAD DE RED (SMARTPHONES): si el título/descripción no afirma TEXTUALMENTE "Factory Unlocked", "Network Unlocked" o "Unlocked" (o equivalente en español: desbloqueado de fábrica, liberado, sin bloqueo), o menciona bloqueo de operadora/carrier lock, la decisión DEBE ser EXACTAMENTE "NO VALE LA PENA". No infieras desbloqueo si no está escrito.

REGLA ESTRICTA DE iCLOUD / FIND MY (IPHONES): si el título/descripción no afirma TEXTUALMENTE "iCloud unlocked", "iCloud cleared/off", "Find My off/disabled", "activation unlocked" (o equivalente en español: desbloqueado de iCloud, Find My apagado), o menciona iCloud lock/activation lock/"locked to Apple ID"/Find My on, la decisión DEBE ser EXACTAMENTE "NO VALE LA PENA". No infieras que está libre de iCloud si no está escrito.

Responde ÚNICAMENTE con JSON válido:
{"decision":"VALE LA PENA TRAERLO|NO VALE LA PENA|DEPENDE","roiPercent":number,"netProfitUSD":number,"maxAbsoluteBidUSD":number,"estimatedMarketPriceVzlaUSD":number,"restorationPessimisticUSD":number,"summaryExplanation":"string corta","pendingQuestionsForSeller":["q1","q2"]}`;

// ── Refuerzo determinista: bloqueo de red / iCloud (independiente de la IA) ──
const RE_PHONE = /\b(iphone|galaxy\s+(?:s|z|a|note|j|m|f)\s?\d*|pixel\s+\d*|smartphone|celular|telefono|tel[eé]fono|xiaomi|huawei|oneplus|motorola|moto\s+g|moto\s+e)\b/i;
const RE_NET_LOCK = /\blocked\s+(to|by)\b|\bcarrier\s*lock(?:ed)?\b|\bsim\s*lock(?:ed)?\b|\bnetwork\s*lock(?:ed)?\b|\blocked\s+(?:to\s+)?(?:at&?t|verizon|t-mobile|t\s*mobile|sprint|att|tmobile|cricket|metro|boost|vzw)\b|\b(?:at&?t|verizon|t-mobile|t\s*mobile|sprint)\s+locked\b|\bsolo\s+funciona\s+con\b|\bonly\s+works\s+with\b|\bbloquead[oa]\s+(a|por)\b|\bbloqueo\s+de\s+(red|operadora|compa[nñ]ia)\b/i;
const RE_NET_UNLOCK = /\bunlocked\b|\bfactory\s+unlocked\b|\bnetwork\s+unlocked\b|\bdesbloquead[oa]\b|\blibera(?:do|da)\b|\bsin\s+bloqueo\b/i;
const RE_ICLOUD_LOCK = /\bicloud\s*lock(?:ed)?\b|\bactivation\s*lock(?:ed)?\b|\bfind\s+my\s+(?:is\s+)?(?:on|activo|activado|active)\b|\blocked\s+to\s+(?:an?\s+)?apple\b|\bapple\s*id\s+lock(?:ed)?\b|\bbloquead[oa]\s+por\s+icloud\b/i;
const RE_ICLOUD_UNLOCK = /\bicloud\s*unlock(?:ed)?\b|\bicloud\s*(?:cleared|off|disabled|free|removed)\b|\bfind\s+my\s+(?:is\s+)?(?:off|disabled|apagad[oa]|desactivad[oa])\b|\bactivation\s*unlock(?:ed)?\b|\bdesbloquead[oa]\s+de\s+icloud\b|\bsin\s+bloqueo\s+de\s+activaci[oó]n\b/i;

function enforceLockGuard(parsed, titulo) {
  if (!parsed || typeof parsed !== "object") return false;
  const t = String(titulo || "").toLowerCase();
  if (!t || !RE_PHONE.test(t)) return false;

  const reasons = [];
  const isIphone = /\biphone\b/i.test(t);
  if (RE_NET_LOCK.test(t)) {
    reasons.push("bloqueado a operadora/red específica");
  } else if (!RE_NET_UNLOCK.test(t)) {
    reasons.push("no afirma textualmente 'Unlocked'/'Factory Unlocked'");
  }
  if (isIphone) {
    if (RE_ICLOUD_LOCK.test(t)) {
      reasons.push("iCloud/Find My bloqueado (activation lock)");
    } else if (!RE_ICLOUD_UNLOCK.test(t)) {
      reasons.push("no afirma textualmente 'iCloud unlocked'/'Find My off'");
    }
  }
  if (reasons.length === 0) return false;
  parsed.decision = "NO VALE LA PENA";
  parsed.summaryExplanation = `[GUARD DETERMINISTA] ${reasons.join("; ")}. ${parsed.summaryExplanation || ""}`.trim();
  console.warn(`     ⛔ GUARD DETERMINISTA: ${reasons.join("; ")} — ${String(titulo || "").slice(0, 60)}`);
  return true;
}

async function analizarItem(item) {
  const apiKey = process.env.NVIDIA_API_KEY || "";
  if (!apiKey) throw new Error("Falta NVIDIA_API_KEY en el entorno.");

  const userPrompt = `Analiza para flip: "${item.titulo}" — Precio $${item.precio} USD${item.bids ? ` · ${item.bids} pujas` : ""}${item.condicion ? ` · Condición: ${item.condicion}` : ""}. Enlace: ${item.enlace || ""}`;

  const { ok, status, json } = await fetchJson("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-ai/deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!ok) {
    console.warn(`     ⚠ NVIDIA HTTP ${status} — se omite item`);
    return null;
  }

  const raw = json?.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const parsed = extractJson(clean) || extractJson(raw);
  if (!parsed) return null;
  enforceLockGuard(parsed, item.titulo);
  return parsed;
}

// ── 3) Telegram ────────────────────────────────────────────────────────────
async function notificarTelegram(texto) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("ℹ Telegram no configurado (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) — se omite.");
    return false;
  }
  const { ok } = await fetchJson(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML" }),
    signal: AbortSignal.timeout(15000),
  });
  return ok;
}

// ── Motor principal ────────────────────────────────────────────────────────
export async function escanearTodas(opts = {}) {
  const {
    dryRun = false,
    noTelegram = false,
    maxItems = 10,
    tiendasPath = null,
    tiendas: tiendasInline = null,
    onLog = console.log,
  } = opts;

  cargarEnv();
  let tiendas;
  if (Array.isArray(tiendasInline)) {
    tiendas = tiendasInline;
  } else {
    const rutaTiendas = tiendasPath || path.join(process.cwd(), "scripts", "tiendas.json");
    tiendas = JSON.parse(readFileSync(rutaTiendas, "utf8"));
  }
  tiendas = tiendas.filter((t) => t.activa !== false);

  const reporte = {
    fecha: new Date().toISOString(),
    tiendas: 0,
    itemsVistos: 0,
    itemsAnalizados: 0,
    oportunidades: [],
    errores: [],
  };

  for (const tienda of tiendas) {
    try {
      reporte.tiendas++;
      const items = await scrapeTiendaConFallback(tienda);
      if (items.length === 0) {
        reporte.errores.push(`${tienda.nombre}: 0 items extraídos (eBay cambió el layout o la tienda no tiene listados parseables)`);
      }
      const candidatos = items.filter((i) => i.precio > 0 && i.precio <= tienda.precioMaximoUSD).slice(0, maxItems);
      reporte.itemsVistos += items.length;
      onLog(`   → ${candidatos.length} candidatos bajo $${tienda.precioMaximoUSD} (analizando...)\n`);

      if (dryRun) {
        reporte.itemsAnalizados += candidatos.length;
        continue;
      }

      for (let k = 0; k < candidatos.length; k++) {
        const item = candidatos[k];
        reporte.itemsAnalizados++;
        onLog(`   🧠 [${k + 1}/${candidatos.length}] ${item.titulo.slice(0, 60)}...`);
        try {
          const r = await analizarItem(item);
          if (r && r.decision === "VALE LA PENA TRAERLO") {
            reporte.oportunidades.push({
              tienda: tienda.nombre,
              tier: tienda.tier,
              titulo: item.titulo,
              precio: item.precio,
              enlace: item.enlace || "",
              roi: r.roiPercent || 0,
              ganancia: r.netProfitUSD || 0,
              pujaMax: r.maxAbsoluteBidUSD || 0,
              reventaVzla: r.estimatedMarketPriceVzlaUSD || 0,
              resumen: r.summaryExplanation || "",
              preguntas: Array.isArray(r.pendingQuestionsForSeller) ? r.pendingQuestionsForSeller : [],
            });
            onLog(`      ✅ ROI ${(r.roiPercent || 0).toFixed(1)}% — ganancia $${(r.netProfitUSD || 0).toFixed(2)}`);
          }
        } catch (e) {
          onLog(`      ⚠ error: ${e?.message || e}`);
        }
        await sleep(400); // cortesía anti-rate-limit
      }
    } catch (e) {
      reporte.errores.push(`${tienda.nombre}: ${e?.message || e}`);
      onLog(`   ❌ ${tienda.nombre}: ${e?.message || e}`);
    }
  }

  // Resumen
  const top = [...reporte.oportunidades].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const textoResumen =
    `<b>🤖 FlipTrack — Escaneo Automático</b>\n` +
    `🛍 ${reporte.tiendas} tiendas · ${reporte.itemsVistos} items vistos · ${reporte.itemsAnalizados} analizados\n` +
    `🎯 <b>${reporte.oportunidades.length} oportunidad(es)</b>\n` +
    (top.length
      ? top
          .map(
            (o, i) =>
              `${i + 1}) <b>ROI ${o.roi.toFixed(1)}%</b> · +$${o.ganancia.toFixed(2)} · <a href="${o.enlace}">${o.titulo.slice(0, 45)}</a> (${o.tienda})`
          )
          .join("\n")
      : "Sin oportunidades que superen el umbral de ROI.")
    + (reporte.errores.length ? `\n\n⚠️ Errores:\n${reporte.errores.map((e) => `• ${e}`).join("\n")}` : "");

  if (dryRun) {
    onLog("\n── DRY RUN ── (solo scrape, sin IA ni Telegram)");
    onLog(textoResumen.replace(/<[^>]+>/g, ""));
  } else {
    onLog("\n── RESUMEN ──");
    onLog(textoResumen.replace(/<[^>]+>/g, ""));
    if (!noTelegram) await notificarTelegram(textoResumen);
  }

  // Guardar log local
  try {
    const dir = path.join(process.cwd(), "escaneos");
    if (!existsSync(dir)) mkdirSync(dir);
    const archivo = path.join(dir, `escaneo-${new Date().toISOString().slice(0, 10)}.json`);
    const historial = existsSync(archivo) ? JSON.parse(readFileSync(archivo, "utf8")) : [];
    historial.push(reporte);
    writeFileSync(archivo, JSON.stringify(historial, null, 2));
    onLog(`📁 Log guardado en ${archivo}`);
  } catch {}

  return reporte;
}

// ── Ejecución directa ──────────────────────────────────────────────────────
const esMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esMain) {
  const { dryRun, noTelegram, maxItems, tiendasPath } = parseArgs();
  escanearTodas({ dryRun, noTelegram, maxItems, tiendasPath })
    .then((r) => {
      if (r.errores.length) {
        console.log(`\n⚠️ ${r.errores.length} tienda(s) con error.`);
      }
      process.exit(r.errores.length && r.oportunidades.length === 0 ? 1 : 0);
    })
    .catch((e) => {
      console.error("\n❌ Error fatal:", e?.message || e);
      process.exit(1);
    });
}
