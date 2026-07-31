import React from "react";
import { FlipItem, AppSettings } from "../../types";
import {
  Boxes,
  Tag,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { formatUSD, formatVES } from "../../lib/currency";

interface InventoryModuleProps {
  flips: FlipItem[];
  settings: AppSettings;
  onPublishForSale: (flipId: string) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
  onOpenAnalyzer?: () => void;
}

export interface SmartRestockSuggestion {
  category: string;
  avgDaysToSell: number;
  currentStock: number;
  monthlyVelocity: number;
  recommendedReplenish: number;
  urgency: "Crítico" | "Sugerido" | "Suficiente";
  reason: string;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  flips,
  settings,
  onPublishForSale,
  onViewFlipDetails,
  onOpenAnalyzer,
}) => {
  const inventoryItems = flips.filter(
    (f) => f.status === "ready_for_sale" || f.status === "listed" || f.inventory
  );

  // Calculate Smart Restock Velocity Data by Category
  const categories = [
    { name: "Laptops & MacBooks", defaultVelocity: 3.5, defaultAvgDays: 4.2 },
    { name: "Consolas & Gaming", defaultVelocity: 5.0, defaultAvgDays: 3.0 },
    { name: "Smartphones", defaultVelocity: 2.0, defaultAvgDays: 6.5 },
    { name: "Componentes PC", defaultVelocity: 1.5, defaultAvgDays: 8.0 },
  ];

  const restockSuggestions: SmartRestockSuggestion[] = categories.map((cat) => {
    const currentStockCount = inventoryItems.filter(
      (f) => f.category === cat.name || (cat.name.includes("MacBooks") && f.title.toLowerCase().includes("macbook"))
    ).length;

    let urgency: "Crítico" | "Sugerido" | "Suficiente" = "Suficiente";
    let recommendedReplenish = 0;
    let reason = "Stock equilibrado para la demanda estimada.";

    if (currentStockCount === 0) {
      urgency = "Crítico";
      recommendedReplenish = 3;
      reason = `Agotado. Rotación rápida promedio de ${cat.defaultAvgDays} días por unidad.`;
    } else if (currentStockCount <= 1 && cat.defaultAvgDays < 5) {
      urgency = "Crítico";
      recommendedReplenish = 2;
      reason = `Queda solo 1 unidad. Alta velocidad de venta (${cat.defaultAvgDays} días promedio).`;
    } else if (currentStockCount <= 2) {
      urgency = "Sugerido";
      recommendedReplenish = 2;
      reason = `Nivel bajo. Se sugiere reponer stock preventivamente.`;
    }

    return {
      category: cat.name,
      avgDaysToSell: cat.defaultAvgDays,
      currentStock: currentStockCount,
      monthlyVelocity: cat.defaultVelocity,
      recommendedReplenish,
      urgency,
      reason,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Boxes className="w-3.5 h-3.5 text-[#121212]" />
            <span>Inventario Probado & Reacondicionado en Venezuela</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">
            Stock Proprobado ({inventoryItems.length})
          </h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Equipos reparados, testeados en QA y etiquetados con SKU físico en estantes de Caracas, Maracay y Valencia listos para venta.
          </p>
        </div>
      </div>

      {/* FEATURE 4: Smart Restock Indicator Section */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-[#616161] font-medium">
              <Zap className="w-3.5 h-3.5 text-[#121212]" />
              <span>Algoritmo de Rotación de Ventas • Smart Restock</span>
            </div>
            <h3 className="font-serif text-xl font-normal text-[#121212] mt-0.5">
              Indicador de Reposición Inteligente
            </h3>
            <p className="text-xs text-[#616161]">
              Sugerencias de compra automática basadas en velocidad de salida de inventario y stock mínimo recomendado
            </p>
          </div>

          <button
            onClick={onOpenAnalyzer}
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Buscar Ofertas eBay</span>
          </button>
        </div>

        {/* Restock Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {restockSuggestions.map((sug, idx) => {
            const isCritical = sug.urgency === "Crítico";
            const isSuggested = sug.urgency === "Sugerido";

            return (
              <div
                key={idx}
                className={`border rounded-lg p-4 flex flex-col justify-between transition ${
                  isCritical
                    ? "bg-[#fef2f2]/60 border-[#fecaca]"
                    : isSuggested
                    ? "bg-[#fef3c7]/40 border-[#fde68a]"
                    : "bg-[#dbdad7]/20 border-[#e6e4e0]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-xs text-[#121212] truncate max-w-[130px]">
                      {sug.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? "bg-[#fecaca] text-[#991b1b]"
                          : isSuggested
                          ? "bg-[#fde68a] text-[#92400e]"
                          : "bg-[#e2f1e8] text-[#1a5336]"
                      }`}
                    >
                      {sug.urgency}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs border-t border-b border-[#e6e4e0] py-2">
                    <div>
                      <span className="text-[10px] text-[#616161] block">Stock Actual</span>
                      <span className="font-bold text-[#121212] font-mono text-sm">{sug.currentStock} unid.</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#616161] block">Velocidad Salida</span>
                      <span className="font-medium text-[#1a5336] font-mono text-sm">{sug.avgDaysToSell} días/vta</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#616161] mt-2 line-clamp-2">{sug.reason}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-[#e6e4e0] flex items-center justify-between text-xs">
                  {sug.recommendedReplenish > 0 ? (
                    <span className="text-[11px] font-medium text-[#991b1b]">
                      Reponer +{sug.recommendedReplenish} unid.
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#1a5336]">Stock Óptimo</span>
                  )}

                  <button
                    onClick={onOpenAnalyzer}
                    className="text-[10px] bg-[#121212] hover:bg-[#282828] text-white px-2.5 py-1 rounded-full font-medium transition"
                  >
                    Evaluar Lote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#121212]">
            <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-lg">SKU / Producto</th>
                <th className="p-3">Ubicación Física</th>
                <th className="p-3">Grado Cosmético</th>
                <th className="p-3">Precio Objetivo USD</th>
                <th className="p-3">Precio en VES</th>
                <th className="p-3 text-right rounded-r-lg">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4e0]">
              {inventoryItems.map((flip) => {
                const inv = flip.inventory;
                const targetUSD = inv?.targetPriceUSD || flip.analysis?.flipMath.estimatedMarketPriceVzlaUSD || 0;
                const targetVES = targetUSD * settings.paraleloRate;

                return (
                  <tr key={flip.id} className="hover:bg-[#dbdad7]/20 transition">
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={flip.imageUrl}
                          alt={flip.title}
                          className="w-12 h-12 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                        />
                        <div>
                          <div className="font-mono text-[10px] text-[#616161] font-semibold">
                            {inv?.sku || `SKU-${flip.id}`}
                          </div>
                          <div className="font-serif text-sm font-normal text-[#121212] line-clamp-1 max-w-xs">
                            {flip.title}
                          </div>
                          <div className="text-[10px] text-[#616161]">
                            S/N: {inv?.serialNumber || "Verificado en QA"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-medium text-[#121212]">
                      <div className="flex items-center space-x-1 text-[#121212]">
                        <MapPin className="w-3.5 h-3.5 text-[#121212] shrink-0" />
                        <span>{inv?.physicalLocationTag || "Vitrina Maracay"}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="bg-[#e6e4e0] text-[#121212] font-medium px-2 py-0.5 rounded-full text-xs">
                        Grado {inv?.conditionGrade || "A"}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-[#1a5336] text-sm">{formatUSD(targetUSD)}</td>

                    <td className="p-3 font-mono text-[#616161]">{formatVES(targetVES)}</td>

                    <td className="p-3 text-right">
                      {flip.status === "listed" ? (
                        <span className="bg-[#e6e4e0] text-[#121212] font-medium text-xs px-3 py-1.5 rounded-full inline-block">
                          Publicado Vzla
                        </span>
                      ) : (
                        <button
                          onClick={() => onPublishForSale(flip.id)}
                          className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition flex items-center space-x-1 ml-auto shadow-none"
                        >
                          <span>Publicar Venta</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
