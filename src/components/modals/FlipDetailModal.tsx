import React, { useState } from "react";
import { FlipItem, AppSettings } from "../../types";
import {
  X,
  Sparkles,
  Truck,
  Wrench,
  Tag,
  History,
  ExternalLink,
} from "lucide-react";
import { formatUSD, formatVES, formatPercent } from "../../lib/currency";

interface FlipDetailModalProps {
  flip: FlipItem | null;
  settings: AppSettings;
  onClose: () => void;
}

export const FlipDetailModal: React.FC<FlipDetailModalProps> = ({ flip, settings, onClose }) => {
  if (!flip) return null;

  const [activeTab, setActiveTab] = useState<"summary" | "ai" | "logistics" | "repair" | "sale" | "audit">("summary");

  const math = flip.analysis?.flipMath;
  const verdict = flip.analysis?.finalVerdict;

  return (
    <div className="fixed inset-0 bg-[#121212]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#dbdad7] border border-[#e6e4e0] rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-none overflow-hidden text-[#121212]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e6e4e0] flex items-start justify-between gap-4 bg-white">
          <div className="flex items-center space-x-4">
            <img
              src={flip.imageUrl}
              alt={flip.title}
              className="w-16 h-16 rounded-md object-cover border border-[#e6e4e0] bg-[#dbdad7]/20 shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#121212] bg-[#e6e4e0] px-2 py-0.5 rounded-full">
                  {flip.platform}
                </span>
                <span className="text-[10px] font-mono text-[#616161] uppercase">{flip.category}</span>
              </div>
              <h2 className="text-xl font-serif font-normal text-[#121212] mt-1 line-clamp-1">{flip.title}</h2>
              <div className="text-xs text-[#616161] mt-0.5 font-mono">
                ID: {flip.id} • Estado: <span className="text-[#121212] font-semibold">{flip.status}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#616161] hover:text-[#121212] hover:bg-[#e6e4e0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex items-center border-b border-[#e6e4e0] bg-white px-6 space-x-1 overflow-x-auto shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab("summary")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "summary"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            Resumen 360°
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1 ${
              activeTab === "ai"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Análisis AI</span>
          </button>

          <button
            onClick={() => setActiveTab("logistics")}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1 ${
              activeTab === "logistics"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Tránsito & Courier</span>
          </button>

          <button
            onClick={() => setActiveTab("repair")}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1 ${
              activeTab === "repair"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Taller</span>
          </button>

          <button
            onClick={() => setActiveTab("sale")}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1 ${
              activeTab === "sale"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Venta & Garantía</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-4 border-b-2 transition flex items-center space-x-1 ${
              activeTab === "audit"
                ? "border-[#121212] text-[#121212]"
                : "border-transparent text-[#616161] hover:text-[#121212]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trazabilidad</span>
          </button>
        </div>

        {/* Modal Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Financial Dashboard Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-lg border border-[#e6e4e0]">
                  <div className="text-[10px] text-[#616161] uppercase font-medium">Costo Compra USD</div>
                  <div className="text-base font-serif font-normal text-[#121212]">{formatUSD(math?.basePriceUSD || 0)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#e6e4e0]">
                  <div className="text-[10px] text-[#616161] uppercase font-medium">Costo Total Landed</div>
                  <div className="text-base font-serif font-normal text-[#121212]">{formatUSD(math?.totalLandedCostUSD || 0)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#e6e4e0]">
                  <div className="text-[10px] text-[#616161] uppercase font-medium">Precio Venta Vzla</div>
                  <div className="text-base font-serif font-normal text-[#1a5336]">{formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</div>
                  <div className="text-[10px] font-mono text-[#616161]">{formatVES((math?.estimatedMarketPriceVzlaUSD || 0) * settings.paraleloRate)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#e6e4e0]">
                  <div className="text-[10px] text-[#616161] uppercase font-medium">ROI Proyectado</div>
                  <div className="text-base font-mono font-bold text-[#1a5336]">{formatPercent(math?.roiPercent || 0)}</div>
                </div>
              </div>

              {/* Verdict Summary */}
              {verdict && (
                <div className="bg-white border border-[#e6e4e0] rounded-lg p-4 text-xs space-y-1">
                  <div className="text-[#616161] font-medium uppercase tracking-wider text-[10px]">Diagnóstico FlipMaster</div>
                  <h4 className="text-sm font-serif font-normal text-[#121212]">{verdict.decision}</h4>
                  <p className="text-[#616161] leading-relaxed mt-1 font-sans">{verdict.summaryExplanation}</p>
                </div>
              )}

              {/* Source Listing Info */}
              <div className="bg-white border border-[#e6e4e0] rounded-lg p-4 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#616161] font-medium uppercase text-[10px]">Enlace del Anuncio Original</span>
                  {flip.sourceUrl && (
                    <a
                      href={flip.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#121212] hover:underline font-medium flex items-center space-x-1"
                    >
                      <span>Abrir en {flip.platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-[#616161] line-clamp-3 bg-[#dbdad7]/20 p-2.5 rounded-lg border border-[#e6e4e0] font-sans">
                  {flip.sourceDescription || "Sin descripción adicional."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "ai" && flip.analysis && (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-4 rounded-lg border border-[#e6e4e0]">
                <h4 className="font-serif text-base font-normal text-[#121212] mb-2">Estrategia de Puja Recomendada</h4>
                <div className="space-y-1 text-[#616161]">
                  <div>Puja Máxima Absoluta: <strong className="text-[#121212] font-mono">{formatUSD(flip.analysis.auctionStrategy?.maxAbsoluteBidUSD || 0)}</strong></div>
                  <div>Táctica: <strong className="text-[#121212]">{flip.analysis.auctionStrategy?.suggestedTactic}</strong></div>
                  <p className="text-[#616161] mt-2 italic font-sans">{flip.analysis.auctionStrategy?.edgeNotes}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logistics" && (
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-lg border border-[#e6e4e0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#616161]">Tracking US (FedEx/UPS):</span>
                  <span className="font-mono text-[#121212] font-bold">{flip.logistics?.trackingUS || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161]">Guía Liberty Express:</span>
                  <span className="font-mono text-[#121212] font-bold">{flip.logistics?.trackingNumber || "Pendiente — llega a Miami"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161]">Peso Registrado:</span>
                  <span className="font-mono text-[#121212] font-semibold">{flip.logistics?.weightLbs} lbs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161]">Estado Tramo:</span>
                  <span className="text-[#121212] font-medium">{flip.logistics?.carrierStatusText}</span>
                </div>
                {flip.logistics?.statusNote && (
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Nota / Alerta:</span>
                    <span className="text-[#121212] font-medium max-w-[220px] text-right">{flip.logistics.statusNote}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "repair" && (
            <div className="space-y-3 text-xs">
              <div className="bg-white p-4 rounded-lg border border-[#e6e4e0] space-y-2">
                <h4 className="font-serif text-sm font-normal text-[#121212]">Detalle de Taller & Diagnóstico</h4>
                <div className="text-[#616161]">Técnico Asignado: {flip.repair?.assignedTechnician || "Taller Maracay"}</div>
                <div className="text-[#616161]">Costo Repuestos: {formatUSD(flip.repair?.actualPartsCostUSD || 0)}</div>
              </div>
            </div>
          )}

          {activeTab === "sale" && (
            <div className="space-y-3 text-xs">
              {flip.sale ? (
                <div className="bg-white p-4 rounded-lg border border-[#e6e4e0] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Comprador:</span>
                    <span className="font-medium text-[#121212]">{flip.sale.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Precio Venta USD:</span>
                    <span className="font-bold text-[#1a5336]">{formatUSD(flip.sale.salePriceUSD)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Canal Venta:</span>
                    <span className="text-[#121212] font-medium">{flip.sale.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#616161]">Garantía Vigente:</span>
                    <span className="text-[#1a5336] font-medium">{flip.sale.warrantyDays} Días</span>
                  </div>
                </div>
              ) : (
                <div className="text-[#616161] italic text-center py-6 font-sans">Equipo aún no vendido.</div>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-3 text-xs">
              {flip.timeline?.map((t) => (
                <div key={t.id} className="bg-white p-3 rounded-lg border border-[#e6e4e0]">
                  <div className="text-[10px] font-mono text-[#616161]">{new Date(t.timestamp).toLocaleString("es-VE")}</div>
                  <div className="font-serif text-sm font-normal text-[#121212] mt-0.5">{t.title}</div>
                  <div className="text-[#616161] text-[11px] mt-0.5 font-sans">{t.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
