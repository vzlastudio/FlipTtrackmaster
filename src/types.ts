export type FlipModule =
  | "dashboard"
  | "analyzer"
  | "opportunities"
  | "purchases"
  | "logistics"
  | "repairs"
  | "inventory"
  | "sales"
  | "transactions"
  | "clients"
  | "documents"
  | "audit"
  | "reports"
  | "exports"
  | "ebaysync"
  | "calculators"
  | "settings"
  | "tiendas";

export type FlipStatus =
  | "evaluating"
  | "saved_opportunity"
  | "bidding"
  | "purchased"
  | "in_transit_us"
  | "miami_warehouse"
  | "international_freight"
  | "customs_vzla"
  | "received_vzla"
  | "in_repair"
  | "ready_for_sale"
  | "listed"
  | "sold"
  | "archived";

export interface PartOrder {
  id: string;
  name: string;
  costUSD: number;
  source: string;
  trackingNumber?: string;
  status: "ordered" | "in_transit" | "installed";
}

export interface ProductIdentification {
  brand: string;
  model: string;
  variant: string;
  specs: string;
  category?: string;
  declaredCondition: string;
  declaredDefects: string[];
  missingAccessories: string[];
  riskLevel: "Bajo" | "Medio" | "Alto" | "Crítico";
  riskSignals: string[];
}

export interface RestorationCostBreakdown {
  item: string;
  estimatedPartCostUSD: number;
  difficulty: "Fácil" | "Media" | "Difícil" | "Profesional";
  requiresSpecialist: boolean;
}

export interface RestorationCost {
  defectsBreakdown: RestorationCostBreakdown[];
  optimisticCostUSD: number;
  pessimisticCostUSD: number;
  recommendedBudgetUSD: number;
}

export interface ShippingToVenezuela {
  estimatedWeightLbs: number;
  internalUSFreightUSD: number;
  internationalCourierUSD: number;
  customsAndInsuranceUSD: number;
  totalLandedShippingUSD: number;
  courierNotes: string;
}

export interface FlipMath {
  basePriceUSD: number;
  totalShippingUSD: number;
  restorationPessimisticUSD: number;
  totalLandedCostUSD: number;
  estimatedMarketPriceVzlaUSD: number;
  estimatedMarketPriceVzlaVES: number;
  netProfitUSD: number;
  roiPercent: number;
  meetsFlipRule: boolean;
  ruleExplanation: string;
}

export interface AuctionStrategy {
  isAuction: boolean;
  maxAbsoluteBidUSD: number;
  suggestedTactic: string;
  edgeNotes: string;
}

export interface FinalVerdict {
  decision: "VALE LA PENA TRAERLO" | "NO VALE LA PENA" | "DEPENDE";
  summaryExplanation: string;
  pendingQuestionsForSeller: string[];
}

export interface FlipMasterAnalysis {
  productIdentification: ProductIdentification;
  restorationCost: RestorationCost;
  shippingToVenezuela: ShippingToVenezuela;
  flipMath: FlipMath;
  auctionStrategy: AuctionStrategy;
  finalVerdict: FinalVerdict;
  markdownReport?: string;
  analyzedAt: string;
}

export interface TimelineLog {
  id: string;
  timestamp: string;
  status?: FlipStatus;
  title: string;
  description: string;
  actor: string;
  stage?: string;
}

export interface PurchaseInfo {
  priceUSD: number;
  shippingUSUSD: number;
  taxUSD: number;
  totalUSD: number;
  purchaseDate: string;
  supplierName: string;
  supplierUrl?: string;
  trackingUS?: string;
  invoiceUrl?: string;
  paymentMethod: string;
}

export interface LogisticsInfo {
  courierName?: string; // e.g. Liberty Express
  casilleroCode?: string; // e.g. LIB-MIA-88492
  trackingNumber?: string;
  weightLbs: number;
  freightCostUSD: number;
  currentLeg: 1 | 2 | 3 | 4; // 1: Vendedor->Miami, 2: Miami->Courier, 3: Courier->Vzla, 4: Vzla->Taller/User
  trackingUS?: string; // Tracking domestico EE.UU. (FedEx/UPS/USPS) - Tramo 1
  statusNote?: string; // Nota libre del estado actual
  departureDateUS?: string;
  arrivedMiamiDate?: string;
  arrivedVzlaDate?: string;
  estimatedDeliveryDate?: string;
  warehouseLocationVzla?: string;
  carrierStatusText?: string;
}

export type CourierCompany = CourierRateConfig;

export interface RepairInfo {
  assignedTechnician?: string;
  estimatedPartsCostUSD: number;
  actualPartsCostUSD: number;
  difficulty: "Fácil" | "Media" | "Difícil" | "Profesional";
  repairStatus: "pending_parts" | "in_diagnostic" | "repairing" | "quality_test" | "completed";
  partsList: PartOrder[];
  repairNotes: string;
  diagnosedDefects: string[];
}

export interface InventoryInfo {
  sku: string;
  serialNumber?: string;
  physicalLocationTag: string; // e.g. "Estante B-2 / Maracay"
  conditionGrade: "A+" | "A" | "B" | "C" | "Piezas";
  targetPriceUSD: number;
  minAcceptablePriceUSD: number;
  testedOk: boolean;
  notes?: string;
}

export interface SaleInfo {
  channel: "MercadoLibre" | "Instagram" | "WhatsApp" | "Marketplace" | "Venta Directa";
  salePriceUSD: number;
  salePriceVES: number;
  exchangeRateUsed: number;
  platformCommissionUSD: number;
  netProceedsUSD: number;
  saleDate: string;
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  buyerCity: string;
  warrantyDays: number;
  paymentMethodUsed: string; // e.g. Zelle, Pago Movil, Cash
}

export interface FlipItem {
  id: string;
  title: string;
  sourceUrl: string;
  sourceDescription?: string;
  platform: string; // e.g. eBay, Amazon, Swappa
  category: "Laptops & MacBooks" | "Consolas & Gaming" | "Smartphones" | "Audio & Video" | "Componentes PC" | "Otros";
  brand: string;
  model: string;
  imageUrl: string;
  status: FlipStatus;
  createdAt: string;
  updatedAt: string;
  
  // Source store reference
  tiendaOrigenId?: string;

  // FlipMaster Analysis
  analysis?: FlipMasterAnalysis;

  // Operational Modules
  purchase?: PurchaseInfo;
  logistics?: LogisticsInfo;
  repair?: RepairInfo;
  inventory?: InventoryInfo;
  sale?: SaleInfo;

  timeline: TimelineLog[];
}

export interface Transaction {
  id: string;
  flipId?: string;
  flipTitle?: string;
  date: string;
  type: "expense" | "income";
  category: "Compra Producto" | "Envío US" | "Courier Int. (Liberty)" | "Repuestos" | "Mano de Obra" | "Comisión Venta" | "Ingreso Venta" | "Otros";
  amountUSD: number;
  amountVES: number;
  exchangeRate: number;
  currency: "USD" | "VES";
  paymentMethod: "Zelle" | "Pago Móvil" | "Efectivo USD" | "Binance USDT" | "Banesco Panamá" | "Zinli";
  notes: string;
  referenceCode?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  totalPurchasesCount: number;
  totalSpentUSD: number;
  preferredChannel: string;
  notes?: string;
  registeredAt: string;
  lastPurchaseDate?: string;
}

export interface CourierRateConfig {
  id: string;
  name: string; // e.g. Liberty Express Miami
  type: "air" | "sea";
  ratePerLbUSD: number;
  minFeeUSD: number;
  minWeightLbs?: number; // if package weighs < 3lb, minimum $25 applies
  combustiblePorLbUSD: number; // e.g. 0.75
  gastosOperacionalesPorLbUSD: number; // e.g. 0.75
  insurancePercent: number; // e.g. 5 (% sobre FOB)
  customsFeeUSD: number; // e.g. 1.00
  ivaPorcentaje: number; // e.g. 16 (% sobre flete+combustible+G.Op+customsFee)
  divisorVolumetrico: number; // e.g. 166 (inches³/lb) — peso volumétrico = (L×A×P)/divisor
  embalaje: "sobre" | "caja";
  avgDeliveryDays: number;
  trackingBaseUrl: string;
  addressCasilleroMiami: string;
  active: boolean;
}

export interface DocumentFile {
  id: string;
  flipId?: string;
  flipTitle?: string;
  title: string;
  type: "Factura Compra" | "Guía Courier" | "Foto Reparación" | "Planilla Aduana" | "Recibo Venta";
  fileUrl: string;
  uploadDate: string;
  sizeKb: number;
}

export interface AppSettings {
  aiModel: string;
  temperature: number;
  detailLevel: "concise" | "standard" | "exhaustive";
  bcvRate: number;
  paraleloRate: number;
  activeCourierId: string;
  defaultTargetROI: number;
  couriers: CourierRateConfig[];
  customInstructions: string;
  libertyApiKey?: string;
  nvidiaApiKey?: string;
  dollarApiSource: "EnParaleloVzla" | "BCV" | "Custom";
  // Telegram alerts
  telegramBotToken?: string;
  telegramChatId?: string;
  // Firecrawl key (also set on server via env)
  firecrawlApiKey?: string;
  // Browserbase key for Stagehand browser agent (optional complement to Firecrawl)
  browserbaseApiKey?: string;
}
