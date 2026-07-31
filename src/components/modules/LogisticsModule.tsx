import React, { useState } from "react";
import { FlipItem, AppSettings } from "../../types";
import { Truck, ExternalLink, X, CheckCircle2, Clock, Pencil, Package, MapPin, Plane, Home } from "lucide-react";
import { formatUSD } from "../../lib/currency";

interface LogisticsPatch {
  statusText?: string;
  trackingUS?: string;
  trackingNumber?: string;
  arrivedMiamiDate?: string;
  arrivedVzlaDate?: string;
  warehouseLocationVzla?: string;
}

interface LogisticsModuleProps {
  flips: FlipItem[];
  settings: AppSettings;
  onUpdateLogisticsStatus: (flipId: string, leg: 1 | 2 | 3 | 4, patch?: LogisticsPatch) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

const LEGS: { n: 1 | 2 | 3 | 4; label: string; desc: string }[] = [
  { n: 1, label: "1. US Freight", desc: "Vendedor → Casillero Miami" },
  { n: 2, label: "2. Doral FL", desc: "Recibido & procesado en Miami" },
  { n: 3, label: "3. Vuelo Int.", desc: "Miami → Caracas" },
  { n: 4, label: "4. Vzla Taller", desc: "Sucursal / Taller Venezuela" },
];

const STEP_ICONS = [Package, MapPin, Plane, Home];

// Campo contextual que se pide al hacer clic en cada paso
const STEP_FIELD_LABEL: Record<number, string> = {
  1: "Tracking de EE.UU. (FedEx / UPS / USPS)",
  2: "Fecha de llegada a Miami",
  3: "Guía de Liberty Express",
  4: "Sucursal / ubicación en Venezuela",
};

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

  // ---- Modal por producto ----
  const [selectedFlipId, setSelectedFlipId] = useState<string | null>(null);
  const [activeLeg, setActiveLeg] = useState<1 | 2 | 3 | 4>(1);
  const [draft, setDraft] = useState({
    trackingUS: "",
    trackingNumber: "",
    arrivedMiamiDate: "",
    arrivedVzlaDate: "",
    warehouseLocationVzla: "",
    statusText: "",
  });

  const selectedFlip = inLogistics.find((f) => f.id === selectedFlipId) || null;

  const openModal = (flip: FlipItem) => {
    setSelectedFlipId(flip.id);
    setActiveLeg(flip.logistics?.currentLeg || 1);
    setDraft({
      trackingUS: flip.logistics?.trackingUS || "",
      trackingNumber: flip.logistics?.trackingNumber || "",
      arrivedMiamiDate: flip.logistics?.arrivedMiamiDate || "",
      arrivedVzlaDate: flip.logistics?.arrivedVzlaDate || "",
      warehouseLocationVzla: flip.logistics?.warehouseLocationVzla || "",
      statusText: flip.logistics?.carrierStatusText || "",
    });
  };

  const closeModal = () => setSelectedFlipId(null);

  const saveUpdate = () => {
    if (!selectedFlip) return;
    onUpdateLogisticsStatus(selectedFlip.id, activeLeg, {
      trackingUS: draft.trackingUS.trim(),
      trackingNumber: draft.trackingNumber.trim(),
      arrivedMiamiDate: draft.arrivedMiamiDate,
      arrivedVzlaDate: draft.arrivedVzlaDate,
      warehouseLocationVzla: draft.warehouseLocationVzla.trim(),
      statusText: draft.statusText.trim(),
    });
    closeModal();
  };

  const counts = [1, 2, 3, 4].map((leg) => inLogistics.filter((f) => (f.logistics?.currentLeg || 1) === leg).length);

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

      {/* Resumen por etapa (fila compacta para escaneo rápido) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEGS.map((leg, idx) => {
          const Icon = STEP_ICONS[idx];
          return (
            <div key={leg.n} className="bg-white border border-[#e6e4e0] rounded-lg p-3 flex items-center space-x-3 shadow-none">
              <div className="w-8 h-8 rounded-lg bg-[#dbdad7]/40 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#121212]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-[#616161] uppercase tracking-wider font-medium truncate">{leg.label}</div>
                <div className="font-serif text-lg font-normal text-[#121212] leading-tight">{counts[idx]}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de paquetes en tránsito */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#121212]">
            <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-lg">Producto</th>
                <th className="p-3">Etapa Actual</th>
                <th className="p-3">Tracking US</th>
                <th className="p-3">Tracking Internacional (Liberty)</th>
                <th className="p-3 text-right rounded-r-lg">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4e0]">
              {inLogistics.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#616161]">
                    <Package className="w-6 h-6 text-[#616161] mx-auto mb-2" />
                    Sin paquetes en tránsito. Compra o registra un flip para comenzar el seguimiento.
                  </td>
                </tr>
              )}

              {inLogistics.map((flip) => {
                const leg = flip.logistics?.currentLeg || 1;
                const trackingUS = flip.logistics?.trackingUS;
                const trackingLib = flip.logistics?.trackingNumber;
                const libertyPending = leg < 2;

                return (
                  <tr key={flip.id} className="hover:bg-[#dbdad7]/20 transition">
                    {/* Producto */}
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={flip.imageUrl}
                          alt={flip.title}
                          className="w-12 h-12 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                        />
                        <div>
                          <div className="font-serif text-sm font-normal text-[#121212] line-clamp-1 max-w-[200px]">
                            {flip.title}
                          </div>
                          <div className="text-[10px] text-[#616161]">
                            Peso: <strong className="text-[#121212]">{flip.logistics?.weightLbs || 3.5} lbs</strong> • Flete:{" "}
                            <strong className="text-[#121212]">{formatUSD(flip.logistics?.freightCostUSD || 20)}</strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Etapa actual (mini stepper de 4 segmentos) */}
                    <td className="p-3">
                      <div className="flex items-center space-x-1 mb-1.5">
                        {LEGS.map((l) => (
                          <div
                            key={l.n}
                            className={`h-1.5 flex-1 rounded-full ${leg >= l.n ? "bg-[#121212]" : "bg-[#dbdad7]"}`}
                            title={l.label}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] font-medium text-[#121212]">
                        {LEGS.find((l) => l.n === leg)?.label}
                      </div>
                      <div className="text-[10px] text-[#616161] line-clamp-1 max-w-[140px]">
                        {flip.logistics?.carrierStatusText || "En tránsito normal"}
                      </div>
                    </td>

                    {/* Tracking US */}
                    <td className="p-3">
                      {trackingUS ? (
                        <span className="font-mono text-[11px] text-[#121212] font-semibold">{trackingUS}</span>
                      ) : (
                        <span className="text-[10px] text-[#a16207] italic">Sin registrar</span>
                      )}
                    </td>

                    {/* Tracking Internacional (Liberty) — secuencia lógica: solo tras llegar a Miami */}
                    <td className="p-3">
                      {libertyPending ? (
                        <div className="text-[10px] text-[#616161] italic flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pendiente — esperando llegada a Miami</span>
                        </div>
                      ) : trackingLib ? (
                        <a
                          href={`${activeCourier.trackingBaseUrl}${trackingLib}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-[#121212] font-semibold hover:underline flex items-center space-x-1"
                        >
                          <span>{trackingLib}</span>
                          <ExternalLink className="w-3 h-3 text-[#121212]" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#a16207] italic">Agregar guía</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onViewFlipDetails(flip)}
                          className="text-xs text-[#121212] hover:underline font-medium shrink-0"
                        >
                          Ficha
                        </button>
                        <button
                          onClick={() => openModal(flip)}
                          className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition flex items-center space-x-1 shadow-none"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Actualizar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Modal por producto (reemplaza el formulario global) ---- */}
      {selectedFlip && (
        <div className="fixed inset-0 bg-[#121212]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#dbdad7] border border-[#e6e4e0] rounded-lg max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-[#121212]">
            {/* Header del modal */}
            <div className="p-5 border-b border-[#e6e4e0] flex items-start justify-between gap-3 bg-white">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={selectedFlip.imageUrl}
                  alt={selectedFlip.title}
                  className="w-12 h-12 rounded-lg object-cover border border-[#e6e4e0] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#616161] font-medium uppercase tracking-wider">Actualizar Tramo Logístico</div>
                  <h3 className="font-serif text-base font-normal text-[#121212] line-clamp-2">{selectedFlip.title}</h3>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-full hover:bg-[#dbdad7]/50 transition shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-[#121212]" />
              </button>
            </div>

            {/* Pasos clicables */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <div className="text-[10px] text-[#616161] font-medium uppercase tracking-wider mb-2">
                  Toca un tramo para actualizar sus datos
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LEGS.map((leg, idx) => {
                    const Icon = STEP_ICONS[idx];
                    const isDone = (selectedFlip.logistics?.currentLeg || 1) >= leg.n;
                    const isActive = activeLeg === leg.n;
                    const existingValue = legValue(selectedFlip, leg.n);
                    return (
                      <button
                        key={leg.n}
                        onClick={() => setActiveLeg(leg.n)}
                        className={`text-left p-3 rounded-lg border transition ${
                          isActive
                            ? "bg-[#121212] border-[#121212] text-white"
                            : "bg-white border-[#e6e4e0] hover:border-[#121212]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center space-x-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#616161]"}`} />
                            <span className="text-xs font-semibold">{leg.label}</span>
                          </span>
                          {isDone && (
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#1a5336]"}`} />
                          )}
                        </div>
                        <div className={`text-[10px] ${isActive ? "text-white/70" : "text-[#616161]"}`}>{leg.desc}</div>
                        {existingValue && (
                          <div className={`text-[10px] font-mono truncate mt-1 ${isActive ? "text-white/80" : "text-[#121212]"}`}>
                            {existingValue}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campo contextual del tramo activo */}
              <div className="bg-white border border-[#e6e4e0] rounded-lg p-4 space-y-3">
                <div className="text-[10px] text-[#616161] font-medium uppercase tracking-wider">
                  {STEP_FIELD_LABEL[activeLeg]}
                </div>

                {activeLeg === 1 && (
                  <input
                    type="text"
                    value={draft.trackingUS}
                    onChange={(e) => setDraft({ ...draft, trackingUS: e.target.value })}
                    placeholder="Ej: 1Z999AA10123456784 / 940011120255502931022"
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-mono"
                  />
                )}

                {activeLeg === 2 && (
                  <input
                    type="date"
                    value={draft.arrivedMiamiDate}
                    onChange={(e) => setDraft({ ...draft, arrivedMiamiDate: e.target.value })}
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                  />
                )}

                {activeLeg === 3 && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={draft.trackingNumber}
                      onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                      placeholder="Ej: LIB-9910482-VZ"
                      className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-mono"
                    />
                    {(selectedFlip.logistics?.currentLeg || 1) < 2 && (
                      <p className="text-[10px] text-[#a16207] bg-[#fef3c7]/40 border border-[#fde68a] rounded-lg px-2.5 py-1.5">
                        ⚠ La guía de Liberty se genera cuando el paquete llega a Miami. Al guardar este tramo, el paquete avanzará a Vuelo Internacional.
                      </p>
                    )}
                  </div>
                )}

                {activeLeg === 4 && (
                  <input
                    type="text"
                    value={draft.warehouseLocationVzla}
                    onChange={(e) => setDraft({ ...draft, warehouseLocationVzla: e.target.value })}
                    placeholder="Ej: Sucursal Maracay — Av. Bolívar"
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                  />
                )}

                <div>
                  <label className="block text-[10px] text-[#616161] font-medium uppercase tracking-wider mb-1">
                    Nota de estado / alerta
                  </label>
                  <input
                    type="text"
                    value={draft.statusText}
                    onChange={(e) => setDraft({ ...draft, statusText: e.target.value })}
                    placeholder="Ej: Paquete desaduanado en Maiquetía. En camino a sucursal..."
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                  />
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-[#e6e4e0] bg-white flex items-center justify-between gap-3">
              <div className="text-[10px] text-[#616161]">
                Tramo a guardar: <strong className="text-[#121212]">{LEGS.find((l) => l.n === activeLeg)?.label}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={closeModal}
                  className="text-xs font-medium text-[#616161] hover:text-[#121212] px-4 py-2 rounded-full border border-[#e6e4e0] hover:border-[#121212] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveUpdate}
                  className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition"
                >
                  Guardar Tramo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: valor legible de un tramo para el stepper del modal
function legValue(flip: FlipItem, leg: number): string {
  const lg = flip.logistics;
  switch (leg) {
    case 1: return lg?.trackingUS || "";
    case 2: return lg?.arrivedMiamiDate ? `Llegó ${lg.arrivedMiamiDate}` : "";
    case 3: return lg?.trackingNumber || "";
    case 4: return lg?.warehouseLocationVzla || "";
    default: return "";
  }
}
