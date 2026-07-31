import React, { useState } from "react";
import { FlipItem, PartOrder } from "../../types";
import { Wrench, CheckSquare, PlusCircle, AlertCircle, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { formatUSD } from "../../lib/currency";

interface RepairsModuleProps {
  flips: FlipItem[];
  onAddPartOrder: (flipId: string, part: Omit<PartOrder, "id">) => void;
  onCompleteRepair: (flipId: string) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

export const RepairsModule: React.FC<RepairsModuleProps> = ({
  flips,
  onAddPartOrder,
  onCompleteRepair,
  onViewFlipDetails,
}) => {
  const inRepair = flips.filter(
    (f) => f.status === "in_repair" || f.status === "received_vzla" || f.repair?.repairStatus !== "completed"
  );

  const [selectedFlipId, setSelectedFlipId] = useState("");
  const [partName, setPartName] = useState("");
  const [partCostUSD, setPartCostUSD] = useState("");
  const [partSource, setPartSource] = useState("AliExpress");

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlipId || !partName) return;

    onAddPartOrder(selectedFlipId, {
      name: partName,
      costUSD: parseFloat(partCostUSD) || 0,
      source: partSource,
      status: "ordered",
    });

    setPartName("");
    setPartCostUSD("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5 text-[#121212]" />
            <span>Módulo de Taller, Micro-soldadura & Mantenimiento</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Reparaciones en Curso ({inRepair.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Control de diagnóstico de fallas, pedido de repuestos (iFixit, AliExpress, eBay), montaje técnico y protocolo de pruebas de calidad (QA).
          </p>
        </div>
      </div>

      {/* Repair Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inRepair.map((flip) => {
          const rep = flip.repair;
          const parts = rep?.partsList || [];

          return (
            <div key={flip.id} className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={flip.imageUrl}
                    alt={flip.title}
                    className="w-12 h-12 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                  />
                  <div>
                    <h3 className="font-serif text-base font-normal text-[#121212] line-clamp-1">{flip.title}</h3>
                    <div className="text-[11px] text-[#616161]">
                      Técnico: <strong className="text-[#121212]">{rep?.assignedTechnician || "Taller Maracay"}</strong> • Dificultad: <strong className="text-[#121212]">{rep?.difficulty || "Media"}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onViewFlipDetails(flip)}
                  className="text-xs text-[#121212] hover:underline font-medium shrink-0"
                >
                  Ficha
                </button>
              </div>

              {/* Diagnosed Defects */}
              {rep?.diagnosedDefects && rep.diagnosedDefects.length > 0 && (
                <div className="bg-[#dbdad7]/30 p-3 rounded-lg border border-[#e6e4e0] text-xs space-y-1">
                  <span className="text-[10px] text-[#616161] uppercase font-medium">Diagnóstico In-Situ:</span>
                  <ul className="space-y-1 text-[#121212] text-[11px]">
                    {rep.diagnosedDefects.map((d, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <span className="text-[#121212] font-bold">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parts List */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#616161] uppercase tracking-wider">Repuestos Requeridos ({parts.length})</span>
                {parts.length === 0 ? (
                  <div className="text-[11px] text-[#616161] italic bg-[#dbdad7]/20 p-2 rounded-lg border border-[#e6e4e0]">
                    No hay repuestos registrados aún.
                  </div>
                ) : (
                  parts.map((p) => (
                    <div key={p.id} className="bg-[#dbdad7]/20 p-2.5 rounded-lg border border-[#e6e4e0] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#121212]">{p.name}</div>
                        <div className="text-[10px] text-[#616161]">{p.source}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#121212]">{formatUSD(p.costUSD)}</div>
                        <span className="text-[10px] bg-[#e6e4e0] text-[#121212] font-medium px-2 py-0.5 rounded-full">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-[#e6e4e0] flex items-center justify-between">
                <div className="text-xs text-[#616161]">
                  Gasto Repuestos: <strong className="text-[#121212]">{formatUSD(rep?.actualPartsCostUSD || 0)}</strong>
                </div>

                <button
                  onClick={() => onCompleteRepair(flip.id)}
                  className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-3.5 py-2 rounded-full transition flex items-center space-x-1.5 shadow-none"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprobar QA & Mover a Inventario</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Spare Part Order Form */}
      <form onSubmit={handleAddPart} className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
          <PlusCircle className="w-4 h-4 text-[#121212]" />
          <span>Registrar Orden de Repuesto para Taller</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Seleccionar Flip</label>
            <select
              value={selectedFlipId}
              onChange={(e) => setSelectedFlipId(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="">-- Selecciona equipo en taller --</option>
              {inRepair.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Nombre del Repuesto</label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="Ej: Display Retina A2337 OEM"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Costo Repuesto (USD)</label>
            <input
              type="number"
              step="0.01"
              value={partCostUSD}
              onChange={(e) => setPartCostUSD(e.target.value)}
              placeholder="110.00"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Proveedor / Origen</label>
            <select
              value={partSource}
              onChange={(e) => setPartSource(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="AliExpress">AliExpress (Delivery Express)</option>
              <option value="iFixit">iFixit Official Parts</option>
              <option value="eBay US">eBay US Componentes</option>
              <option value="Stock Local Vzla">Stock Local Taller Vzla</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-5 py-2 rounded-full transition shadow-none"
          >
            Añadir Repuesto a la Ficha
          </button>
        </div>
      </form>
    </div>
  );
};
