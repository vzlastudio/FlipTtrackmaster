// src/lib/proxy.ts
// Proxy e-Commerce Web Scraper & URL Validator

export interface ScrapedDataResponse {
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
  cleanHtmlSnippet?: string;
  error?: string;
}

/**
 * Cleans query parameters and tracking hash fragments from eBay product URLs.
 * Example: 'https://www.ebay.com/itm/277461869938?mkevt=1' -> 'https://www.ebay.com/itm/277461869938'
 */
export function cleanEbayUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  const qIdx = clean.indexOf("?");
  if (qIdx !== -1) clean = clean.substring(0, qIdx);
  const hIdx = clean.indexOf("#");
  if (hIdx !== -1) clean = clean.substring(0, hIdx);
  return clean;
}

/**
 * Supported platforms for product scraping
 */
export type SupportedPlatform = 'ebay' | 'shopgoodwill' | 'swappa' | 'mercadolibre' | 'amazon' | 'other';

/**
 * Detects which platform a URL belongs to.
 */
export function detectPlatform(url: string): SupportedPlatform {
  if (!url || typeof url !== 'string') return 'other';
  const lower = url.toLowerCase();
  if (lower.includes('ebay.')) return 'ebay';
  if (lower.includes('shopgoodwill.com')) return 'shopgoodwill';
  if (lower.includes('swappa.com')) return 'swappa';
  if (lower.includes('mercadolibre.')) return 'mercadolibre';
  if (lower.includes('amazon.')) return 'amazon';
  return 'other';
}

/**
 * Validates whether a URL is a valid product listing URL for any supported platform.
 * Supports: eBay, ShopGoodwill, Swappa, MercadoLibre, Amazon.
 */
export function isValidProductUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  let clean = url.trim().toLowerCase();
  const qIdx = clean.indexOf('?');
  if (qIdx !== -1) clean = clean.substring(0, qIdx);

  // Must be HTTP/HTTPS
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;

  const platform = detectPlatform(url);

  switch (platform) {
    case 'ebay':
      return clean.includes('/itm/') || clean.includes('/p/') || clean.includes('item=') || /\/itm\/(?:[^\/]+\/)?\d+/.test(clean) || /\b\d{9,13}\b/.test(clean);
    case 'shopgoodwill':
      return clean.includes('/item/') && /\/item\/\d+/.test(clean);
    case 'swappa':
      return clean.includes('/listing/') || clean.includes('/buy/');
    case 'mercadolibre':
      return clean.includes('MLV') || clean.includes('MLA') || clean.includes('/p/') || clean.includes('/itm/');
    case 'amazon':
      return clean.includes('/dp/') || clean.includes('/gp/') || clean.includes('/product/');
    default:
      // Any URL with a product-like path
      return /\/\w+\/\d+/.test(clean);
  }
}

/**
 * @deprecated Use isValidProductUrl instead
 */
export function isValidEbayProductUrl(url: string): boolean {
  return isValidProductUrl(url);
}

/**
 * Intermediate backend proxy call to safely scrape eBay product listing content
 * via the server endpoint without client CORS or eBay blocking issues.
 */
export async function scrapeEbayProductProxy(url: string): Promise<ScrapedDataResponse> {
  // 1. Client-side URL Validation
  if (!isValidEbayProductUrl(url)) {
    throw new Error(
      "La URL proporcionada no es una página de producto válida de eBay. Asegúrate de ingresar un enlace directo de eBay que contenga '/itm/' y el ID del artículo."
    );
  }

  // 2. Call secure API proxy backend
  const response = await fetch("/api/scrape-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Error en el servidor proxy (${response.status}). No se pudo obtener el producto de eBay.`
    );
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "No se recibieron datos del proxy de scraping de eBay.");
  }

  return json.data as ScrapedDataResponse;
}

/**
 * Validates whether an AI analysis response contains all mandatory FlipMasterAnalysis fields.
 */
export function validateFlipMasterAnalysisResponse(data: any): boolean {
  if (!data || typeof data !== "object") return false;

  const hasVerdict = data.finalVerdict && typeof data.finalVerdict.decision === "string" && data.finalVerdict.decision.length > 0;
  const hasFlipMath = data.flipMath && typeof data.flipMath.totalLandedCostUSD === "number";
  const hasIdentification = data.productIdentification && typeof data.productIdentification.model === "string";
  const hasRestoration = data.restorationCost && typeof data.restorationCost.pessimisticCostUSD === "number";
  const hasShipping = data.shippingToVenezuela && typeof data.shippingToVenezuela.totalLandedShippingUSD === "number";
  const hasAuction = data.auctionStrategy && typeof data.auctionStrategy.maxAbsoluteBidUSD === "number";

  return Boolean(hasVerdict && hasFlipMath && hasIdentification && hasRestoration && hasShipping && hasAuction);
}
