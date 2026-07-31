import React, { useState } from "react";
import { FlipItem, AppSettings } from "../../types";
import {
  BookmarkCheck,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Trash2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  FileText,
} from "lucide-react";
import { formatUSD, formatVES, formatPercent } from "../../lib/currency";
import { exportarNegocioPDF } from "../../lib/pdf";

interface OpportunitiesModuleProps {
  flips: FlipItem[];
  settings: AppSettings;
  onConvertToFlip: (flip: FlipItem) => void;
  onDeleteFlip: (id: string) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

export const OpportunitiesModule: React.FC<OpportunitiesModuleProps> = ({
  flips,
  settings,
  onConvertToFlip,
  onDeleteFlip,
  onViewFlipDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const opportunities = flips.filter(
    (f) => f.status === "saved_opportunity" || f.status === "evaluating" || f.status === "bidding"
  );

  const filtered = opportunities.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || f.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const toggleSelectForCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert("Puedes comparar un máximo de 3 oportunidades a la vez.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const compareItems = flips.filter((f) => selectedForCompare.includes(f.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <BookmarkCheck className="w-3.5 h-3.5 text-[#121212]" />
            <span>Pipeline de Oportunidades & Subastas Evaluadas</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Oportunidades Guardadas ({opportunities.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Listado de ofertas analizadas por FlipMaster pendientes de puja o aprobación de compra.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filtered.length > 0 && (
            <button
              onClick={() => exportarNegocioPDF(filtered, settings)}
              className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF ({filtered.length})</span>
            </button>
          )}
          {selectedForCompare.length > 0 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="bg-[#121212] text-white font-medium text-xs px-4 py-2 rounded-full shadow-none flex items-center space-x-2 transition"
            >
              <Scale className="w-3.5 h-3.5 text-white" />
              <span>Comparar ({selectedForCompare.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-4 shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#616161] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, marca, modelo..."
            className="w-full bg-white border border-[#e6e4e0] rounded-full pl-9 pr-3 py-1.5 text-xs text-[#121212] placeholder-[#616161] focus:outline-none focus:ring-1 focus:ring-[#121212]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === "all"
                ? "bg-[#121212] text-white"
                : "bg-[#e6e4e0] text-[#616161] hover:text-[#121212]"
            }`}
          >
            Todas ({opportunities.length})
          </button>
          <button
            onClick={() => setStatusFilter("saved_opportunity")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === "saved_opportunity"
                ? "bg-[#121212] text-white"
                : "bg-[#e6e4e0] text-[#616161] hover:text-[#121212]"
            }`}
          >
            Guardadas
          </button>
          <button
            onClick={() => setStatusFilter("bidding")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === "bidding"
                ? "bg-[#121212] text-white"
                : "bg-[#e6e4e0] text-[#616161] hover:text-[#121212]"
            }`}
          >
            En Puja
          </button>
        </div>
      </div>

      {/* Opportunities Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-12 text-center">
          <BookmarkCheck className="w-10 h-10 text-[#616161] mx-auto mb-3" />
          <h3 className="text-base font-serif font-normal text-[#121212]">No hay oportunidades guardadas</h3>
          <p className="text-xs text-[#616161] mt-1 font-sans">Analiza nuevos productos en el AI Analyzer para verlos registrados aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((flip) => {
            const math = flip.analysis?.flipMath;
            const verdict = flip.analysis?.finalVerdict;
            const isSelected = selectedForCompare.includes(flip.id);

            return (
              <div
                key={flip.id}
                className={`bg-white border rounded-lg p-5 shadow-none flex flex-col justify-between transition ${
                  isSelected ? "border-[#121212] ring-1 ring-[#121212]" : "border-[#e6e4e0]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <img
                      src={flip.imageUrl}
                      alt={flip.title}
                      className="w-14 h-14 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                    />

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleSelectForCompare(flip.id)}
                        className={`p-1.5 rounded-full text-xs font-medium border transition ${
                          isSelected
                            ? "bg-[#121212] text-white border-[#121212]"
                            : "bg-[#e6e4e0] text-[#616161] border-[#e6e4e0]"
                        }`}
                        title="Seleccionar para comparar"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteFlip(flip.id)}
                        className="p-1.5 rounded-full text-xs text-[#616161] hover:text-[#991b1b] hover:bg-[#dbdad7]/40 transition"
                        title="Eliminar oportunidad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#121212] bg-[#e6e4e0] px-2 py-0.5 rounded-full">
                      {flip.platform}
                    </span>
                    <h3 className="font-serif text-base font-normal text-[#121212] mt-1 line-clamp-2">{flip.title}</h3>
                  </div>

                  {/* Key Numbers */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                      <div className="text-[10px] text-[#616161] uppercase font-medium">Costo Landed</div>
                      <div className="font-bold text-[#121212]">{formatUSD(math?.totalLandedCostUSD || 0)}</div>
                    </div>

                    <div className="bg-[#dbdad7]/30 p-2.5 rounded-lg border border-[#e6e4e0]">
                      <div className="text-[10px] text-[#616161] uppercase font-medium">Venta Est. Vzla</div>
                      <div className="font-bold text-[#1a5336]">{formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</div>
                    </div>
                  </div>

                  <div className="mt-2 bg-[#dbdad7]/20 p-2.5 rounded-lg border border-[#e6e4e0] flex items-center justify-between text-xs">
                    <span className="text-[#616161] font-medium">Ganancia Proyectada:</span>
                    <span className="font-bold text-[#121212]">+{formatUSD(math?.netProfitUSD || 0)} ({formatPercent(math?.roiPercent || 0)})</span>
                  </div>

                  {verdict && (
                    <div className="mt-3 text-[11px] text-[#616161] bg-[#dbdad7]/20 p-2.5 rounded-lg border border-[#e6e4e0]">
                      <strong className="text-[#121212] block mb-0.5">Veredicto FlipMaster:</strong>
                      <p className="line-clamp-2 font-sans">{verdict.summaryExplanation}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#e6e4e0] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewFlipDetails(flip)}
                    className="text-xs font-medium text-[#616161] hover:text-[#121212] transition"
                  >
                    Ver Ficha
                  </button>

                  <button
                    onClick={() => onConvertToFlip(flip)}
                    className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition flex items-center space-x-1"
                  >
                    <span>Comprar / Activar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e6e4e0] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl text-[#121212]">
            <div className="flex items-center justify-between border-b border-[#e6e4e0] pb-4">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-[#121212]" />
                <h3 className="text-lg font-serif font-normal text-[#121212]">Matriz Comparativa de Oportunidades</h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-[#616161] hover:text-[#121212] text-xs font-medium"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compareItems.map((item) => {
                const math = item.analysis?.flipMath;
                const rest = item.analysis?.restorationCost;

                return (
                  <div key={item.id} className="bg-[#dbdad7]/20 border border-[#e6e4e0] rounded-lg p-4 space-y-3 text-xs">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover rounded-lg border border-[#e6e4e0]" />
                    <h4 className="font-serif font-normal text-sm text-[#121212] line-clamp-2">{item.title}</h4>

                    <div className="space-y-1.5 pt-2 border-t border-[#e6e4e0]">
                      <div className="flex justify-between text-[#616161]">
                        <span>Costo Base Anuncio:</span>
                        <span className="font-mono text-[#121212] font-medium">{formatUSD(math?.basePriceUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#616161]">
                        <span>Flete Miami → Vzla:</span>
                        <span className="font-mono text-[#121212] font-medium">{formatUSD(math?.totalShippingUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#616161]">
                        <span>Presupuesto Taller:</span>
                        <span className="font-mono text-[#121212] font-medium">{formatUSD(rest?.pessimisticCostUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#121212] pt-1 border-t border-[#e6e4e0]">
                        <span>Total Landed:</span>
                        <span className="font-mono">{formatUSD(math?.totalLandedCostUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#616161]">
                        <span>Reventa Vzla:</span>
                        <span className="font-mono text-[#1a5336] font-bold">{formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#1a5336] pt-1 border-t border-[#e6e4e0]">
                        <span>Ganancia Neta:</span>
                        <span className="font-mono">{formatUSD(math?.netProfitUSD || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#121212]">
                        <span>ROI Proyectado:</span>
                        <span className="font-mono">{formatPercent(math?.roiPercent || 0)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowCompareModal(false);
                        onConvertToFlip(item);
                      }}
                      className="w-full bg-[#121212] hover:bg-[#282828] text-white font-medium py-2 rounded-full text-xs transition shadow-none"
                    >
                      Elegir & Comprar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
