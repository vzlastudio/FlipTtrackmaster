import React, { useState } from "react";
import { AppSettings, FlipMasterAnalysis, FlipItem } from "../../types";
import {
  isValidProductUrl,
  detectPlatform,
  cleanEbayUrl,
  scrapeEbayProductProxy,
  validateFlipMasterAnalysisResponse,
} from "../../lib/proxy";
import {
  Sparkles,
  Link as LinkIcon,
  Search,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Truck,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Sliders,
  Copy,
  Check,
  Zap,
  FileText,
} from "lucide-react";
import { formatUSD, formatVES, formatPercent } from "../../lib/currency";
import { calcularCourier } from "../../lib/liberty";
import { exportarAnalisisPDF } from "../../lib/pdf";

interface AIAnalyzerModuleProps {
  settings: AppSettings;
  onSaveOpportunity: (analysis: FlipMasterAnalysis, url: string, title: string) => void;
  onConvertToFlip: (analysis: FlipMasterAnalysis, url: string, title: string) => void;
}

const PRESET_EXAMPLES = [
  {
    label: "MacBook Air M1 - Pantalla Rota",
    url: "https://www.ebay.com/itm/385920194821",
    title: "2020 Apple MacBook Air M1 8GB/256GB - Broken Retina LCD Display",
    description: "MacBook Air A2337 enciende, suena tono de arranque y teclado ilumina. La pantalla interna tiene fisura por caída. Incluye caja original sin cargador.",
    price: "210",
    platform: "eBay",
    condition: "Usado - Con Defecto",
    weight: "4.2",
  },
  {
    label: "Steam Deck 512GB - Untested / No Enciende",
    url: "https://www.ebay.com/itm/1958291048",
    title: "Valve Steam Deck 512GB NVMe - Untested / For Parts Only - No Power",
    description: "Recibido en lote de devolución. No tenemos el cargador original de 45W para probarlo. Se vende estrictamente 'For Parts or Repair'. Pantalla sin rayones.",
    price: "145",
    platform: "eBay",
    condition: "Untested / For Parts",
    weight: "3.8",
  },
  {
    label: "PS5 Disc Edition - Sobrecalentamiento",
    url: "https://www.ebay.com/itm/22901839102",
    title: "Sony PlayStation 5 Disc Edition CFI-1115A - Overheating Shut Down",
    description: "La consola enciende perfectamente pero muestra mensaje de 'PS5 está muy caliente' a los 10 minutos de jugar juegos exigentes. Estética 9/10 con control original.",
    price: "180",
    platform: "eBay",
    condition: "Usado - Con Defecto",
    weight: "11.5",
  },
  {
    label: "iPhone 13 Pro 128GB - Batería 72%",
    url: "https://www.swappa.com/listing/iphone-13-pro/bad-battery",
    title: "Apple iPhone 13 Pro 128GB Sierra Blue - Service Battery 72%",
    description: "Swappa Verified. IMEI Limpio, iCloud desvinculado. Muestra aviso de 'Servicio de Batería'. Todo lo demás (FaceID, cámaras, TrueTone) funciona al 100%.",
    price: "290",
    platform: "Swappa",
    condition: "Usado",
    weight: "1.2",
  },
];

export const AIAnalyzerModule: React.FC<AIAnalyzerModuleProps> = ({
  settings,
  onSaveOpportunity,
  onConvertToFlip,
}) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listedPrice, setListedPrice] = useState("210");
  const [platform, setPlatform] = useState("eBay");
  const [declaredCondition, setDeclaredCondition] = useState("Usado / Con Defecto");
  const [estimatedWeight, setEstimatedWeight] = useState("3.5");

  const [loading, setLoading] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FlipMasterAnalysis | null>(null);

  // Interactive Adjustments
  const [adjBasePrice, setAdjBasePrice] = useState<number>(210);
  const [adjWeight, setAdjWeight] = useState<number>(3.5);
  const [adjRestoration, setAdjRestoration] = useState<number>(130);
  const [adjMarketVzla, setAdjMarketVzla] = useState<number>(620);

  const handleSelectPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setUrl(preset.url);
    setTitle(preset.title);
    setDescription(preset.description);
    setListedPrice(preset.price);
    setPlatform(preset.platform);
    setDeclaredCondition(preset.condition);
    setEstimatedWeight(preset.weight);
    setAnalysisResult(null);
    setScrapeStatus(null);
  };

  const handleScrapeUrl = async (customUrl?: string) => {
    const rawTargetUrl = customUrl || url;
    if (!rawTargetUrl || !rawTargetUrl.trim().startsWith("http")) {
      setError("Por favor ingresa una URL válida (ej: https://www.ebay.com/itm/... o https://shopgoodwill.com/item/...)");
      return;
    }

    // Auto-detect platform from URL
    const detectedPlatform = detectPlatform(rawTargetUrl);
    if (detectedPlatform !== 'other') {
      const platformNames: Record<string, string> = {
        ebay: 'eBay', shopgoodwill: 'ShopGoodwill', swappa: 'Swappa',
        mercadolibre: 'MercadoLibre', amazon: 'Amazon'
      };
      setPlatform(platformNames[detectedPlatform] || 'Otro');
    }

    const cleanedUrl = cleanEbayUrl(rawTargetUrl);
    if (cleanedUrl !== url) {
      setUrl(cleanedUrl);
    }

    // Pre-validation for URLs
    if (cleanedUrl && !isValidProductUrl(cleanedUrl)) {
      setError(
        "La URL ingresada no parece ser una página de producto válida. Verifica que sea un enlace directo de eBay, ShopGoodwill, Swappa u otra plataforma."
      );
      setScrapeStatus({
        success: false,
        message: "⚠️ URL no válida. Comprueba que el enlace pertenezca a una publicación directa de producto.",
      });
      return;
    }

    setScrapingUrl(true);
    setScrapeStatus(null);
    setError(null);

    try {
      const d = await scrapeEbayProductProxy(cleanedUrl);

      if (d.title) setTitle(d.title);
      if (d.listedPrice && d.listedPrice > 0) {
        setListedPrice(String(d.listedPrice));
        setAdjBasePrice(d.listedPrice);
      }
      if (d.estimatedWeight && d.estimatedWeight > 0) {
        setEstimatedWeight(String(d.estimatedWeight));
        setAdjWeight(d.estimatedWeight);
      }
      if (d.platform) setPlatform(d.platform);
      if (d.condition) setDeclaredCondition(d.condition);

      let fullDesc = d.description || "";
      if (d.domesticShippingCostUSD !== undefined && d.domesticShippingCostUSD > 0) {
        fullDesc += `\n\n[Envío EE.UU. (Miami): $${d.domesticShippingCostUSD} USD]`;
      }
      if (fullDesc) setDescription(fullDesc);

      if (d.scrapedSuccessfully && (d.title || d.listedPrice > 0)) {
        const extractedDetails = [
          d.listedPrice ? `Precio: $${d.listedPrice} USD` : "",
          d.domesticShippingCostUSD !== undefined ? `Envío EE.UU.: $${d.domesticShippingCostUSD} USD` : "",
          d.estimatedWeight ? `Peso: ${d.estimatedWeight} lbs` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        setScrapeStatus({
          success: true,
          message: `Scraping Exitoso (${d.platform}${d.extractionMethod ? ` via ${d.extractionMethod}` : ""}): ${extractedDetails || "Datos extraídos de la publicación"}.`,
        });
      } else {
        setScrapeStatus({
          success: false,
          message: d.error || "No se pudieron extraer todos los datos del producto. Verifica que la publicación esté activa antes de reintentar o completa los datos manualmente.",
        });
      }
    } catch (err: any) {
      setScrapeStatus({
        success: false,
        message: `No se pudo conectar con el producto. Verifica que el enlace sea una página activa de producto antes de reintentar.`,
      });
      setError(err.message || "Error al realizar el scraping de la URL. Verifica que la página esté activa.");
    } finally {
      setScrapingUrl(false);
    }
  };

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url && !title && !description) {
      setError("Por favor ingresa una URL, título o descripción del producto.");
      return;
    }

    const cleanedUrl = url ? cleanEbayUrl(url) : "";

    // Pre-validation: Verify URL if provided
    if (cleanedUrl && !isValidProductUrl(cleanedUrl)) {
      setError(
        "La URL ingresada no parece ser una página de producto válida. Verifica que sea un enlace directo de eBay, ShopGoodwill, Swappa u otra plataforma."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeCourier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanedUrl || url,
          title,
          description,
          listedPrice: parseFloat(listedPrice) || 0,
          platform,
          declaredCondition,
          courierRate: activeCourier.ratePerLbUSD,
          minCourierFee: activeCourier.minFeeUSD,
          estimatedWeight: parseFloat(estimatedWeight) || 3.0,
          exchangeRate: settings.paraleloRate,
          modelName: settings.aiModel,
          nvidiaApiKey: settings.nvidiaApiKey,
          temperature: settings.temperature,
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "No se pudo obtener el análisis de FlipMaster. Verifica que la publicación esté activa.");
      }

      // Mandatory fields validation for FlipMasterAnalysis response
      if (!validateFlipMasterAnalysisResponse(json.data)) {
        throw new Error(
          "El análisis devuelto por la IA está incompleto (faltan campos obligatorios de precio, envío o peso). Verifica que la URL corresponda a una página de producto activa de eBay antes de reintentar."
        );
      }

      const data: FlipMasterAnalysis = json.data;
      data.analyzedAt = new Date().toISOString();
      setAnalysisResult(data);

      // Initialize interactive sliders with returned numbers
      setAdjBasePrice(data.flipMath?.basePriceUSD || parseFloat(listedPrice) || 200);
      setAdjWeight(data.shippingToVenezuela?.estimatedWeightLbs || parseFloat(estimatedWeight) || 3.5);
      setAdjRestoration(data.restorationCost?.pessimisticCostUSD || 100);
      setAdjMarketVzla(data.flipMath?.estimatedMarketPriceVzlaUSD || 500);
    } catch (err: any) {
      setError(err.message || "Error al conectar con la API de FlipMaster. Comprueba si el producto está activo antes de reintentar.");
    } finally {
      setLoading(false);
    }
  };

  // Recalculated live math from sliders (usa calcularCourier real: flete + combustible + G.Op + G.A + seguro + IVA)
  const activeCourier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];
  const { totalCourierUSD: calculatedShipping } = calcularCourier({
    weightLbs: adjWeight,
    fobUSD: adjBasePrice,
    courier: activeCourier,
    embalaje: activeCourier.embalaje || "caja",
  });
  const recalculatedLanded = adjBasePrice + calculatedShipping + adjRestoration;
  const recalculatedProfit = adjMarketVzla - recalculatedLanded;
  const recalculatedROI = recalculatedLanded > 0 ? (recalculatedProfit / recalculatedLanded) * 100 : 0;
  const recalculatedVES = adjMarketVzla * settings.paraleloRate;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#121212]" />
              <span>Motor FlipMaster • Inspección Forense & Matemáticas</span>
            </div>
            <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Análisis de Oportunidades & Subastas</h2>
            <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
              Pega cualquier enlace de eBay, Swappa, Amazon o MercadoLibre. FlipMaster inspecciona el anuncio, evalúa costos de reparación en taller, calcula el flete casillero Miami → Venezuela y define la puja máxima absoluta.
            </p>
          </div>

          <div className="bg-[#dbdad7]/40 border border-[#e6e4e0] rounded-full px-4 py-2 text-xs flex items-center space-x-3 shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#121212] flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-[#616161] uppercase font-medium">Courier Activo</div>
              <div className="font-medium text-[#121212]">{activeCourier.name} (${activeCourier.ratePerLbUSD}/lb)</div>
            </div>
          </div>
        </div>

        {/* Preset Sample Buttons */}
        <div className="mt-6 pt-4 border-t border-[#e6e4e0]">
          <div className="text-xs font-medium text-[#616161] mb-2 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-[#121212]" />
            <span>Probar con ejemplos reales de flipping (1-Click):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(ex)}
                className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] border border-[#d8d6d2] text-xs font-medium px-3.5 py-1.5 rounded-full transition flex items-center space-x-1.5"
              >
                <span className="font-bold text-[#121212]">${ex.price}</span>
                <span>{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleRunAnalysis} className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="text-xs font-sans font-medium text-[#616161] uppercase tracking-wider flex items-center space-x-2">
          <LinkIcon className="w-3.5 h-3.5 text-[#121212]" />
          <span>Datos del Anuncio o Producto</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#616161] mb-1 flex items-center justify-between">
              <span>URL del Anuncio (eBay, Amazon, Swappa, etc.)</span>
              <span className="text-[10px] text-[#1a5336] font-mono font-medium">● Web Scraper En Vivo</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setScrapeStatus(null);
                }}
                onBlur={() => {
                  if (url && url.startsWith("http") && !title) {
                    handleScrapeUrl();
                  }
                }}
                placeholder="https://www.ebay.com/itm/385920194821"
                className="w-full bg-white border border-[#e6e4e0] rounded-full px-4 py-2 text-xs text-[#121212] placeholder-[#616161] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
              <button
                type="button"
                onClick={() => handleScrapeUrl()}
                disabled={scrapingUrl || !url}
                className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center justify-center space-x-1.5 disabled:opacity-40 shrink-0"
              >
                {scrapingUrl ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scrapeando eBay...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 text-white" />
                    <span>Extraer Datos de URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Plataforma Detectada</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-full px-4 py-2 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="eBay">eBay</option>
              <option value="Swappa">Swappa</option>
              <option value="Amazon">Amazon</option>
              <option value="MercadoLibre">MercadoLibre US/Vzla</option>
              <option value="Goodwill">ShopGoodwill</option>
              <option value="Otro">Otro Casillero</option>
            </select>
          </div>
        </div>

        {scrapeStatus && (
          <div className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 border font-sans ${
            scrapeStatus.success
              ? "bg-[#e6f4ea] border-[#ceead6] text-[#137333]"
              : "bg-[#fef7e0] border-[#feefc3] text-[#b06000]"
          }`}>
            <div className="flex items-center space-x-2">
              {scrapeStatus.success ? <Zap className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{scrapeStatus.message}</span>
            </div>
            {scrapeStatus.success && (
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#ceead6] shrink-0 font-medium">
                eBay Live Scrape OK
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#616161] mb-1">Título o Nombre del Producto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: MacBook Air M1 2020 8GB/256GB"
              className="w-full bg-white border border-[#e6e4e0] rounded-full px-4 py-2 text-xs text-[#121212] placeholder-[#616161] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Precio Anuncio / Puja Actual (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-[#616161] font-medium">$</span>
              <input
                type="number"
                step="0.01"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-full pl-8 pr-4 py-2 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Peso Estimado (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={estimatedWeight}
              onChange={(e) => setEstimatedWeight(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-full px-4 py-2 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#616161] mb-1">
            Descripción Completa / Notas del Vendedor / Fotos del Anuncio
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pega aquí la descripción completa del anuncio, notas de fallas declaradas ('untested', 'no power', 'display cracked', etc.)..."
            className="w-full bg-white border border-[#e6e4e0] rounded-lg p-3 text-xs text-[#121212] placeholder-[#616161] focus:outline-none focus:ring-1 focus:ring-[#121212]"
          ></textarea>
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3 text-[#991b1b] text-xs flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0 text-[#991b1b]" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium px-6 py-2.5 rounded-full text-xs sm:text-sm flex items-center space-x-2 transition disabled:opacity-50 shadow-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>FlipMaster Analizando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Ejecutar Análisis Forense FlipMaster</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analysis Output Section */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Verdict Card Banner */}
          <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none relative overflow-hidden text-[#121212]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-sans font-medium tracking-wider text-[#616161] mb-1">
                  Veredicto Final FlipMaster
                </div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-normal text-[#121212]">
                    {analysisResult.finalVerdict.decision}
                  </h3>
                </div>
                <p className="text-[#616161] text-xs mt-2 max-w-2xl leading-relaxed font-sans">
                  {analysisResult.finalVerdict.summaryExplanation}
                </p>
              </div>

              <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => exportarAnalisisPDF(analysisResult, settings, url, title)}
                  className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] border border-[#d8d6d2] font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-[#121212]" />
                  <span>Generar PDF</span>
                </button>

                <button
                  onClick={() => onSaveOpportunity(analysisResult, url, title)}
                  className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] border border-[#d8d6d2] font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#1a5336]" />
                  <span>Guardar Oportunidad</span>
                </button>

                <button
                  onClick={() => onConvertToFlip(analysisResult, url, title)}
                  className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2 shadow-none"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Comprar & Convertir en Flip</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Sliders */}
          <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none text-[#121212]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#121212]" />
                <h3 className="font-serif text-lg font-normal text-[#121212]">Calculadora Dinámica de Sensibilidad ROI</h3>
              </div>
              <span className="text-[11px] text-[#616161] bg-[#dbdad7]/40 px-3 py-1 rounded-full border border-[#e6e4e0]">
                Tasa USD/VES: {formatVES(settings.paraleloRate)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Slider 1: Base Price */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#616161]">Precio Oferta:</span>
                  <span className="text-[#121212] font-mono">{formatUSD(adjBasePrice)}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="5"
                  value={adjBasePrice}
                  onChange={(e) => setAdjBasePrice(Number(e.target.value))}
                  className="w-full accent-[#121212] bg-[#dbdad7] rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Weight */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#616161]">Peso Flete:</span>
                  <span className="text-[#121212] font-mono">{adjWeight} lbs</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={adjWeight}
                  onChange={(e) => setAdjWeight(Number(e.target.value))}
                  className="w-full accent-[#121212] bg-[#dbdad7] rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 3: Restoration */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#616161]">Presupuesto Reparación:</span>
                  <span className="text-[#121212] font-mono">{formatUSD(adjRestoration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="5"
                  value={adjRestoration}
                  onChange={(e) => setAdjRestoration(Number(e.target.value))}
                  className="w-full accent-[#121212] bg-[#dbdad7] rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 4: Vzla Market Price */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#616161]">Venta Estimada Vzla:</span>
                  <span className="text-[#121212] font-mono">{formatUSD(adjMarketVzla)}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="10"
                  value={adjMarketVzla}
                  onChange={(e) => setAdjMarketVzla(Number(e.target.value))}
                  className="w-full accent-[#121212] bg-[#dbdad7] rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Recalculated Live Metric Summary Bar */}
            <div className="mt-6 pt-4 border-t border-[#e6e4e0] grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#dbdad7]/20 p-4 rounded-lg border border-[#e6e4e0] text-center">
              <div>
                <div className="text-[10px] font-medium text-[#616161] uppercase">Costo Puesto Vzla</div>
                <div className="text-lg font-bold text-[#121212]">{formatUSD(recalculatedLanded)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#616161] uppercase">Precio Reventa Vzla</div>
                <div className="text-lg font-bold text-[#1a5336]">{formatUSD(adjMarketVzla)}</div>
                <div className="text-[10px] font-mono text-[#616161]">{formatVES(recalculatedVES)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#616161] uppercase">Ganancia Neta</div>
                <div className="text-lg font-bold text-[#121212]">
                  {formatUSD(recalculatedProfit)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#616161] uppercase">ROI Proyectado</div>
                <div className="text-lg font-bold text-[#1a5336] font-mono">
                  {formatPercent(recalculatedROI)}
                </div>
              </div>
            </div>
          </div>

          {/* Steps 1 to 6 Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Forensic Inspection */}
            <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-3 text-[#121212]">
              <div className="flex items-center space-x-2 text-[#616161] font-medium text-xs uppercase tracking-wider">
                <Search className="w-4 h-4 text-[#121212]" />
                <span>1. Inspección Forense del Producto</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Identificación Exacta:</span>
                  <span className="font-medium text-[#121212]">
                    {analysisResult.productIdentification?.brand} {analysisResult.productIdentification?.model} ({analysisResult.productIdentification?.variant})
                  </span>
                </div>

                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Estado Declarado:</span>
                  <span className="font-medium text-[#121212]">
                    {analysisResult.productIdentification?.declaredCondition}
                  </span>
                </div>

                <div>
                  <span className="text-[#616161] font-medium">Defectos Declarados:</span>
                  <ul className="mt-1 space-y-1">
                    {analysisResult.productIdentification?.declaredDefects?.map((d, i) => (
                      <li key={i} className="flex items-center space-x-2 text-[#121212] bg-[#dbdad7]/20 p-2 rounded-lg border border-[#e6e4e0]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#92400e] shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {analysisResult.productIdentification?.riskSignals?.length > 0 && (
                  <div>
                    <span className="text-[#991b1b] font-medium flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Señales de Riesgo Detectadas:</span>
                    </span>
                    <ul className="mt-1 space-y-1">
                      {analysisResult.productIdentification.riskSignals.map((r, i) => (
                        <li key={i} className="text-[#991b1b] bg-[#fef2f2] p-2 rounded-lg border border-[#fecaca] text-[11px]">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Restoration Cost */}
            <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-3 text-[#121212]">
              <div className="flex items-center space-x-2 text-[#616161] font-medium text-xs uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-[#121212]" />
                <span>2. Costo de Restauración & Taller</span>
              </div>

              <div className="space-y-2 text-xs">
                {analysisResult.restorationCost?.defectsBreakdown?.map((item, idx) => (
                  <div key={idx} className="bg-[#dbdad7]/30 p-3 rounded-lg border border-[#e6e4e0] space-y-1">
                    <div className="flex justify-between font-medium text-[#121212]">
                      <span>{item.item}</span>
                      <span className="text-[#121212] font-bold">{formatUSD(item.estimatedPartCostUSD)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#616161]">
                      <span>Dificultad: <strong className="text-[#121212]">{item.difficulty}</strong></span>
                      {item.requiresSpecialist && <span className="text-[#92400e] font-medium">Requiere Técnico/Micro-soldadura</span>}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0] text-center">
                    <div className="text-[10px] text-[#616161] uppercase font-medium">Escenario Optimista</div>
                    <div className="text-sm font-bold text-[#1a5336]">
                      {formatUSD(analysisResult.restorationCost?.optimisticCostUSD || 0)}
                    </div>
                  </div>
                  <div className="bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0] text-center">
                    <div className="text-[10px] text-[#616161] uppercase font-medium">Escenario Pesimista</div>
                    <div className="text-sm font-bold text-[#121212]">
                      {formatUSD(analysisResult.restorationCost?.pessimisticCostUSD || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Courier to Venezuela */}
            <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-3 text-[#121212]">
              <div className="flex items-center space-x-2 text-[#616161] font-medium text-xs uppercase tracking-wider">
                <Truck className="w-4 h-4 text-[#121212]" />
                <span>3. Costo de Envío a Venezuela (Casillero Miami)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Peso Estimado:</span>
                  <span className="font-medium text-[#121212]">{analysisResult.shippingToVenezuela?.estimatedWeightLbs} lbs</span>
                </div>

                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Flete Courier Internacional:</span>
                  <span className="font-medium text-[#121212]">
                    {formatUSD(analysisResult.shippingToVenezuela?.internationalCourierUSD || 0)}
                  </span>
                </div>

                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Total Flete Puesto Vzla:</span>
                  <span className="font-bold text-[#121212]">
                    {formatUSD(analysisResult.shippingToVenezuela?.totalLandedShippingUSD || 0)}
                  </span>
                </div>

                <p className="text-[11px] text-[#616161] bg-[#dbdad7]/20 p-2 rounded-lg border border-[#e6e4e0]">
                  {analysisResult.shippingToVenezuela?.courierNotes}
                </p>
              </div>
            </div>

            {/* Step 5: Auction Strategy */}
            <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-3 text-[#121212]">
              <div className="flex items-center space-x-2 text-[#616161] font-medium text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-[#121212]" />
                <span>5. Estrategia de Puja & Ventaja Competitiva</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161]">Puja Máxima Absoluta USD:</span>
                  <span className="font-bold text-[#121212] text-sm">
                    {formatUSD(analysisResult.auctionStrategy?.maxAbsoluteBidUSD || 0)}
                  </span>
                </div>

                <div className="bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                  <span className="text-[#616161] font-medium block mb-1">Táctica Recomendada:</span>
                  <span className="text-[#121212] font-medium">{analysisResult.auctionStrategy?.suggestedTactic}</span>
                </div>

                <div className="bg-[#dbdad7]/20 p-2.5 rounded-lg border border-[#e6e4e0] text-[11px] text-[#616161]">
                  <strong className="text-[#121212] block mb-0.5">Ventaja de Análisis:</strong>
                  {analysisResult.auctionStrategy?.edgeNotes}
                </div>
              </div>
            </div>
          </div>

          {/* Questions for Seller */}
          {analysisResult.finalVerdict?.pendingQuestionsForSeller?.length > 0 && (
            <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-2 text-[#121212]">
              <h4 className="text-xs font-medium text-[#616161] uppercase tracking-wider flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-[#121212]" />
                <span>Preguntas Clave para Hacerle al Vendedor Antes de Ofertar</span>
              </h4>
              <ul className="space-y-1 text-xs text-[#121212]">
                {analysisResult.finalVerdict.pendingQuestionsForSeller.map((q, idx) => (
                  <li key={idx} className="flex items-center space-x-2 bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                    <span className="text-[#121212] font-bold">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
