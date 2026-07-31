import React, { useState, useEffect } from "react";
import { AppSettings, CourierCompany } from "../../types";
import {
  Settings as SettingsIcon,
  DollarSign,
  Truck,
  Cpu,
  Save,
  RefreshCw,
  PlugZap,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "../Toast";

interface SettingsModuleProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onRefreshExchangeRates: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  settings,
  onUpdateSettings,
  onRefreshExchangeRates,
}) => {
  const { toast } = useToast();

  const [paralelo, setParalelo] = useState(Number(settings.paraleloRate || 0).toFixed(2));
  const [bcv, setBcv] = useState(Number(settings.bcvRate || 0).toFixed(2));

  useEffect(() => {
    setParalelo(Number(settings.paraleloRate || 0).toFixed(2));
    setBcv(Number(settings.bcvRate || 0).toFixed(2));
  }, [settings.paraleloRate, settings.bcvRate]);

  const [model, setModel] = useState(settings.aiModel || "nvidia-nim-deepseek");
  const [temp, setTemp] = useState(String(settings.temperature));
  const [nvidiaApiKey, setNvidiaApiKey] = useState(settings.nvidiaApiKey || "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Firecrawl
  const [firecrawlKey, setFirecrawlKey] = useState(settings.firecrawlApiKey || "");

  // Telegram
  const [tgToken, setTgToken] = useState(settings.telegramBotToken || "");
  const [tgChatId, setTgChatId] = useState(settings.telegramChatId || "");
  const [sendingTg, setSendingTg] = useState(false);

  const [activeCourier, setActiveCourier] = useState(
    settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0]
  );
  const [rateLb, setRateLb] = useState(String(activeCourier.ratePerLbUSD));
  const [minFee, setMinFee] = useState(String(activeCourier.minFeeUSD));
  const [combustible, setCombustible] = useState(String(activeCourier.combustiblePorLbUSD || 0.75));
  const [gastosOp, setGastosOp] = useState(String(activeCourier.gastosOperacionalesPorLbUSD || 0.75));
  const [seguro, setSeguro] = useState(String(activeCourier.insurancePercent || 5));
  const [gestionAduanal, setGestionAduanal] = useState(String(activeCourier.customsFeeUSD || 1));
  const [iva, setIva] = useState(String(activeCourier.ivaPorcentaje || 16));
  const [divisor, setDivisor] = useState(String(activeCourier.divisorVolumetrico || 166));
  const [embalaje, setEmbalaje] = useState<"sobre" | "caja">(activeCourier.embalaje || "caja");

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: nvidiaApiKey.trim() || undefined, modelName: "deepseek-ai/deepseek-v4-flash" }),
      });
      const json = await res.json();
      setTestResult({ ok: json.success, message: json.error || json.message || "Respuesta inesperada." });
      toast({
        type: json.success ? "success" : "error",
        title: json.success ? "✅ Conexión NVIDIA NIM OK" : "❌ Falló la conexión",
        message: json.success ? "El modelo DeepSeek responde correctamente." : String(json.error || "").slice(0, 180),
      });
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || "Error de red." });
      toast({ type: "error", title: "Error de red", message: err?.message || "No se pudo contactar el servidor." });
    } finally {
      setTesting(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) {
      toast({ type: "warning", title: "Faltan datos", message: "Ingresa el Bot Token y el Chat ID de Telegram." });
      return;
    }
    setSendingTg(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: tgToken.trim(), chatId: tgChatId.trim() }),
      });
      const json = await res.json();
      toast({ type: json.success ? "success" : "error", title: json.success ? "📨 Telegram OK" : "❌ Telegram falló", message: json.message || json.error || "" });
      if (json.success) {
        onUpdateSettings({ telegramBotToken: tgToken.trim(), telegramChatId: tgChatId.trim() });
      }
    } catch (err: any) {
      toast({ type: "error", title: "Error", message: err?.message || "Error de red." });
    } finally {
      setSendingTg(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedParalelo = Math.round((parseFloat(paralelo) || 84.8) * 100) / 100;
    const parsedBcv = Math.round((parseFloat(bcv) || 72.45) * 100) / 100;

    const updatedCouriers = settings.couriers.map((c) =>
      c.id === activeCourier.id
        ? {
            ...c,
            ratePerLbUSD: parseFloat(rateLb) || 3.1,
            minFeeUSD: parseFloat(minFee) || 25.0,
            combustiblePorLbUSD: parseFloat(combustible) || 0.75,
            gastosOperacionalesPorLbUSD: parseFloat(gastosOp) || 0.75,
            insurancePercent: parseFloat(seguro) || 5,
            customsFeeUSD: parseFloat(gestionAduanal) || 1,
            ivaPorcentaje: parseFloat(iva) || 16,
            divisorVolumetrico: parseFloat(divisor) || 166,
            embalaje,
          }
        : c
    );

    onUpdateSettings({
      paraleloRate: parsedParalelo,
      bcvRate: parsedBcv,
      aiModel: model,
      temperature: parseFloat(temp) || 0.2,
      nvidiaApiKey: nvidiaApiKey.trim(),
      firecrawlApiKey: firecrawlKey.trim(),
      telegramBotToken: tgToken.trim(),
      telegramChatId: tgChatId.trim(),
      activeCourierId: activeCourier.id,
      couriers: updatedCouriers,
    });

    setParalelo(parsedParalelo.toFixed(2));
    setBcv(parsedBcv.toFixed(2));

    toast({ type: "success", title: "Ajustes guardados", message: "La configuración de FlipTrack quedó actualizada." });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <SettingsIcon className="w-3.5 h-3.5 text-[#121212]" />
            <span>Configuración General de Parámetros Operativos</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Ajustes del Sistema FlipTrack</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Ajuste de tasas de cambio en Venezuela, tarifas de flete aéreo Liberty Express, motor de IA (NVIDIA NIM / DeepSeek), scraper Firecrawl y alertas Telegram.
          </p>
        </div>

        <button
          onClick={onRefreshExchangeRates}
          className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2.5 rounded-full transition flex items-center space-x-2 shadow-none"
        >
          <RefreshCw className="w-3.5 h-3.5 text-white" />
          <span>Sincronizar Tasas de Hoy</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Currency Rates Card */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
          <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-[#121212]" />
            <span>Tasas de Cambio Dólar / Bolívar (VES)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Tasa Mercado Paralelo (USD/VES)</label>
              <input
                type="number"
                step="0.01"
                value={paralelo}
                onChange={(e) => setParalelo(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(paralelo);
                  if (!isNaN(val)) setParalelo(val.toFixed(2));
                }}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
              <span className="text-[10px] text-[#616161] mt-1 block">Tasa usada para ventas en Pago Móvil e inventario.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Tasa Oficial BCV (USD/VES)</label>
              <input
                type="number"
                step="0.01"
                value={bcv}
                onChange={(e) => setBcv(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(bcv);
                  if (!isNaN(val)) setBcv(val.toFixed(2));
                }}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>
          </div>
        </div>

        {/* Courier Settings Card */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
          <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
            <Truck className="w-4 h-4 text-[#121212]" />
            <span>Tarifas de Courier Casillero Internacional (desglose real)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Empresa Courier</label>
              <select
                value={activeCourier.id}
                onChange={(e) => {
                  const selected = settings.couriers.find((c) => c.id === e.target.value);
                  if (selected) {
                    setActiveCourier(selected);
                    setRateLb(String(selected.ratePerLbUSD));
                    setMinFee(String(selected.minFeeUSD));
                    setCombustible(String(selected.combustiblePorLbUSD || 0.75));
                    setGastosOp(String(selected.gastosOperacionalesPorLbUSD || 0.75));
                    setSeguro(String(selected.insurancePercent || 5));
                    setGestionAduanal(String(selected.customsFeeUSD || 1));
                    setIva(String(selected.ivaPorcentaje || 16));
                    setDivisor(String(selected.divisorVolumetrico || 166));
                    setEmbalaje(selected.embalaje || "caja");
                  }
                }}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              >
                {settings.couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Tarifa por Libra (USD/lb)</label>
              <input
                type="number"
                step="0.1"
                value={rateLb}
                onChange={(e) => setRateLb(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-bold focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Flete Mínimo por Paquete (USD)</label>
              <input
                type="number"
                step="1"
                value={minFee}
                onChange={(e) => setMinFee(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-bold focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Combustible (USD/lb)</label>
              <input type="number" step="0.05" value={combustible} onChange={(e) => setCombustible(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Gastos Op. (USD/lb)</label>
              <input type="number" step="0.05" value={gastosOp} onChange={(e) => setGastosOp(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Seguro (% FOB)</label>
              <input type="number" step="0.5" value={seguro} onChange={(e) => setSeguro(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Gestión Aduanal (USD)</label>
              <input type="number" step="0.5" value={gestionAduanal} onChange={(e) => setGestionAduanal(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">IVA (%)</label>
              <input type="number" step="1" value={iva} onChange={(e) => setIva(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Divisor Volumétrico</label>
              <input type="number" step="1" value={divisor} onChange={(e) => setDivisor(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
            </div>
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Embalaje</label>
              <select
                value={embalaje}
                onChange={(e) => setEmbalaje(e.target.value as "sobre" | "caja")}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#121212]"
              >
                <option value="caja">📦 Caja (peso real vs volumétrico)</option>
                <option value="sobre">📨 Sobre (tarifa plana ~$17-20)</option>
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-[10px] text-[#616161] leading-tight">
                Regla: se cobra el MAYOR entre peso real y volumétrico. Mínimo $25 solo al flete si &lt; 3 lb.
              </span>
            </div>
          </div>
        </div>

        {/* AI Model Card */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
          <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[#121212]" />
            <span>Motor de Inteligencia Artificial Forense (FlipMaster)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Modelo de Lenguaje / IA</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-medium focus:outline-none focus:ring-1 focus:ring-[#121212]"
              >
                <option value="nvidia-nim-deepseek">NVIDIA NIM (DeepSeek) — Análisis Forense Recomendado</option>
                <option value="deepseek-ai/deepseek-v4-flash">NVIDIA DeepSeek-V4 Flash (Alta Velocidad)</option>
                <option value="deepseek-ai/deepseek-v4-pro">NVIDIA DeepSeek-V4 Pro (Razonamiento Complejo)</option>

              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Clave de API NVIDIA (NVIDIA NIM)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nvidiaApiKey}
                  onChange={(e) => setNvidiaApiKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="flex-1 bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={testing}
                  className="bg-[#e6e4e0] hover:bg-[#d8d6d2] disabled:opacity-40 text-[#121212] font-medium text-xs px-3 py-2 rounded-lg transition flex items-center space-x-1.5 shrink-0"
                >
                  <PlugZap className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                  <span>{testing ? "Probando..." : "Probar conexión"}</span>
                </button>
              </div>
              {testResult && (
                <span className={`text-[10px] mt-1 block font-medium ${testResult.ok ? "text-[#1a5336]" : "text-[#991b1b]"}`}>
                  {testResult.ok ? "✅ " : "❌ "}
                  {testResult.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Temperatura</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-mono"
              />
            </div>
          </div>
          <p className="text-[10px] text-[#616161]">
            ⚠️ Seguridad: la key se lee del servidor (env NVIDIA_API_KEY) con fallback a la del navegador. Nunca se publica en el bundle con prefijo VITE_.
          </p>
        </div>

        {/* Firecrawl Card */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-3">
          <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#121212]" />
            <span>Scraper de Tiendas — Firecrawl (esquiva CAPTCHA de eBay)</span>
          </h3>
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">API Key de Firecrawl</label>
            <input
              type="text"
              value={firecrawlKey}
              onChange={(e) => setFirecrawlKey(e.target.value)}
              placeholder="fc-..."
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
            <span className="text-[10px] text-[#616161] mt-1 block">
              Opcional para el escáner de tiendas. Se puede configurar aquí o en el servidor como variable FIRECRAWL_API_KEY. Sin ella, el escáner de tiendas no podrá leer listados de eBay.
            </span>
          </div>
        </div>

        {/* Telegram Card */}
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-3">
          <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
            <Send className="w-4 h-4 text-[#121212]" />
            <span>Alertas Telegram (escaneos de tiendas)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Bot Token</label>
              <input
                type="text"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="123456:ABC-..."
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">Chat ID</label>
              <input
                type="text"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                placeholder="-100123456789"
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestTelegram}
            disabled={sendingTg}
            className="bg-[#e6e4e0] hover:bg-[#d8d6d2] disabled:opacity-40 text-[#121212] font-medium text-xs px-4 py-2 rounded-full transition flex items-center space-x-2"
          >
            <Send className={`w-3.5 h-3.5 ${sendingTg ? "animate-pulse" : ""}`} />
            <span>{sendingTg ? "Enviando prueba..." : "Enviar mensaje de prueba"}</span>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-6 py-2.5 rounded-full transition flex items-center space-x-2 shadow-none"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Guardar Ajustes del Sistema</span>
          </button>
        </div>
      </form>
    </div>
  );
};
