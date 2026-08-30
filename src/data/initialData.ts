import { FlipItem, Transaction, Client, AppSettings, DocumentFile } from "../types";

export const initialCouriers = [
  {
    id: "liberty_express",
    name: "Liberty Express Miami (Aéreo)",
    type: "air" as const,
    ratePerLbUSD: 3.10,
    minFeeUSD: 25.00,
    minWeightLbs: 3,
    combustiblePorLbUSD: 0.75,
    gastosOperacionalesPorLbUSD: 0.75,
    insurancePercent: 5.0,
    customsFeeUSD: 1.00,
    ivaPorcentaje: 16,
    divisorVolumetrico: 166,
    embalaje: "caja" as const,
    avgDeliveryDays: 10,
    trackingBaseUrl: "https://libertyexpress.com/tracking?guide=",
    addressCasilleroMiami: "8520 NW 56th St, Doral, FL 33166 (LIB-99104)",
    active: true,
  },
  {
    id: "zoom_international",
    name: "ZOOM Casillero (Aéreo)",
    type: "air" as const,
    ratePerLbUSD: 5.00,
    minFeeUSD: 18.00,
    minWeightLbs: 2,
    combustiblePorLbUSD: 1.00,
    gastosOperacionalesPorLbUSD: 1.00,
    insurancePercent: 4.0,
    customsFeeUSD: 2.00,
    ivaPorcentaje: 16,
    divisorVolumetrico: 166,
    embalaje: "caja" as const,
    avgDeliveryDays: 8,
    trackingBaseUrl: "https://zoom.red/track/",
    addressCasilleroMiami: "10250 NW 89th Ave, Medley, FL 33178",
    active: true,
  },
];

export const initialSettings: AppSettings = {
  aiModel: "deepseek-ai/deepseek-v4-flash-0731",
  temperature: 0.3,
  detailLevel: "standard",
  bcvRate: 0,
  paraleloRate: 0,
  activeCourierId: "liberty_express",
  defaultTargetROI: 35,
  couriers: initialCouriers,
  customInstructions: "",
  dollarApiSource: "EnParaleloVzla",
  libertyApiKey: "",
  nvidiaApiKey: "",
};

// All arrays start empty — user data persists in IndexedDB
export const initialFlips: FlipItem[] = [];
export const initialTransactions: Transaction[] = [];
export const initialClients: Client[] = [];
export const initialDocuments: DocumentFile[] = [];
