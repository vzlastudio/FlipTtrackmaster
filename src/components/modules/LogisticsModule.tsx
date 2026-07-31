import React, { useState } from "react";
import { FlipItem, AppSettings } from "../../types";
import { Truck, MapPin, Package, Clock, ExternalLink, AlertCircle, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { formatUSD } from "../../lib/currency";

interface LogisticsModuleProps {
  flips: FlipItem[];
  settings: AppSettings;
  onUpdateLogisticsStatus: (flipId: string, leg: 1 | 2 | 3 | 4, statusText: string, trackingNum?: string) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

export const LogisticsModule: React.FC<LogisticsModuleProps> = ({
  flips,
  settings,
  onUpdateLogisticsStatus,
  onViewFlipDetails,
}) => {
  const activeCourier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];

  const inLogistics = flips.filter((f) =>
    ["purchased", "in_transit_us", "miami_warehouse", "international_freight", "customs_vzla", "received_vzla"].includes(f.status)
  );

  const [selectedFlipId, setSelectedFlipId] = useState("");
  const [newLeg, setNewLeg] = useState<1 | 2 | 3 | 4>(2);
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlipId) return;
    onUpdateLogisticsStatus(selectedFlipId, newLeg, statusNote, trackingNumber);
    setSelectedFlipId("");
    setStatusNote("");
    setTrackingNumber("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-[#121212]" />
              <span>Control de Tránsito Multi-Etapa • Casillero Miami → Venezuela</span>
            </div>
            <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Tránsito & Logística Internacional</h2>
            <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
              Monitoreo de guías en Liberty Express, pesaje en Doral (FL), vuelo aéreo, desaduanamiento en Maiquetía y traslado a sucursal.
            </p>
          </div>

          <div className="bg-[#dbdad7]/30 border border-[#e6e4e0] rounded-lg p-3 text-xs space-y-1 shrink-0">
            <div className="text-[10px] text-[#616161] font-medium uppercase">Dirección Casillero Miami</div>
            <div className="font-mono text-[#121212] text-[11px] font-bold">{activeCourier.addressCasilleroMiami}</div>
          </div>
        </div>
      </div>

      {/* Active Packages in Transit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inLogistics.map((flip) => {
          const leg = flip.logistics?.currentLeg || 1;
          const tracking = flip.logistics?.trackingNumber || "Sin Guía Liberty";

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
                      Weight: <strong className="text-[#121212]">{flip.logistics?.weightLbs || 3.5} lbs</strong> • Freight: <strong className="text-[#121212]">{formatUSD(flip.logistics?.freightCostUSD || 20)}</strong>
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

              {/* Leg Stepper */}
              <div className="grid grid-cols-4 gap-1 text-center pt-2">
                <div className={`p-2 rounded-lg border text-[10px] font-medium ${leg >= 1 ? "bg-[#e6e4e0] text-[#121212] border-[#121212]" : "bg-[#dbdad7]/20 text-[#616161] border-[#e6e4e0]"}`}>
                  1. US Freight
                </div>
                <div className={`p-2 rounded-lg border text-[10px] font-medium ${leg >= 2 ? "bg-[#e6e4e0] text-[#121212] border-[#121212]" : "bg-[#dbdad7]/20 text-[#616161] border-[#e6e4e0]"}`}>
                  2. Doral FL
                </div>
                <div className={`p-2 rounded-lg border text-[10px] font-medium ${leg >= 3 ? "bg-[#e6e4e0] text-[#121212] border-[#121212]" : "bg-[#dbdad7]/20 text-[#616161] border-[#e6e4e0]"}`}>
                  3. Vuelo Int.
                </div>
                <div className={`p-2 rounded-lg border text-[10px] font-medium ${leg >= 4 ? "bg-[#e6e4e0] text-[#121212] border-[#121212]" : "bg-[#dbdad7]/20 text-[#616161] border-[#e6e4e0]"}`}>
                  4. Vzla Taller
                </div>
              </div>

              <div className="bg-[#dbdad7]/30 p-3 rounded-lg border border-[#e6e4e0] text-xs space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-[#616161]">Guía Liberty Express:</span>
                  <a
                    href={`${activeCourier.trackingBaseUrl}${tracking}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#121212] hover:underline font-bold flex items-center space-x-1"
                  >
                    <span>{tracking}</span>
                    <ExternalLink className="w-3 h-3 text-[#121212]" />
                  </a>
                </div>

                <div className="text-[#121212] text-[11px] pt-1 border-t border-[#e6e4e0]">
                  <strong className="text-[#616161]">Estado Actual:</strong> {flip.logistics?.carrierStatusText || "En tránsito normal"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Update Tracking Modal Form */}
      <form onSubmit={handleUpdate} className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
          <Truck className="w-4 h-4 text-[#121212]" />
          <span>Actualizar Tramo Logístico & Guía Courier</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Seleccionar Flip</label>
            <select
              value={selectedFlipId}
              onChange={(e) => setSelectedFlipId(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="">-- Elige un flip en tránsito --</option>
              {inLogistics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Tramo Actual</label>
            <select
              value={newLeg}
              onChange={(e) => setNewLeg(Number(e.target.value) as any)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value={1}>1 - Vendedor → Casillero Miami</option>
              <option value={2}>2 - Recibido & Procesado en Miami</option>
              <option value={3}>3 - Vuelo Internacional Miami → Caracas</option>
              <option value={4}>4 - Recibido en Sucursal / Taller Venezuela</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Número de Guía (Liberty / FedEx)</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ej: LIB-9910482-VZ"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#616161] mb-1">Notas de Estado / Alerta</label>
          <input
            type="text"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Ej: Paquete desaduanado en Maiquetía. En camino a sucursal Maracay..."
            className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-5 py-2 rounded-full transition shadow-none"
          >
            Actualizar Estado Logístico
          </button>
        </div>
      </form>
    </div>
  );
};
