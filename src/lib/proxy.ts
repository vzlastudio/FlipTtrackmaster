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
 * Validates whether a URL belongs to eBay and represents a valid product listing page.
 * Valid eBay listing URLs must contain 'ebay.' and a product identifier (such as '/itm/' or item ID numbers).
 */
export function isValidEbayProductUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = cleanEbayUrl(url).toLowerCase();
  
  // Must be an HTTP/HTTPS URL
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return false;
  }

  // Must contain ebay domain (ebay.com, ebay.co.uk, ebay.es, etc.)
  if (!clean.includes("ebay.")) {
    return false;
  }

  // Must be a product listing (contains /itm/, /p/, item= or item number digit sequence of 9-13 digits)
  const isProductPattern = 
    clean.includes("/itm/") ||
    clean.includes("/p/") ||
    clean.includes("item=") ||
    /\/itm\/(?:[^\/]+\/)?\d+/.test(clean) ||
    /\b\d{9,13}\b/.test(clean);

  return isProductPattern;
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
