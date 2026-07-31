import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, Clock, Store, Plus, Play, Loader2 } from "lucide-react";
import { FlipItem, AppSettings } from "../../types";
import { Tienda, Escaneo, TIENDAS_EJEMPLO, escanearTienda } from "../../lib/escaner";
import { getAll, save, saveMany, generateUUID, registerEvent } from "../../lib/db";
import { useToast } from "../Toast";

interface EbaySyncModuleProps {
  flips: FlipItem[];
  setFlips: React.Dispatch<React.SetStateAction<FlipItem[]>>;
  settings: AppSettings;
  onAnalyzeUrl: (url: string) => void;
}

export const EbaySyncModule: React.FC<EbaySyncModuleProps> = ({
  flips,
  setFlips,
  settings,
  onAnalyzeUrl,
}) => {
  const { toast } = useToast();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [escaneos, setEscaneos] = useState<Escaneo[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [progreso, setProgreso] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importNombre, setImportNombre] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([getAll<Tienda>("tiendas"), getAll<Escaneo>("escaneos")]);
      setTiendas(t);
      setEscaneos(e.sort((a, b) => (b.fecha > a.fecha ? 1 : -1)));
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSyncTienda = async (tienda: Tienda) => {
    if (syncing) return;
    setSyncing(tienda.id);
    setProgreso("");
    try {
      const { escaneo, oportunidades } = await escanearTienda(tienda, settings, setProgreso);
      await save("escaneos", escaneo);
      if (oportunidades.length > 0) {
        setFlips((prev) => [...oportunidades, ...prev]);
        await save("tiendas", {
          ...tienda,
          ultimoEscaneo: escaneo.fecha,
          totalItemsEscaneados: (tienda.totalItemsEscaneados || 0) + escaneo.itemsVistos,
          oportunidadesEncontradas: (tienda.oportunidadesEncontradas || 0) + oportunidades.length,
        });
        toast({ type: "success", title: `🎯 ${oportunidades.length} oportunidad(es)`, message: "Agregadas a Oportunidades." });
      } else if (escaneo.error) {
        toast({ type: "error", title: "Error de escaneo", message: escaneo.error });
      } else {
        toast({ type: "info", title: "Sin oportunidades", message: `${escaneo.itemsVistos} items vistos sin match de ROI.` });
      }
    } catch (err: any) {
      toast({ type: "error", title: "Fallo el escaneo", message: err?.message || "Error." });
    } finally {
      setSyncing(null);
      await cargar();
    }
  };

  const handleEscanearTodas = async () => {
    const activas = tiendas.filter((t) => t.activa);
    if (activas.length === 0) {
      toast({ type: "warning", title: "Sin tiendas activas", message: "Configura tiendas en el módulo Tiendas eBay o importa una URL abajo." });
      return;
    }
    for (const t of activas) {
      await handleSyncTienda(t);
    }
  };

  const handleImportarTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim().startsWith("http")) {
      toast({ type: "warning", title: "URL inválida", message: "Pega la URL de la tienda o vendedor de eBay." });
      return;
    }
    const tienda: Tienda = {
      id: generateUUID(),
      nombre: importNombre.trim() || "Tienda importada",
      url: importUrl.trim(),
      tier: "B",
      precioMaximoUSD: 150,
      categoria: "Otros",
      activa: true,
      frecuenciaHoras: 24,
      totalItemsEscaneados: 0,
      oportunidadesEncontradas: 0,
      bloqueaCourier: false,
      fechaCreacion: new Date().toISOString(),
    };
    await save("tiendas", tienda);
    await registerEvent(`Tienda importada desde eBay Sync: ${tienda.nombre}`, "tiendas");
    setImportUrl("");
    setImportNombre("");
    await cargar();
    toast({ type: "success", title: "Tienda importada", message: "Ya puedes escanearla desde este módulo o Tiendas eBay." });
  };

  const opsPorTienda = (tiendaId: string) => flips.filter((f) => f.tiendaOrigenId === tiendaId);
  const ultimoEscaneoDe = (tiendaId: string) => escaneos.find((e) => e.tiendaId === tiendaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e6e4e0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#121212] flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#121212]" />
            <span>Sincronizador eBay — Tiendas & Oportunidades (datos reales)</span>
          </h1>
          <p className="text-xs text-[#616161] mt-1">
            Escanea tus tiendas de eBay con Firecrawl, evalúa cada item con FlipMaster y envía los positivos al pipeline de Oportunidades.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-[10px] text-[#616161]">Tiendas configuradas:</p>
            <p className="text-xs font-mono font-medium text-[#121212]">{tiendas.length}</p>
          </div>
          <button
            onClick={handleEscanearTodas}
            disabled={!!syncing}
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-amber-300" : ""}`} />
            <span>{syncing ? "Escaneando..." : "Escanear todas las tiendas"}</span>
          </button>
        </div>
      </div>

      {/* Import by URL */}
      <form onSubmit={handleImportarTienda} className="bg-white p-4 rounded-2xl border border-[#e6e4e0] shadow-sm flex flex-col md:flex-row md:items-center gap-3 text-xs">
        <div className="flex items-center space-x-2 shrink-0">
          <Plus className="w-3.5 h-3.5 text-[#121212]" />
          <span className="font-medium text-[#121212]">Importar tienda por URL:</span>
        </div>
        <input
          type="text"
          value={importNombre}
          onChange={(e) => setImportNombre(e.target.value)}
          placeholder="Nombre (opcional)"
          className="flex-1 md:max-w-[200px] bg-[#f8f7f5] border border-[#e6e4e0] rounded-full px-3 py-1.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
        />
        <input
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder="https://www.ebay.com/str/NOMBRE o /sch/m.html?_ssn=..."
          className="flex-1 bg-[#f8f7f5] border border-[#e6e4e0] rounded-full px-3 py-1.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
        />
        <button type="submit" className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-1.5 rounded-full transition shrink-0">
          Importar
        </button>
      </form>

      {syncing && (
        <div className="bg-white border border-[#e6e4e0] rounded-2xl p-4 flex items-center space-x-3 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
          <span className="text-[#121212] font-medium">{progreso || "Escaneando tienda..."}</span>
        </div>
      )}

      {/* Tiendas list as watchlist */}
      {tiendas.length === 0 ? (
        <div className="bg-white border border-[#e6e4e0] rounded-2xl p-12 text-center">
          <Store className="w-10 h-10 text-[#616161] mx-auto mb-3" />
          <h3 className="text-base font-serif font-normal text-[#121212]">No hay tiendas sincronizadas</h3>
          <p className="text-xs text-[#616161] mt-1 font-sans">
            Importa una tienda por URL arriba, o ve al módulo Tiendas eBay para cargar las de ejemplo (Regency Technologies, northbaymac).
          </p>
          <button
            onClick={async () => {
              const nuevas = TIENDAS_EJEMPLO.map((t) => ({
                ...t,
                id: generateUUID(),
                fechaCreacion: new Date().toISOString(),
                totalItemsEscaneados: 0,
                oportunidadesEncontradas: 0,
              }));
              await saveMany("tiendas", nuevas);
              await cargar();
              toast({ type: "success", title: "Tiendas de ejemplo cargadas" });
            }}
            className="mt-4 bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition"
          >
            Cargar tiendas de ejemplo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiendas.map((tienda) => {
            const ultimo = ultimoEscaneoDe(tienda.id);
            const ops = opsPorTienda(tienda.id);
            return (
              <div key={tienda.id} className="bg-white rounded-2xl border border-[#e6e4e0] p-4 shadow-sm hover:border-[#121212] transition space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-medium text-[#616161] bg-[#f8f7f5] px-2 py-0.5 rounded-full border border-[#e6e4e0]">
                      Tier {tienda.tier} · ${tienda.precioMaximoUSD} máx
                    </span>
                    {ultimo && (
                      <span className="text-[10px] font-mono text-[#616161] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(ultimo.fecha).toLocaleDateString("es-VE")} {new Date(ultimo.fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#121212] line-clamp-2 leading-snug">
                    <Store className="w-3.5 h-3.5 inline mr-1 text-[#616161]" />
                    {tienda.nombre}
                  </h3>
                  <p className="text-[11px] text-[#616161]">{tienda.categoria}</p>
                </div>

                <div className="bg-[#f8f7f5] p-3 rounded-xl border border-[#e6e4e0] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[9px] text-[#616161] block uppercase">Vistos</span>
                    <span className="text-sm font-bold text-[#121212]">{tienda.totalItemsEscaneados || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#616161] block uppercase">Oportun.</span>
                    <span className="text-sm font-bold text-[#1a5336]">{tienda.oportunidadesEncontradas || ops.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#616161] block uppercase">Análisis</span>
                    <span className="text-sm font-bold text-[#121212]">{escaneos.filter((e) => e.tiendaId === tienda.id).length}</span>
                  </div>
                </div>

                {ops.length > 0 && (
                  <div className="space-y-1">
                    {ops.slice(0, 2).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => onAnalyzeUrl(f.sourceUrl || tienda.url)}
                        className="w-full text-left text-[11px] bg-[#e6f4ea] border border-[#ceead6] rounded-lg px-2.5 py-1.5 text-[#1a5336] hover:bg-[#d7efdd] transition truncate"
                      >
                        🎯 {f.title.slice(0, 60)} · ROI {(f.analysis?.flipMath?.roiPercent ?? 0).toFixed(1)}%
                      </button>
                    ))}
                    {ops.length > 2 && <p className="text-[10px] text-[#616161] px-1">+{ops.length - 2} más en Oportunidades</p>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 gap-2">
                  <a
                    href={tienda.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#616161] hover:text-[#121212] flex items-center gap-1"
                  >
                    <span>Ver en eBay</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => handleSyncTienda(tienda)}
                    disabled={!!syncing}
                    className="bg-[#121212] hover:bg-[#282828] disabled:opacity-40 text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Play className="w-3 h-3" />
                    <span>{syncing === tienda.id ? "Escaneando..." : "Escanear tienda"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
