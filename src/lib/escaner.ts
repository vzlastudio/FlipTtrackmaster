import { AppSettings, FlipItem, FlipMasterAnalysis } from "../types";

export interface Tienda {
  id: string;
  nombre: string;
  url: string;
  tier: "A" | "B" | "C";
  precioMaximoUSD: number;
  categoria: string;
  activa: boolean;
  frecuenciaHoras: number;
  ultimoEscaneo?: string;
  totalItemsEscaneados: number;
  oportunidadesEncontradas: number;
  bloqueaCourier: boolean;
  fechaCreacion: string;
}

export interface Escaneo {
  id: string;
  tiendaId: string;
  fecha: string;
  itemsVistos: number;
  itemsAnalizados: number;
  oportunidades: number;
  duracionSegundos: number;
  error?: string;
}

export interface ItemEbayRaw {
  titulo: string;
  precio: number;
  enlace?: string;
  bids?: number;
  tiempoRestante?: string;
  condicion?: string;
}

export const TIERS_PRESETS: Record<
  "A" | "B" | "C",
  { nombre: string; precioMaximoUSD: number; precioMinUSD: number; descripcion: string; frecuenciaHoras: number }
> = {
  A: {
    nombre: "Tier A — Alto (ROI ≥ 40%)",
    precioMaximoUSD: 300,
    precioMinUSD: 100,
    descripcion: "MBP 15/16\" 2015–2020, iMac, iPhone Pro Max",
    frecuenciaHoras: 24,
  },
  B: {
    nombre: "Tier B — Medio (ROI ≥ 30%)",
    precioMaximoUSD: 150,
    precioMinUSD: 50,
    descripcion: "MBA, MBP 13\", iPhone 11/12/13, iPads",
    frecuenciaHoras: 24,
  },
  C: {
    nombre: "Tier C — Volumen (ROI ≥ 25%)",
    precioMaximoUSD: 80,
    precioMinUSD: 20,
    descripcion: "ThinkPad, Latitude, EliteBook, MacBook 2013–2015",
    frecuenciaHoras: 48,
  },
};

export const TIENDAS_EJEMPLO: Array<
  Omit<Tienda, "id" | "fechaCreacion" | "totalItemsEscaneados" | "oportunidadesEncontradas">
> = [
  {
    nombre: "Regency Technologies (Apple)",
    url: "https://www.ebay.com/str/regencytechnologies/Apple/_i.html?store_cat=461161014",
    tier: "B",
    precioMaximoUSD: 150,
    categoria: "Apple (MacBooks, iPhones, iPads)",
    activa: true,
    frecuenciaHoras: 24,
    bloqueaCourier: false,
  },
  {
    nombre: "northbaymac",
    url: "https://www.ebay.com/sch/m.html?_ssn=northbaymac&_sop=1",
    tier: "A",
    precioMaximoUSD: 300,
    categoria: "MacBooks",
    activa: true,
    frecuenciaHoras: 24,
    bloqueaCourier: false,
  },
  {
    nombre: "iPhones For Parts (Liquidación)",
    url: "https://www.ebay.com/sch/m.html?_nkw=iphone+13+for+parts+untested&_sop=1",
    tier: "C",
    precioMaximoUSD: 80,
    categoria: "Smartphones",
    activa: true,
    frecuenciaHoras: 48,
    bloqueaCourier: true,
  },
];

export function notificarTelegram(resumen: string, settings: AppSettings): Promise<boolean> {
  const token = settings.telegramBotToken;
  const chatId = settings.telegramChatId;
  if (!token || !chatId) return Promise.resolve(false);
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: resumen, parse_mode: "HTML" }),
  })
    .then((r) => r.ok)
    .catch(() => false);
}

export interface ResultadoEscaneo {
  escaneo: Escaneo;
  oportunidades: FlipItem[];
}

/**
 * Escanea una tienda eBay:
 * 1. POST /api/scrape-store → items crudos
 * 2. Filtra por precioMaximoUSD
 * 3. Analiza hasta 15 candidatos con /api/analyze (FlipMaster AI)
 * 4. Guarda los positivos como oportunidades (FlipItem saved_opportunity, tiendaOrigenId)
 * 5. Notifica por Telegram si está configurado
 */
export async function escanearTienda(
  tienda: Tienda,
  settings: AppSettings,
  onProgress?: (msg: string) => void
): Promise<ResultadoEscaneo> {
  const inicio = Date.now();
  const escaneo: Escaneo = {
    id: `ESC-${Date.now()}`,
    tiendaId: tienda.id,
    fecha: new Date().toISOString(),
    itemsVistos: 0,
    itemsAnalizados: 0,
    oportunidades: 0,
    duracionSegundos: 0,
  };
  const oportunidades: FlipItem[] = [];

  try {
    onProgress?.("Obteniendo items de la tienda (Firecrawl)...");
    const storeRes = await fetch("/api/scrape-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tienda.url,
        // La key de Firecrawl se envía al servidor (con prioridad sobre la env var)
        firecrawlApiKey: settings.firecrawlApiKey || undefined,
      }),
    });
    const storeJson = await storeRes.json();
    if (!storeJson.success) {
      throw new Error(storeJson.error || "No se pudo escanear la tienda (verifica la key de Firecrawl en Ajustes).");
    }

    const rawItems: ItemEbayRaw[] = storeJson.items || [];
    escaneo.itemsVistos = rawItems.length;

    const candidatos = rawItems
      .filter((it) => it.precio > 0 && it.precio <= tienda.precioMaximoUSD)
      .slice(0, 15);

    const courier =
      settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];

    for (let i = 0; i < candidatos.length; i++) {
      const item = candidatos[i];
      escaneo.itemsAnalizados = i + 1;
      onProgress?.(`Analizando item ${i + 1}/${candidatos.length}: ${item.titulo.slice(0, 60)}...`);

      try {
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: item.enlace || tienda.url,
            title: item.titulo,
            listedPrice: item.precio,
            platform: "eBay",
            declaredCondition: item.condicion || "Usado / Con Defectos",
            courierRate: courier.ratePerLbUSD,
            minCourierFee: courier.minFeeUSD,
            estimatedWeight: 3.0,
            exchangeRate: settings.paraleloRate,
            modelName: settings.aiModel,
            nvidiaApiKey: settings.nvidiaApiKey,
            temperature: settings.temperature,
          }),
        });
        const json = await analyzeRes.json();
        if (json.success && json.data) {
          const analysis = json.data as FlipMasterAnalysis;
          if (analysis.finalVerdict?.decision === "VALE LA PENA TRAERLO") {
            const brand = analysis.productIdentification?.brand || "eBay";
            const model = analysis.productIdentification?.model || item.titulo.slice(0, 40);
            oportunidades.push({
              id: `FLIP-${Date.now()}-${i}`,
              title: item.titulo || `${brand} ${model}`,
              brand,
              model,
              category: (analysis.productIdentification?.category || "Otros") as FlipItem["category"],
              platform: "eBay",
              status: "saved_opportunity",
              sourceUrl: item.enlace || "",
              sourceDescription: analysis.finalVerdict?.summaryExplanation || "",
              imageUrl:
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
              tiendaOrigenId: tienda.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              analysis,
              timeline: [
                {
                  id: `TL-${Date.now()}-${i}`,
                  timestamp: new Date().toISOString(),
                  actor: "FlipMaster AI",
                  title: "Oportunidad Detectada por Escáner",
                  description: `Tienda ${tienda.nombre} · ROI est. ${(analysis.flipMath?.roiPercent || 0).toFixed(2)}%`,
                  stage: "Análisis",
                },
              ],
            });
          }
        }
      } catch (err: any) {
        console.warn("Error analizando item del escáner:", err?.message || err);
      }
    }

    escaneo.oportunidades = oportunidades.length;
    escaneo.duracionSegundos = Math.round((Date.now() - inicio) / 1000);

    const top = [...oportunidades].sort(
      (a, b) => (b.analysis?.flipMath?.roiPercent || 0) - (a.analysis?.flipMath?.roiPercent || 0)
    )[0];

    if (oportunidades.length > 0) {
      await notificarTelegram(
        `<b>🤖 FlipTrack — Escaneo de Tienda</b>\n📍 ${tienda.nombre}\n🛍 ${escaneo.itemsVistos} items vistos · 🎯 ${oportunidades.length} oportunidades\n💰 Top ROI: ${(top?.analysis?.flipMath?.roiPercent || 0).toFixed(1)}% (${top?.title || ""})\n🔗 ${top?.sourceUrl || "—"}`,
        settings
      );
    }
  } catch (err: any) {
    escaneo.error = err?.message || "Error al escanear tienda";
  }

  return { escaneo, oportunidades };
}
