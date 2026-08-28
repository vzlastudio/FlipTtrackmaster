/**
 * Stagehand — Browser Agent SDK para scraping de sitios dinámicos
 * Complemento a Firecrawl: maneja sitios con Cloudflare, CAPTCHA, lazy-loading,
 * y contenido que solo se carga con JavaScript (ShopGoodwill, eBay searches, etc.)
 *
 * Docs: https://www.stagehand.dev/
 * npm: @browserbasehq/stagehand
 */

import { z } from "zod/v4";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface StagehandConfig {
  browserbaseApiKey?: string;
  nvidiaApiKey?: string; // Used as LLM for Stagehand's AI actions
  model?: string; // e.g. "deepseek-ai/deepseek-v4-flash-0731"
}

export interface StagehandProductResult {
  titulo: string;
  precio: number;
  condicion: string;
  n_pujas?: number;
  tiempo_restante?: string;
  vendedor?: string;
  rating_vendedor?: string;
  ventas_vendedor?: number;
  fotos: string[];
  descripcion: string;
  envio?: string;
  url: string;
  plataforma: string;
  defectos_detectados: string[];
}

export interface StagehandStoreResult {
  productos: Array<{
    titulo: string;
    precio: number;
    url: string;
    condicion: string;
    n_pujas?: number;
    tiempo_restante?: string;
  }>;
  total_encontrados: number;
}

// ── Schemas Zod para extracción estructurada ──────────────────────────────────

const ProductSchema = z.object({
  titulo: z.string().describe("Título exacto del producto"),
  precio: z.number().describe("Precio actual en USD"),
  condicion: z.string().describe("Condición: Nuevo, Usado, Para Repuestos, Untested, etc."),
  n_pujas: z.number().optional().describe("Número de pujas (si es subasta)"),
  tiempo_restante: z.string().optional().describe("Tiempo restante en subasta"),
  vendedor: z.string().optional().describe("Nombre del vendedor"),
  rating_vendedor: z.string().optional().describe("Rating del vendedor (ej: 99.2%)"),
  ventas_vendedor: z.number().optional().describe("Número total de ventas del vendedor"),
  fotos: z.array(z.string()).describe("URLs de las fotos del producto"),
  descripcion: z.string().describe("Descripción completa del producto"),
  envio: z.string().optional().describe("Información de envío"),
  defectos_detectados: z.array(z.string()).describe("Defectos, fallas o advertencias mencionadas"),
});

const StoreSchema = z.object({
  productos: z.array(z.object({
    titulo: z.string().describe("Título del producto"),
    precio: z.number().describe("Precio en USD"),
    url: z.string().describe("URL del anuncio"),
    condicion: z.string().describe("Condición del producto"),
    n_pujas: z.number().optional().describe("Número de pujas si es subasta"),
    tiempo_restante: z.string().optional().describe("Tiempo restante si es subasta"),
  })),
  total_encontrados: z.number().describe("Total de productos encontrados en la página"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNvidiaKey(config?: StagehandConfig): string {
  return config?.nvidiaApiKey?.trim() || process.env.NVIDIA_API_KEY || "";
}

function getBrowserbaseKey(config?: StagehandConfig): string {
  return config?.browserbaseApiKey?.trim() || process.env.BROWSERBASE_API_KEY || "";
}

/**
 * Detecta la plataforma desde la URL
 */
function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("ebay.")) return "eBay";
  if (lower.includes("shopgoodwill.")) return "ShopGoodwill";
  if (lower.includes("swappa.")) return "Swappa";
  if (lower.includes("amazon.")) return "Amazon";
  if (lower.includes("mercadolibre.") || lower.includes("ml.")) return "MercadoLibre";
  return "Otro";
}

// ── Stagehand Engine (lazy singleton) ─────────────────────────────────────────

let stagehandInstance: any = null;
let browserInstance: any = null;

async function getStagehand(config?: StagehandConfig) {
  if (stagehandInstance) return stagehandInstance;

  const bbKey = getBrowserbaseKey(config);
  const nvKey = getNvidiaKey(config);

  if (!bbKey) {
    throw new Error(
      "BROWSERBASE_API_KEY no configurada. " +
      "Regístrate gratis en browserbase.com para obtener tu key (100 hrs/mes en tier gratuito). " +
      "Agrécala en Ajustes → APIs o en la env var BROWSERBASE_API_KEY."
    );
  }

  // Dynamic import to avoid issues when Stagehand is not installed
  const { browserbase, Stagehand } = await import("@browserbasehq/stagehand");

  const browser = await browserbase.launch({ apiKey: bbKey });
  const stagehand = await Stagehand.create({
    browser,
    ...(nvKey ? {
      model: {
        modelName: (config?.model || "deepseek-ai/deepseek-v4-flash-0731") as any,
        apiKey: nvKey,
      },
    } : {}),
  });

  stagehandInstance = stagehand;
  browserInstance = browser;
  return stagehand;
}

/**
 * Cierra la sesión de Stagehand (llamar al final de cada batch de scraping)
 */
export async function closeStagehand(): Promise<void> {
  try {
    if (stagehandInstance) await stagehandInstance.close();
    if (browserInstance) await browserInstance.close();
  } catch {}
  stagehandInstance = null;
  browserInstance = null;
}

// ── Scraping de producto individual ───────────────────────────────────────────

/**
 * Usa Stagehand para extraer datos de un anuncio individual (eBay, ShopGoodwill, etc.)
 * Ideal para sitios con Cloudflare, lazy-loading o contenido JS-heavy.
 */
export async function scrapeProductWithStagehand(
  url: string,
  config?: StagehandConfig
): Promise<StagehandProductResult | null> {
  try {
    const sh = await getStagehand(config);
    const page = await browserInstance.context.activePage();
    if (!page) throw new Error("No active page in Stagehand browser");

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Esperar a que el contenido principal cargue
    await page.waitForTimeout(2000);

    const plataforma = detectPlatform(url);

    // Prompt adaptado según la plataforma
    let extractionPrompt = `Extrae TODA la información del producto de esta página web. Sé preciso con los precios (números decimales), la condición exacta, y cualquier defecto, falla o advertencia mencionada por el vendedor. Incluye el nombre del vendedor y su rating si está visible.`;

    if (plataforma === "ShopGoodwill") {
      extractionPrompt = `Esta es una subasta de ShopGoodwill. Extrae: título exacto, precio actual/mejor oferta, número de pujas, tiempo restante, condición declarada, descripción completa, especificaciones, número de fotos, costo de envío, tienda de origen (Goodwill de qué ciudad), y CUALQUIER advertencia (untested, for parts, no enciende, etc). Si hay fotos, incluye sus URLs.`;
    } else if (plataforma === "eBay") {
      extractionPrompt = `Esta es una publicación de eBay. Extrae: título exacto, precio actual (Buy It Now o puja), número de pujas si es subasta, tiempo restante, condición declarada, descripción completa del producto, especificaciones técnicas, fotos (URLs), información de envío, nombre del vendedor, rating del vendedor, número de ventas, y CUALQUIER defecto, falla o advertencia mencionada (untested, for parts, cracked, damaged, etc).`;
    }

    const result = await sh.extract(extractionPrompt, ProductSchema);

    if (!result?.data) return null;

    const data = result.data;
    return {
      titulo: data.titulo || "",
      precio: data.precio || 0,
      condicion: data.condicion || "Usado",
      n_pujas: data.n_pujas,
      tiempo_restante: data.tiempo_restante,
      vendedor: data.vendedor,
      rating_vendedor: data.rating_vendedor,
      ventas_vendedor: data.ventas_vendedor,
      fotos: data.fotos || [],
      descripcion: data.descripcion || "",
      envio: data.envio,
      url,
      plataforma,
      defectos_detectados: data.defectos_detectados || [],
    };
  } catch (err: any) {
    console.warn(`[Stagehand] Error scraping ${url}:`, err?.message || err);
    return null;
  }
}

// ── Scraping de tienda / listados ─────────────────────────────────────────────

/**
 * Usa Stagehand para escanear una tienda o búsqueda de eBay/ShopGoodwill.
 * Navega la página, hace scroll si es necesario, y extrae todos los productos visibles.
 */
export async function scrapeStoreWithStagehand(
  storeUrl: string,
  config?: StagehandConfig,
  maxItems = 40
): Promise<StagehandStoreResult> {
  try {
    const sh = await getStagehand(config);
    const page = await browserInstance.context.activePage();
    if (!page) throw new Error("No active page in Stagehand browser");

    await page.goto(storeUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(3000);

    const plataforma = detectPlatform(storeUrl);

    let storePrompt = `Extrae TODOS los productos visibles en esta página. Para cada uno: título, precio en USD, URL del anuncio, condición, número de pujas si aplica, tiempo restante si es subasta.`;

    if (plataforma === "ShopGoodwill") {
      storePrompt = `Esta es una página de resultados de ShopGoodwill. Extrae TODOS los artículos listados. Para cada uno: título, precio actual/startsWith en USD, URL del anuncio, condición declarada, número de pujas si aplica, tiempo restante si la subasta está activa.`;
    }

    // Hacer scroll para cargar más items si es necesario
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const result = await sh.extract(storePrompt, StoreSchema);

    if (!result?.data?.productos) {
      return { productos: [], total_encontrados: 0 };
    }

    // Limitar a maxItems
    const productos = result.data.productos.slice(0, maxItems);

    return {
      productos,
      total_encontrados: result.data.total_encontrados || productos.length,
    };
  } catch (err: any) {
    console.warn(`[Stagehand] Error scraping store ${storeUrl}:`, err?.message || err);
    return { productos: [], total_encontrados: 0 };
  }
}

// ── Batch scraping (múltiples URLs) ──────────────────────────────────────────

/**
 * Scrapa múltiples productos en batch usando Stagehand.
 * Reutiliza la misma sesión del navegador para mayor eficiencia.
 */
export async function scrapeMultipleProductsWithStagehand(
  urls: string[],
  config?: StagehandConfig
): Promise<Map<string, StagehandProductResult | null>> {
  const results = new Map<string, StagehandProductResult | null>();

  try {
    const sh = await getStagehand(config);

    for (const url of urls) {
      const result = await scrapeProductWithStagehand(url, config);
      results.set(url, result);
    }
  } catch (err: any) {
    console.warn("[Stagehand] Batch scrape error:", err?.message || err);
    // Set null for all remaining URLs
    for (const url of urls) {
      if (!results.has(url)) results.set(url, null);
    }
  }

  return results;
}
