import React, { useState } from "react";
import { FlipItem, AppSettings, SaleInfo } from "../../types";
import { Tag, DollarSign, CheckCircle2, ShoppingCart, User, Phone, MapPin, ShieldCheck, ExternalLink } from "lucide-react";
import { formatUSD, formatVES, formatPercent } from "../../lib/currency";

interface SalesModuleProps {
  flips: FlipItem[];
  settings: AppSettings;
  onRecordSale: (flipId: string, saleData: SaleInfo) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  flips,
  settings,
  onRecordSale,
  onViewFlipDetails,
}) => {
  const listedAndSold = flips.filter((f) => f.status === "listed" || f.status === "sold" || f.sale);

  const [selectedFlipId, setSelectedFlipId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCity, setBuyerCity] = useState("Caracas");
  const [channel, setChannel] = useState<SaleInfo["channel"]>("MercadoLibre");
  const [salePriceUSD, setSalePriceUSD] = useState("");
  const [paymentMethodUsed, setPaymentMethodUsed] = useState("Pago Móvil");
  const [warrantyDays, setWarrantyDays] = useState("30");

  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlipId || !buyerName) return;

    const priceUSD = parseFloat(salePriceUSD) || 0;
    const priceVES = priceUSD * settings.paraleloRate;
    const commission = channel === "MercadoLibre" ? priceUSD * 0.08 : 0;
    const netProceeds = priceUSD - commission;

    onRecordSale(selectedFlipId, {
      channel,
      salePriceUSD: priceUSD,
      salePriceVES: priceVES,
      exchangeRateUsed: settings.paraleloRate,
      platformCommissionUSD: commission,
      netProceedsUSD: netProceeds,
      saleDate: new Date().toISOString().split("T")[0],
      buyerName,
      buyerPhone,
      buyerCity,
      warrantyDays: parseInt(warrantyDays) || 30,
      paymentMethodUsed,
    });

    setSelectedFlipId("");
    setBuyerName("");
    setBuyerPhone("");
    setSalePriceUSD("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-[#121212]" />
            <span>Comercialización & Cierre de Ventas en Venezuela</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Ventas & Publicaciones Activas</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Gestión de publicaciones en MercadoLibre Venezuela, Instagram, Estados de WhatsApp y registro formal de compradores con garantía de 30 días.
          </p>
        </div>
      </div>

      {/* Active Sales List */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="font-serif text-sm font-normal text-[#121212] uppercase tracking-wider">Publicaciones & Ventas Registradas</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#121212]">
            <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-lg">Producto</th>
                <th className="p-3">Canal</th>
                <th className="p-3">Precio Venta USD</th>
                <th className="p-3">Cobro en VES</th>
                <th className="p-3">Comprador / Ciudad</th>
                <th className="p-3 text-right rounded-r-lg">Estado / Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4e0]">
              {listedAndSold.map((flip) => {
                const s = flip.sale;
                const priceUSD = s?.salePriceUSD || flip.inventory?.targetPriceUSD || flip.analysis?.flipMath.estimatedMarketPriceVzlaUSD || 0;
                const priceVES = priceUSD * settings.paraleloRate;

                return (
                  <tr key={flip.id} className="hover:bg-[#dbdad7]/20 transition">
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={flip.imageUrl}
                          alt={flip.title}
                          className="w-10 h-10 rounded-lg object-cover border border-[#e6e4e0] bg-[#dbdad7]/30 shrink-0"
                        />
                        <div>
                          <div className="font-serif text-sm font-normal text-[#121212] line-clamp-1">{flip.title}</div>
                          <div className="text-[10px] text-[#616161]">{flip.brand} {flip.model}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="bg-[#e6e4e0] px-2 py-0.5 rounded-full text-[10px] font-medium text-[#121212]">
                        {s?.channel || "MercadoLibre / IG"}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-[#1a5336] text-sm">
                      {formatUSD(priceUSD)}
                    </td>

                    <td className="p-3 font-mono text-[#616161]">
                      {formatVES(priceVES)}
                    </td>

                    <td className="p-3">
                      {s?.buyerName ? (
                        <div>
                          <div className="font-medium text-[#121212]">{s.buyerName}</div>
                          <div className="text-[10px] text-[#616161]">{s.buyerCity} • {s.buyerPhone}</div>
                        </div>
                      ) : (
                        <span className="text-[#616161] italic font-sans">En publicación activa</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => onViewFlipDetails(flip)}
                        className="bg-[#121212] hover:bg-[#282828] text-white font-medium px-3 py-1.5 rounded-full text-xs transition shadow-none"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Sale Form */}
      <form onSubmit={handleRegisterSale} className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
          <ShoppingCart className="w-4 h-4 text-[#121212]" />
          <span>Registrar Venta & Expedir Garantía</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Seleccionar Equipo Vendido</label>
            <select
              value={selectedFlipId}
              onChange={(e) => {
                setSelectedFlipId(e.target.value);
                const selected = flips.find((f) => f.id === e.target.value);
                if (selected) {
                  setSalePriceUSD(
                    String(selected.inventory?.targetPriceUSD || selected.analysis?.flipMath.estimatedMarketPriceVzlaUSD || "")
                  );
                }
              }}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="">-- Selecciona equipo para cerrar venta --</option>
              {flips
                .filter((f) => f.status === "listed" || f.status === "ready_for_sale")
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Nombre Completo del Comprador</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Ej: José Gregorio Colmenares"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Teléfono WhatsApp (+58)</label>
            <input
              type="text"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="+58 412-555-0192"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Ciudad de Entrega</label>
            <input
              type="text"
              value={buyerCity}
              onChange={(e) => setBuyerCity(e.target.value)}
              placeholder="Valencia, Carabobo"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Canal de Venta</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="MercadoLibre">MercadoLibre Vzla (8% Comisión)</option>
              <option value="Instagram">Instagram Direct (0% Com.)</option>
              <option value="WhatsApp">Estados de WhatsApp (0% Com.)</option>
              <option value="Marketplace">FB Marketplace (0% Com.)</option>
              <option value="Venta Directa">Venta Directa Local</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Precio de Venta Final (USD)</label>
            <input
              type="number"
              step="0.01"
              value={salePriceUSD}
              onChange={(e) => setSalePriceUSD(e.target.value)}
              placeholder="480.00"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Método de Pago Recibido</label>
            <select
              value={paymentMethodUsed}
              onChange={(e) => setPaymentMethodUsed(e.target.value)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="Pago Móvil">Pago Móvil (Tasa Paralelo)</option>
              <option value="Efectivo USD">Efectivo USD (Cash)</option>
              <option value="Zelle">Zelle US</option>
              <option value="Binance USDT">Binance USDT P2P</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-6 py-2.5 rounded-full transition flex items-center space-x-2 shadow-none"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Registrar Venta & Activar Garantía</span>
          </button>
        </div>
      </form>
    </div>
  );
};
