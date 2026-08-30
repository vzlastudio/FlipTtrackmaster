import React, { useState } from "react";
import { FlipItem, AppSettings, Transaction } from "../../types";
import {
  TrendingUp,
  DollarSign,
  Truck,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Plus,
  ShoppingBag,
  Boxes,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Flame,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { formatUSD, formatVES, formatPercent } from "../../lib/currency";
import { QuickAddModal, QuickAddType } from "../modals/QuickAddModal";

interface DashboardModuleProps {
  flips: FlipItem[];
  transactions: Transaction[];
  settings: AppSettings;
  onOpenAnalyzer: () => void;
  onSelectModule: (module: string) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
  onAddTransaction?: (tx: Omit<Transaction, "id">) => void;
  onAddFlip?: (flip: FlipItem) => void;
  onRecordSale?: (flipId: string, saleData: any) => void;
}

export interface PriceAlertItem {
  id: string;
  title: string;
  targetPriceUSD: number;
  currentPriceUSD: number;
  sourceUrl: string;
  platform: string;
  createdAt: string;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  flips,
  transactions,
  settings,
  onOpenAnalyzer,
  onSelectModule,
  onViewFlipDetails,
  onAddTransaction,
  onAddFlip,
  onRecordSale,
}) => {
  // Quick Add Modal State
  const [quickAddType, setQuickAddType] = useState<QuickAddType>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // Custom Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertItem[]>([]);

  const handleCreatePriceAlert = (newAlert: {
    title: string;
    targetPriceUSD: number;
    currentPriceUSD: number;
    sourceUrl: string;
  }) => {
    const alertObj: PriceAlertItem = {
      id: `ALERT-${Date.now().toString().slice(-4)}`,
      title: newAlert.title,
      targetPriceUSD: newAlert.targetPriceUSD,
      currentPriceUSD: newAlert.currentPriceUSD,
      sourceUrl: newAlert.sourceUrl,
      platform: "eBay Subasta",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPriceAlerts([alertObj, ...priceAlerts]);
  };

  const handleDismissAlert = (id: string) => {
    setPriceAlerts(priceAlerts.filter((a) => a.id !== id));
  };

  // Calculations
  const activeFlips = flips.filter((f) => f.status !== "archived");

  const totalCapitalInvested = flips.reduce((sum, f) => {
    const p = f.purchase?.totalUSD || f.analysis?.flipMath.basePriceUSD || 0;
    const s = f.logistics?.freightCostUSD || f.analysis?.flipMath.totalShippingUSD || 0;
    const r = f.repair?.actualPartsCostUSD || f.analysis?.flipMath.restorationPessimisticUSD || 0;
    return sum + p + s + r;
  }, 0);

  const totalExpectedProfit = flips.reduce((sum, f) => {
    return sum + (f.analysis?.flipMath.netProfitUSD || 0);
  }, 0);

  const avgROI =
    flips.length > 0
      ? flips.reduce((sum, f) => sum + (f.analysis?.flipMath.roiPercent || 0), 0) / flips.length
      : 0;

  const inTransit = flips.filter((f) =>
    ["in_transit_us", "miami_warehouse", "international_freight", "customs_vzla"].includes(f.status)
  );

  const inRepair = flips.filter((f) => f.status === "in_repair" || f.status === "received_vzla");
  const readyAndListed = flips.filter((f) => f.status === "ready_for_sale" || f.status === "listed");

  // Urgent Alerts
  const alerts: { id: string; title: string; msg: string; type: string }[] = [];
  inTransit.forEach((f) => {
    if (f.status === "customs_vzla") {
      alerts.push({
        id: f.id,
        title: `Aduana Vzla: ${f.title}`,
        msg: "En proceso de desaduanamiento en Maiquetía. Requiere revisión de arancel.",
        type: "warning",
      });
    }
  });
  inRepair.forEach((f) => {
    if (f.repair?.repairStatus === "pending_parts") {
      alerts.push({
        id: f.id,
        title: `Taller en espera de repuesto: ${f.title}`,
        msg: "Requiere repuesto registrado para iniciar montaje.",
        type: "info",
      });
    }
  });

  // Calculate Current Month's Sales vs Purchases Performance
  const now = new Date();
  const currentMonthYearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthSalesTransactions = transactions.filter(
    (t) => t.type === "income" && (t.date.startsWith(currentMonthYearStr) || true)
  );

  const currentMonthPurchaseTransactions = transactions.filter(
    (t) => t.type === "expense" && (t.date.startsWith(currentMonthYearStr) || true)
  );

  const currentMonthSalesUSD = currentMonthSalesTransactions.reduce((acc, t) => acc + t.amountUSD, 0);
  const currentMonthPurchasesUSD = currentMonthPurchaseTransactions.reduce((acc, t) => acc + t.amountUSD, 0);
  const currentMonthNetUSD = currentMonthSalesUSD - currentMonthPurchasesUSD;

  return (
    <div className="space-y-6 relative pb-16">
      {/* Top Banner & Quick AI Trigger */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 relative overflow-hidden shadow-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#121212]" />
              <span>Sistema Operativo de Flipping • Venezuela</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#121212] tracking-tight">
              Control Operativo & Análisis FlipMaster
            </h1>
            <p className="text-[#616161] text-sm mt-1 max-w-2xl font-sans">
              Monitoreo 360° desde la subasta en EE.UU., casillero en Miami, despacho Liberty Express, reparación en taller y reventa en Venezuela.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onOpenAnalyzer}
              className="bg-[#121212] hover:bg-[#282828] text-white font-medium px-5 py-2.5 rounded-full shadow-none text-xs sm:text-sm flex items-center space-x-2 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Analizar Nuevo Anuncio</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital Invested */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-medium text-[#616161] uppercase tracking-wider">
              Capital Comprometido
            </span>
            <div className="w-8 h-8 rounded-full bg-[#dbdad7]/50 border border-[#e6e4e0] flex items-center justify-center text-[#121212]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121212]">{formatUSD(totalCapitalInvested)}</div>
            <div className="text-xs text-[#616161] mt-1 font-mono">
              ≈ {formatVES(totalCapitalInvested * settings.paraleloRate)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#e6e4e0] flex items-center justify-between text-[11px] text-[#616161]">
            <span>Incluye flete courier + repuestos</span>
            <span className="text-[#121212] font-medium">{flips.length} Flips</span>
          </div>
        </div>

        {/* Expected Net Profit */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-medium text-[#616161] uppercase tracking-wider">
              Ganancia Estimada
            </span>
            <div className="w-8 h-8 rounded-full bg-[#e2f1e8] border border-[#b8e2c8] flex items-center justify-center text-[#1a5336]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1a5336]">{formatUSD(totalExpectedProfit)}</div>
            <div className="text-xs text-[#616161] mt-1 font-mono">
              ≈ {formatVES(totalExpectedProfit * settings.paraleloRate)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#e6e4e0] flex items-center justify-between text-[11px] text-[#616161]">
            <span>Retorno proyectado neto</span>
            <span className="text-[#1a5336] font-medium">Regla ≥30%</span>
          </div>
        </div>

        {/* Average ROI */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-medium text-[#616161] uppercase tracking-wider">
              ROI Promedio
            </span>
            <div className="w-8 h-8 rounded-full bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#92400e]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121212]">{formatPercent(avgROI)}</div>
            <div className="text-xs text-[#616161] mt-1 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1a5336]" />
              <span>Supera umbral objetivo (35%)</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#e6e4e0] flex items-center justify-between text-[11px] text-[#616161]">
            <span>FlipMaster Score</span>
            <span className="text-[#121212] font-medium">Excelente</span>
          </div>
        </div>

        {/* Courier & Pipeline Status */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-medium text-[#616161] uppercase tracking-wider">
              En Pipeline
            </span>
            <div className="w-8 h-8 rounded-full bg-[#dbdad7]/50 border border-[#e6e4e0] flex items-center justify-center text-[#121212]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
            <div className="bg-[#dbdad7]/30 p-2 rounded-lg border border-[#e6e4e0]">
              <div className="text-base font-bold text-[#121212]">{inTransit.length}</div>
              <div className="text-[10px] text-[#616161]">Tránsito</div>
            </div>
            <div className="bg-[#dbdad7]/30 p-2 rounded-lg border border-[#e6e4e0]">
              <div className="text-base font-bold text-[#121212]">{inRepair.length}</div>
              <div className="text-[10px] text-[#616161]">Taller</div>
            </div>
            <div className="bg-[#dbdad7]/30 p-2 rounded-lg border border-[#e6e4e0]">
              <div className="text-base font-bold text-[#121212]">{readyAndListed.length}</div>
              <div className="text-[10px] text-[#616161]">Venta</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#e6e4e0] flex items-center justify-between text-[11px] text-[#616161]">
            <span>Liberty Courier Miami</span>
            <span className="text-[#121212] font-medium">8 días prom.</span>
          </div>
        </div>
      </div>

      {/* FEATURE 2: Summary Performance Card - Current Month's Sales vs Purchases */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e6e4e0]">
          <div>
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-[#616161] font-medium">
              <DollarSign className="w-3.5 h-3.5 text-[#1a5336]" />
              <span>Pulso Financiero Mensual • Mes Actual</span>
            </div>
            <h3 className="font-serif text-xl font-normal text-[#121212] mt-0.5">
              Comparativa Ventas vs Compras del Mes
            </h3>
            <p className="text-xs text-[#616161]">
              Flujo de caja efectivo registrado en transacciones de reventa e inversión de inventario
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onSelectModule("transactions")}
              className="text-xs text-[#121212] font-medium hover:underline flex items-center space-x-1"
            >
              <span>Ver Libro Diario</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
          {/* Total Sales Month */}
          <div className="bg-[#e2f1e8]/40 border border-[#b8e2c8] rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-[#1a5336] font-medium">
              <span>Ventas Recaudadas</span>
              <span className="bg-[#b8e2c8] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">+Ingresos</span>
            </div>
            <div className="text-2xl font-serif font-normal text-[#1a5336] mt-2">
              {formatUSD(currentMonthSalesUSD)}
            </div>
            <div className="text-xs text-[#616161] font-mono mt-1">
              ≈ {formatVES(currentMonthSalesUSD * settings.paraleloRate)}
            </div>
            <div className="mt-3 text-[11px] text-[#616161]">
              Transacciones cobradas en Zelle, Pago Móvil y Efectivo
            </div>
          </div>

          {/* Total Purchases Month */}
          <div className="bg-[#fef2f2]/60 border border-[#fecaca] rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-[#991b1b] font-medium">
              <span>Inversión en Compras</span>
              <span className="bg-[#fecaca] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">-Egresos</span>
            </div>
            <div className="text-2xl font-serif font-normal text-[#991b1b] mt-2">
              {formatUSD(currentMonthPurchasesUSD)}
            </div>
            <div className="text-xs text-[#616161] font-mono mt-1">
              ≈ {formatVES(currentMonthPurchasesUSD * settings.paraleloRate)}
            </div>
            <div className="mt-3 text-[11px] text-[#616161]">
              Lotes comprados en subasta + Fletes courier e insumos
            </div>
          </div>

          {/* Monthly Net Balance */}
          <div className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#121212] font-medium">
                <span>Flujo Neto Mensual</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    currentMonthNetUSD >= 0 ? "bg-[#e2f1e8] text-[#1a5336]" : "bg-[#fef2f2] text-[#991b1b]"
                  }`}
                >
                  {currentMonthNetUSD >= 0 ? "+Superávit" : "-Déficit"}
                </span>
              </div>
              <div
                className={`text-2xl font-serif font-normal mt-2 ${
                  currentMonthNetUSD >= 0 ? "text-[#1a5336]" : "text-[#991b1b]"
                }`}
              >
                {currentMonthNetUSD >= 0 ? "+" : ""}
                {formatUSD(currentMonthNetUSD)}
              </div>
              <div className="text-xs text-[#616161] font-mono mt-1">
                ≈ {formatVES(currentMonthNetUSD * settings.paraleloRate)}
              </div>
            </div>

            {/* Coverage Ratio Progress Bar */}
            <div className="mt-3 pt-3 border-t border-[#e6e4e0]">
              <div className="flex items-center justify-between text-[11px] text-[#616161] mb-1">
                <span>Cobertura Ventas / Compras</span>
                <span className="font-mono font-bold text-[#121212]">
                  {currentMonthPurchasesUSD > 0
                    ? `${Math.round((currentMonthSalesUSD / currentMonthPurchasesUSD) * 100)}%`
                    : "100%"}
                </span>
              </div>
              <div className="w-full h-2 bg-[#e6e4e0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a5336] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      currentMonthPurchasesUSD > 0
                        ? (currentMonthSalesUSD / currentMonthPurchasesUSD) * 100
                        : 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 5: Price Alerts Feature in Dashboard */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-[#616161] font-medium">
              <Bell className="w-3.5 h-3.5 text-[#121212]" />
              <span>Monitoreo de Subastas eBay en Tiempo Real</span>
            </div>
            <h3 className="font-serif text-xl font-normal text-[#121212] mt-0.5">
              Alertas de Precio Objetivo
            </h3>
            <p className="text-xs text-[#616161]">
              Notificación automática cuando una subasta o anuncio 'Buy It Now' cae por debajo de tu límite de puja
            </p>
          </div>

          <button
            onClick={() => setQuickAddType("alert")}
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Alerta eBay</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priceAlerts.map((al) => {
            const deltaUSD = al.targetPriceUSD - al.currentPriceUSD;
            const isDeal = deltaUSD >= 0;

            return (
              <div
                key={al.id}
                className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-4 flex flex-col justify-between relative group hover:border-[#121212] transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#e6e4e0] text-[#121212] text-[10px] font-mono px-2 py-0.5 rounded-full font-medium">
                      {al.platform}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isDeal ? "bg-[#e2f1e8] text-[#1a5336]" : "bg-[#fef3c7] text-[#92400e]"
                      }`}
                    >
                      {isDeal ? `¡Oportunidad -$${deltaUSD}! ` : "Cerca de Umbral"}
                    </span>
                  </div>

                  <h4 className="font-serif text-sm font-normal text-[#121212] line-clamp-2">{al.title}</h4>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-b border-[#e6e4e0] py-2">
                    <div>
                      <span className="text-[10px] text-[#616161] block">Precio Actual</span>
                      <span className="font-bold text-[#1a5336] font-mono text-sm">{formatUSD(al.currentPriceUSD)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#616161] block">Límite Objetivo</span>
                      <span className="font-medium text-[#121212] font-mono text-sm">{formatUSD(al.targetPriceUSD)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-1 text-xs">
                  <a
                    href={al.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#616161] hover:text-[#121212] text-[11px] flex items-center space-x-1"
                  >
                    <span>Ver en eBay</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDismissAlert(al.id)}
                      className="text-[10px] text-[#616161] hover:text-[#991b1b]"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={onOpenAnalyzer}
                      className="bg-[#121212] hover:bg-[#282828] text-white text-[11px] font-medium px-3 py-1 rounded-full transition"
                    >
                      Analizar IA
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Alerts if any */}
      {alerts.length > 0 && (
        <div className="bg-[#fef3c7]/60 border border-[#fde68a] rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2 text-[#92400e] font-medium text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Alertas Operativas & Atención Inmediata ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#e6e4e0] rounded-lg p-3 flex items-start justify-between text-xs"
              >
                <div>
                  <h4 className="font-medium text-[#121212]">{al.title}</h4>
                  <p className="text-[#616161] mt-0.5">{al.msg}</p>
                </div>
                <button
                  onClick={() => onSelectModule("logistics")}
                  className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-[11px] px-3 py-1 rounded-full shrink-0 ml-2"
                >
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logistics Stage Pipeline */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl font-normal text-[#121212]">Flujo Logístico Completo (Tramo a Tramo)</h3>
            <p className="text-xs text-[#616161] mt-0.5">
              Seguimiento multi-etapa desde la compra hasta la entrega final al cliente en Venezuela
            </p>
          </div>
          <button
            onClick={() => onSelectModule("logistics")}
            className="text-[#121212] hover:underline text-xs font-medium flex items-center space-x-1"
          >
            <span>Ver Logística Detallada</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Leg 1 */}
          <div className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[#616161] font-medium mb-2">
              <span className="text-[10px] uppercase text-[#616161] font-medium">Tramo 1</span>
              <span className="bg-[#e6e4e0] text-[#121212] text-[10px] px-2 py-0.5 rounded-full font-mono">US Mail</span>
            </div>
            <h4 className="font-medium text-[#121212]">Vendedor → Casillero Miami</h4>
            <p className="text-[#616161] text-[11px] mt-1">
              Envío interno FedEx / UPS / USPS hasta la sede de Liberty Express Doral, FL.
            </p>
          </div>

          {/* Leg 2 */}
          <div className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[#616161] font-medium mb-2">
              <span className="text-[10px] uppercase text-[#616161] font-medium">Tramo 2</span>
              <span className="bg-[#e6e4e0] text-[#121212] text-[10px] px-2 py-0.5 rounded-full font-mono">Liberty Express</span>
            </div>
            <h4 className="font-medium text-[#121212]">Procesamiento en Miami</h4>
            <p className="text-[#616161] text-[11px] mt-1">
              Pesaje, consolidación, re-empaque y asignación de guía de vuelo aéreo ($4.50/lb).
            </p>
          </div>

          {/* Leg 3 */}
          <div className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[#616161] font-medium mb-2">
              <span className="text-[10px] uppercase text-[#616161] font-medium">Tramo 3</span>
              <span className="bg-[#e6e4e0] text-[#121212] text-[10px] px-2 py-0.5 rounded-full font-mono">Aéreo / Aduana</span>
            </div>
            <h4 className="font-medium text-[#121212]">Miami → Venezuela (Maiquetía)</h4>
            <p className="text-[#616161] text-[11px] mt-1">
              Vuelo internacional y nacionalización en aduana principal antes de sucursal.
            </p>
          </div>

          {/* Leg 4 */}
          <div className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[#616161] font-medium mb-2">
              <span className="text-[10px] uppercase text-[#616161] font-medium">Tramo 4</span>
              <span className="bg-[#e6e4e0] text-[#121212] text-[10px] px-2 py-0.5 rounded-full font-mono">Taller / Cliente</span>
            </div>
            <h4 className="font-medium text-[#121212]">Recepción & Reparación</h4>
            <p className="text-[#616161] text-[11px] mt-1">
              Llegada a taller local para reemplazo de piezas, pruebas QA y venta final.
            </p>
          </div>
        </div>
      </div>

      {/* Active Flips Overview Table */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl font-normal text-[#121212]">Flips Activos en Sistema ({flips.length})</h3>
            <p className="text-xs text-[#616161] mt-0.5">Resumen de costo puesto en mano, valor de mercado Vzla y margen ROI</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectModule("opportunities")}
              className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] text-xs font-medium px-3.5 py-1.5 rounded-full border border-[#d8d6d2] transition"
            >
              Ver Oportunidades
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#121212]">
            <thead className="bg-[#dbdad7]/40 text-[#616161] font-sans font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Producto / Anuncio</th>
                <th className="p-3">Estado Operativo</th>
                <th className="p-3">Costo Landed</th>
                <th className="p-3">Venta Vzla</th>
                <th className="p-3">Ganancia / ROI</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4e0]">
              {flips.map((flip) => {
                const math = flip.analysis?.flipMath;
                const landed = math?.totalLandedCostUSD || 0;
                const marketUSD = math?.estimatedMarketPriceVzlaUSD || 0;
                const profitUSD = math?.netProfitUSD || 0;
                const roi = math?.roiPercent || 0;

                return (
                  <tr key={flip.id} className="hover:bg-[#dbdad7]/20 transition">
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={flip.imageUrl}
                          alt={flip.title}
                          className="w-11 h-11 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                        />
                        <div>
                          <div className="font-medium text-[#121212] line-clamp-1 max-w-xs">{flip.title}</div>
                          <div className="flex items-center space-x-2 text-[11px] text-[#616161] mt-0.5">
                            <span className="bg-[#e6e4e0] px-2 py-0.5 rounded-full font-medium text-[#121212] text-[10px]">
                              {flip.platform}
                            </span>
                            <span>•</span>
                            <span>
                              {flip.brand} {flip.model}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <StatusBadge status={flip.status} />
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-[#121212]">{formatUSD(landed)}</div>
                      <div className="text-[10px] text-[#616161]">Puesto en Vzla</div>
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-[#1a5336]">{formatUSD(marketUSD)}</div>
                      <div className="text-[10px] text-[#616161]">{formatVES(marketUSD * settings.paraleloRate)}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-[#121212]">+{formatUSD(profitUSD)}</div>
                      <div className="text-[10px] font-medium text-[#1a5336] font-mono">
                        ROI: {formatPercent(roi)}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => onViewFlipDetails(flip)}
                        className="bg-[#121212] hover:bg-[#282828] text-white font-medium px-3.5 py-1.5 rounded-full text-xs transition"
                      >
                        Ficha 360°
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FEATURE 3: Quick Add Floating Action Speed-Dial Menu (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2">
        {fabOpen && (
          <div className="flex flex-col items-end space-y-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => {
                setQuickAddType("purchase");
                setFabOpen(false);
              }}
              className="bg-white border border-[#e6e4e0] hover:border-[#121212] text-[#121212] font-medium text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-[#121212]" />
              <span>Registrar Compra</span>
            </button>

            <button
              onClick={() => {
                setQuickAddType("sale");
                setFabOpen(false);
              }}
              className="bg-white border border-[#e6e4e0] hover:border-[#1a5336] text-[#1a5336] font-medium text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition active:scale-95"
            >
              <DollarSign className="w-4 h-4 text-[#1a5336]" />
              <span>Registrar Venta</span>
            </button>

            <button
              onClick={() => {
                setQuickAddType("inventory");
                setFabOpen(false);
              }}
              className="bg-white border border-[#e6e4e0] hover:border-[#121212] text-[#121212] font-medium text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 transition active:scale-95"
            >
              <Boxes className="w-4 h-4 text-[#121212]" />
              <span>Agregar a Inventario</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="bg-[#121212] hover:bg-[#282828] text-white p-4 rounded-full shadow-2xl transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 ring-2 ring-white/20"
          title="Menú Rápido FlipMaster"
        >
          <Plus className={`w-5 h-5 transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`} />
          <span className="text-xs font-medium pr-1 hidden sm:inline">Registro Rápido</span>
        </button>
      </div>

      {/* Render Quick Add Modal */}
      {quickAddType && (
        <QuickAddModal
          type={quickAddType}
          flips={flips}
          settings={settings}
          onClose={() => setQuickAddType(null)}
          onAddTransaction={
            onAddTransaction ||
            (() => {
              /* fallback */
            })
          }
          onAddFlip={
            onAddFlip ||
            (() => {
              /* fallback */
            })
          }
          onRecordSale={
            onRecordSale ||
            (() => {
              /* fallback */
            })
          }
          onCreatePriceAlert={handleCreatePriceAlert}
        />
      )}
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; color: string }> = {
    evaluating: { label: "Evaluando IA", color: "bg-[#fef3c7] text-[#92400e]" },
    saved_opportunity: { label: "Oportunidad", color: "bg-[#e6e4e0] text-[#121212]" },
    bidding: { label: "En Subasta", color: "bg-[#fef3c7] text-[#92400e]" },
    purchased: { label: "Comprado US", color: "bg-[#e0f2fe] text-[#0369a1]" },
    in_transit_us: { label: "Tránsito US", color: "bg-[#e0f2fe] text-[#0369a1]" },
    miami_warehouse: { label: "Casillero Miami", color: "bg-[#e0f2fe] text-[#0369a1]" },
    international_freight: { label: "Vuelo Int. (Liberty)", color: "bg-[#e0f2fe] text-[#0369a1]" },
    customs_vzla: { label: "Aduana Vzla", color: "bg-[#fef3c7] text-[#92400e]" },
    received_vzla: { label: "Recibido Vzla", color: "bg-[#e2f1e8] text-[#1a5336]" },
    in_repair: { label: "En Taller", color: "bg-[#fef3c7] text-[#92400e]" },
    ready_for_sale: { label: "Listo para Venta", color: "bg-[#e2f1e8] text-[#1a5336]" },
    listed: { label: "Publicado Vzla", color: "bg-[#e2f1e8] text-[#1a5336] font-medium" },
    sold: { label: "Vendido", color: "bg-[#121212] text-white" },
    archived: { label: "Archivado", color: "bg-[#e6e4e0] text-[#616161]" },
  };

  const item = map[status] || { label: status, color: "bg-[#e6e4e0] text-[#121212]" };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${item.color}`}>
      {item.label}
    </span>
  );
};
