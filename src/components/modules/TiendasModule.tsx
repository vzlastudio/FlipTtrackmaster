import React, { useState, useEffect, useCallback } from "react";
import { FlipItem, AppSettings } from "../../types";
import {
  Store,
  Plus,
  Play,
  FileText,
  Sparkles,
  History,
  Trash2,
  Clock,
  ExternalLink,
  X,
  Pause,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Tienda,
  Escaneo,
  TIERS_PRESETS,
  TIENDAS_EJEMPLO,
  escanearTienda,
} from "../../lib/escaner";
import { exportarTiendaPDF } from "../../lib/pdf";
import { getAll, save, saveMany, deleteItem, generateUUID, registerEvent } from "../../lib/db";
import { useToast } from "../Toast";
import { formatUSD } from "../../lib/currency";

interface TiendasModuleProps {
  flips: FlipItem[];
  setFlips: React.Dispatch<React.SetStateAction<FlipItem[]>>;
  settings: AppSettings;
  onViewFlipDetails: (flip: FlipItem) => void;
}

const TIER_STYLES: Record<"A" | "B" | "C", string> = {
  A: "bg-[#dcfce7] text-[#166534] border-[#86efac]",
  B: "bg-[#fef7e0] text-[#92400e] border-[#fde68a]",
  C: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
};

export const TiendasModule: React.FC<TiendasModuleProps> = ({
  flips,
  setFlips,
  settings,
  onViewFlipDetails,
}) => {
  const { toast } = useToast();

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [escaneos, setEscaneos] = useState<Escaneo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  // New store form state
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [nuevoTier, setNuevoTier] = useState<"A" | "B" | "C">("B");
  const [nuevoPrecioMax, setNuevoPrecioMax] = useState("150");
  const [nuevaCategoria, setNuevaCategoria] = useState("Apple (MacBooks, iPhones)");
  const [planificando, setPlanificando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([getAll<Tienda>("tiendas"), getAll<Escaneo>("escaneos")]);
      setTiendas(t.sort((a, b) => (b.fechaCreacion > a.fechaCreacion ? 1 : -1)));
      setEscaneos(e.sort((a, b) => (b.fecha > a.fecha ? 1 : -1)));
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const guardarTienda = async (tienda: Tienda) => {
    await save("tiendas", tienda);
    await cargarDatos();
  };

  const handleAgregarTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaUrl.trim().startsWith("http")) {
      toast({ type: "warning", title: "Datos incompletos", message: "Ingresa un nombre y una URL válida de la tienda eBay." });
      return;
    }
    const tienda: Tienda = {
      id: generateUUID(),
      nombre: nuevoNombre.trim(),
      url: nuevaUrl.trim(),
      tier: nuevoTier,
      precioMaximoUSD: parseFloat(nuevoPrecioMax) || TIERS_PRESETS[nuevoTier].precioMaximoUSD,
      categoria: nuevaCategoria.trim() || "Otros",
      activa: true,
      frecuenciaHoras: TIERS_PRESETS[nuevoTier].frecuenciaHoras,
      totalItemsEscaneados: 0,
      oportunidadesEncontradas: 0,
      bloqueaCourier: false,
      fechaCreacion: new Date().toISOString(),
    };
    await guardarTienda(tienda);
    await registerEvent(`Tienda agregada: ${tienda.nombre}`, "tiendas");
    setShowModal(false);
    setNuevoNombre("");
    setNuevaUrl("");
    toast({ type: "success", title: "Tienda agregada", message: `${tienda.nombre} quedó configurada en el escáner.` });
  };

  const handleCargarEjemplos = async () => {
    const nuevos = TIENDAS_EJEMPLO.map((t) => ({
      ...t,
      id: generateUUID(),
      fechaCreacion: new Date().toISOString(),
      totalItemsEscaneados: 0,
      oportunidadesEncontradas: 0,
    }));
    await saveMany("tiendas", nuevos);
    await cargarDatos();
    toast({ type: "success", title: "Tiendas de ejemplo cargadas", message: "Regency Technologies, northbaymac e iPhones For Parts listas para escanear." });
  };

  const handleEscanear = async (tienda: Tienda) => {
    if (scanningId) {
      toast({ type: "warning", title: "Escaneo en curso", message: "Espera a que termine el escaneo actual." });
      return;
    }
    setScanningId(tienda.id);
    setProgreso("Iniciando escaneo...");
    try {
      const { escaneo, oportunidades } = await escanearTienda(tienda, settings, setProgreso);
      await save("escaneos", escaneo);
      if (oportunidades.length > 0) {
        setFlips((prev) => [...oportunidades, ...prev]);
        const actualizada: Tienda = {
          ...tienda,
          ultimoEscaneo: escaneo.fecha,
          totalItemsEscaneados: (tienda.totalItemsEscaneados || 0) + escaneo.itemsVistos,
          oportunidadesEncontradas: (tienda.oportunidadesEncontradas || 0) + oportunidades.length,
        };
        await save("tiendas", actualizada);
        toast({
          type: "success",
          title: `🎯 ${oportunidades.length} oportunidad(es) encontrada(s)`,
          message: `${escaneo.itemsVistos} items vistos en ${escaneo.duracionSegundos}s. Revisa Oportunidades.`,
        });
      } else if (escaneo.error) {
        toast({ type: "error", title: "Error en escaneo", message: escaneo.error });
      } else {
        toast({ type: "info", title: "Sin oportunidades", message: `${escaneo.itemsVistos} items vistos, ninguno pasó el filtro de ROI.` });
      }
    } catch (err: any) {
      toast({ type: "error", title: "Fallo el escaneo", message: err?.message || "Error inesperado." });
    } finally {
      setScanningId(null);
      setProgreso("");
      await cargarDatos();
    }
  };

  const handleGenerarPlan = async (tienda: Tienda) => {
    setPlanificando(true);
    setProgreso("🤖 FlipMaster elaborando plan de escaneo...");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Plan de escaneo para tienda ${tienda.nombre}`,
          description: `Tienda eBay: ${tienda.nombre} (${tienda.url}). Categoría: ${tienda.categoria}. Analiza cuál debe ser la frecuencia de escaneo ideal, el precio máximo de compra por item y la prioridad de esta tienda. Responde con un JSON con campos: frecuenciaHoras (número), precioMaximoUSD (número), prioridad (Alta/Media/Baja), razon (string).`,
          listedPrice: 0,
          platform: "eBay",
          declaredCondition: "Usado / Con Defectos",
          courierRate: 3.1,
          minCourierFee: 25,
          exchangeRate: settings.paraleloRate,
          modelName: settings.aiModel,
          nvidiaApiKey: settings.nvidiaApiKey,
          temperature: 0.2,
        }),
      });
      const json = await res.json();
      const raw = JSON.stringify(json.data || {});
      const freqMatch = raw.match(/"frecuenciaHoras"?\s*[:=]\s*"?(\d+)"/i);
      const precioMatch = raw.match(/"precioMaximoUSD"?\s*[:=]\s*"?(\d+(?:\.\d+)?)"/i);
      const prioMatch = raw.match(/"prioridad"?\s*[:=]\s*"?(Alta|Media|Baja)"/i);
      const razonMatch = raw.match(/"razon"?\s*[:=]\s*"([^"]+)"/i);

      const actualizada: Tienda = {
        ...tienda,
        frecuenciaHoras: freqMatch ? parseInt(freqMatch[1], 10) : tienda.frecuenciaHoras,
        precioMaximoUSD: precioMatch ? parseFloat(precioMatch[1]) : tienda.precioMaximoUSD,
      };
      await save("tiendas", actualizada);
      await cargarDatos();

      const prioridad = prioMatch ? prioMatch[1] : "Media";
      const razon = razonMatch ? razonMatch[1] : "Plan generado por FlipMaster.";
      toast({
        type: "success",
        title: `Plan aplicado (prioridad ${prioridad})`,
        message: `Frecuencia: cada ${actualizada.frecuenciaHoras}h · Precio máx: ${formatUSD(actualizada.precioMaximoUSD)}. ${razon.slice(0, 120)}`,
      });
    } catch (err: any) {
      toast({ type: "error", title: "No se pudo generar el plan", message: err?.message || "Error con el modelo IA." });
    } finally {
      setPlanificando(false);
      setProgreso("");
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta tienda y su configuración?")) return;
    await deleteItem("tiendas", id);
    await registerEvent("Tienda eliminada", "tiendas");
    await cargarDatos();
    toast({ type: "info", title: "Tienda eliminada" });
  };

  const handlePDF = (tienda: Tienda) => {
    const oportunidadesTienda = flips.filter((f) => f.tiendaOrigenId === tienda.id);
    exportarTiendaPDF(tienda, oportunidadesTienda, settings);
  };

  const escaneosDeTienda = (tiendaId: string) => escaneos.filter((e) => e.tiendaId === tiendaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Store className="w-3.5 h-3.5 text-[#121212]" />
            <span>Escáner de Tiendas eBay & Vendedores (Firecrawl + FlipMaster)</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Tiendas de eBay ({tiendas.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Registra tiendas o vendedores de eBay por tier de valor, escanéalos automáticamente y deja que FlipMaster evalúe cada item que encuentre. Las oportunidades positivas llegan a tu pipeline y por Telegram.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={handleCargarEjemplos}
            className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-2.5 rounded-full transition flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cargar tiendas de ejemplo</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2.5 rounded-full transition flex items-center justify-center space-x-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar tienda</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {scanningId && (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-4 shadow-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-[#121212]">
              <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
              <span>{progreso || "Analizando..."}</span>
            </div>
            <span className="text-[10px] text-[#616161]">El escaneo puede tardar 1-3 min</span>
          </div>
          <div className="w-full bg-[#dbdad7] rounded-full h-2">
            <div className="bg-[#121212] h-2 rounded-full animate-pulse w-1/2 transition-all"></div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!cargando && tiendas.length === 0 && (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-12 text-center">
          <Store className="w-10 h-10 text-[#616161] mx-auto mb-3" />
          <h3 className="text-base font-serif font-normal text-[#121212]">No hay tiendas configuradas</h3>
          <p className="text-xs text-[#616161] mt-1 font-sans max-w-md mx-auto">
            Agrega una tienda de eBay (o un vendedor) para que el escáner busque y evalúe oportunidades automáticamente según su tier de valor.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={handleCargarEjemplos}
              className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar tiendas de ejemplo</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar tienda</span>
            </button>
          </div>
        </div>
      )}

      {/* Tiendas Grid */}
      {tiendas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tiendas.map((tienda) => {
            const escaneosT = escaneosDeTienda(tienda.id);
            const opsTienda = flips.filter((f) => f.tiendaOrigenId === tienda.id);
            return (
              <div key={tienda.id} className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIER_STYLES[tienda.tier]}`}>
                        Tier {tienda.tier}
                      </span>
                      {tienda.activa ? (
                        <span className="text-[10px] text-[#1a5336] bg-[#e6f4ea] px-2 py-0.5 rounded-full border border-[#ceead6]">● Activa</span>
                      ) : (
                        <span className="text-[10px] text-[#616161] bg-[#e6e4e0] px-2 py-0.5 rounded-full">Pausada</span>
                      )}
                    </div>
                    <h3 className="font-serif text-base font-normal text-[#121212] mt-1 line-clamp-2">{tienda.nombre}</h3>
                  </div>
                  <button
                    onClick={() => handleEliminar(tienda.id)}
                    className="p-1.5 rounded-full text-[#616161] hover:text-[#991b1b] hover:bg-[#dbdad7]/40 transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-[#616161] space-y-1">
                  <a href={tienda.url} target="_blank" rel="noreferrer" className="flex items-center space-x-1 hover:text-[#121212] transition truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{tienda.categoria}</span>
                  </a>
                  <div className="flex items-center space-x-3">
                    <span>Precio máx: <b className="text-[#121212]">${tienda.precioMaximoUSD}</b></span>
                    <span>Frecuencia: <b className="text-[#121212]">{tienda.frecuenciaHoras}h</b></span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center bg-[#dbdad7]/20 rounded-xl border border-[#e6e4e0] p-2.5">
                  <div>
                    <div className="text-[9px] text-[#616161] uppercase">Vistos</div>
                    <div className="text-sm font-bold text-[#121212]">{tienda.totalItemsEscaneados || 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#616161] uppercase">Oportunid.</div>
                    <div className="text-sm font-bold text-[#1a5336]">{tienda.oportunidadesEncontradas || opsTienda.length}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#616161] uppercase">Últ. scan</div>
                    <div className="text-[11px] font-medium text-[#121212] mt-1">
                      {tienda.ultimoEscaneo ? new Date(tienda.ultimoEscaneo).toLocaleDateString("es-VE") : "—"}
                    </div>
                  </div>
                </div>

                {/* Historial de escaneos */}
                {escaneosT.length > 0 && (
                  <div className="text-[11px] bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center space-x-1 text-[#616161] font-medium">
                      <History className="w-3 h-3" />
                      <span>Historial</span>
                    </div>
                    {escaneosT.slice(0, 3).map((e) => (
                      <div key={e.id} className="flex justify-between text-[10px]">
                        <span className="text-[#616161]">
                          {new Date(e.fecha).toLocaleDateString("es-VE")} {new Date(e.fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                          {e.error ? <span className="text-[#991b1b]"> ⚠ error</span> : ""}
                        </span>
                        <span className="font-mono text-[#121212]">{e.itemsVistos} vistos · {e.oportunidades} 🎯</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => handleEscanear(tienda)}
                    disabled={!!scanningId}
                    className="flex-1 bg-[#121212] hover:bg-[#282828] disabled:opacity-40 text-white font-medium text-[11px] px-3 py-2 rounded-full transition flex items-center justify-center space-x-1.5"
                  >
                    {scanningId === tienda.id ? <Pause className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{scanningId === tienda.id ? "Escaneando..." : "Escanear ahora"}</span>
                  </button>
                  <button
                    onClick={() => handleGenerarPlan(tienda)}
                    disabled={planificando}
                    className="bg-[#e6e4e0] hover:bg-[#d8d6d2] disabled:opacity-40 text-[#121212] font-medium text-[11px] px-3 py-2 rounded-full transition flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plan IA</span>
                  </button>
                  <button
                    onClick={() => handlePDF(tienda)}
                    className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-[11px] px-3 py-2 rounded-full transition flex items-center justify-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => opsTienda[0] && onViewFlipDetails(opsTienda[0])}
                    disabled={opsTienda.length === 0}
                    className="text-[11px] text-[#616161] hover:text-[#121212] disabled:opacity-30 px-2 py-2 flex items-center space-x-1"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{opsTienda.length} ops</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tier presets reference */}
      {tiendas.length > 0 && (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none">
          <h3 className="font-serif text-sm font-normal text-[#121212] uppercase tracking-wider mb-3">Tiers de valor (presets)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {(["A", "B", "C"] as const).map((t) => (
              <div key={t} className={`border rounded-xl p-3 ${TIER_STYLES[t]} border-[#e6e4e0] bg-white`}>
                <div className="font-bold">{TIERS_PRESETS[t].nombre}</div>
                <div className="text-[11px] text-[#616161] mt-1">{TIERS_PRESETS[t].descripcion}</div>
                <div className="text-[11px] font-mono text-[#121212] mt-1">
                  Compra ${TIERS_PRESETS[t].precioMinUSD}–${TIERS_PRESETS[t].precioMaximoUSD}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e6e4e0] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e6e4e0] pb-4">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-[#121212]" />
                <h3 className="text-lg font-serif font-normal text-[#121212]">Agregar Tienda eBay</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#616161] hover:text-[#121212]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAgregarTienda} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">Nombre de la tienda / vendedor</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Regency Technologies"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">URL de la tienda o vendedor</label>
                <input
                  type="url"
                  value={nuevaUrl}
                  onChange={(e) => setNuevaUrl(e.target.value)}
                  placeholder="https://www.ebay.com/str/... o /sch/m.html?_ssn=..."
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
                <span className="text-[10px] text-[#616161] mt-1 block">Formato de tienda: <span className="font-mono">ebay.com/str/NOMBRE</span> · Formato vendedor: <span className="font-mono">ebay.com/sch/m.html?_ssn=USUARIO</span></span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Tier</label>
                  <select
                    value={nuevoTier}
                    onChange={(e) => {
                      const t = e.target.value as "A" | "B" | "C";
                      setNuevoTier(t);
                      setNuevoPrecioMax(String(TIERS_PRESETS[t].precioMaximoUSD));
                    }}
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none"
                  >
                    <option value="A">A — Alto (ROI ≥ 40%)</option>
                    <option value="B">B — Medio (ROI ≥ 30%)</option>
                    <option value="C">C — Volumen (ROI ≥ 25%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Precio máx (USD)</label>
                  <input
                    type="number"
                    value={nuevoPrecioMax}
                    onChange={(e) => setNuevoPrecioMax(e.target.value)}
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Categoría</label>
                  <input
                    type="text"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none"
                  />
                </div>
              </div>

              {!settings.firecrawlApiKey && (
                <div className="bg-[#fef7e0] border border-[#fde68a] rounded-lg p-3 text-[11px] text-[#92400e] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    El escaneo de tiendas requiere la <b>API key de Firecrawl</b> configurada en el servidor (variable FIRECRAWL_API_KEY) o en Ajustes → Scraper. Sin ella, el escáner no podrá esquivar el CAPTCHA de eBay.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-2 rounded-full transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition"
                >
                  Guardar tienda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
