import React, { useState } from "react";
import { FlipItem } from "../../types";
import { ShoppingBag, Plus, X, PackagePlus } from "lucide-react";
import { formatUSD } from "../../lib/currency";
import { useToast } from "../Toast";

interface PurchasesModuleProps {
  flips: FlipItem[];
  onAddPurchase: (flipId: string, purchaseData: any) => void;
  onAddManualFlip: (flip: FlipItem) => void;
  onViewFlipDetails: (flip: FlipItem) => void;
}

export const PurchasesModule: React.FC<PurchasesModuleProps> = ({
  flips,
  onAddPurchase,
  onAddManualFlip,
  onViewFlipDetails,
}) => {
  const { toast } = useToast();
  const [showManual, setShowManual] = useState(false);

  // Manual add form
  const [mTitulo, setMTitulo] = useState("");
  const [mPrecio, setMPrecio] = useState("");
  const [mProveedor, setMProveedor] = useState("eBay");
  const [mTracking, setMTracking] = useState("");
  const [mMetodo, setMMetodo] = useState("Zelle");
  const [mFecha, setMFecha] = useState(new Date().toISOString().split("T")[0]);
  const [mPeso, setMPeso] = useState("3.5");
  const [mUrl, setMUrl] = useState("");

  const purchasedItems = flips.filter((f) => f.purchase || f.status !== "saved_opportunity");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitulo.trim()) {
      toast({ type: "warning", title: "Falta el título", message: "Describe el producto que compraste." });
      return;
    }
    const precio = parseFloat(mPrecio) || 0;
    const newFlip: FlipItem = {
      id: `FLIP-${Date.now()}`,
      title: mTitulo.trim(),
      brand: mTitulo.trim().split(" ")[0] || "Genérico",
      model: mTitulo.trim().slice(0, 40),
      category: "Otros",
      platform: mProveedor || "eBay",
      status: "purchased",
      sourceUrl: mUrl.trim(),
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purchase: {
        priceUSD: precio,
        shippingUSUSD: 0,
        taxUSD: 0,
        totalUSD: precio,
        purchaseDate: mFecha,
        supplierName: mProveedor || "eBay",
        trackingUS: mTracking.trim(),
        paymentMethod: mMetodo,
      },
      logistics: {
        currentLeg: 1,
        weightLbs: parseFloat(mPeso) || 3.5,
        freightCostUSD: 20,
        trackingNumber: mTracking.trim() || `LIB-${Math.floor(100000 + Math.random() * 900000)}-VZ`,
        carrierStatusText: "Pendiente de envío hacia casillero Miami",
      },
      timeline: [
        {
          id: `TL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Usuario",
          title: "Compra Registrada Manualmente",
          description: `Pagado ${precio} USD a ${mProveedor || "proveedor"} vía ${mMetodo}.`,
          stage: "Compra",
        },
      ],
    };
    onAddManualFlip(newFlip);
    setShowManual(false);
    setMTitulo("");
    setMPrecio("");
    setMTracking("");
    setMUrl("");
    toast({ type: "success", title: "Compra registrada", message: "El flip quedó activo en Tránsito & Logística." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5 text-[#121212]" />
            <span>Módulo de Registro de Compras & Proveedores</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Compras Realizadas ({purchasedItems.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Control de pagos en origen (Zelle, Binance USDT, PayPal), facturas de compra y números de guía interna hacia el casillero de Miami.
          </p>
        </div>

        <button
          onClick={() => setShowManual(true)}
          className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2.5 rounded-full transition flex items-center space-x-2 shadow-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar compra manual</span>
        </button>
      </div>

      {/* Empty state */}
      {purchasedItems.length === 0 && (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-[#616161] mx-auto mb-3" />
          <h3 className="text-base font-serif font-normal text-[#121212]">No hay compras registradas</h3>
          <p className="text-xs text-[#616161] mt-1 font-sans max-w-md mx-auto">
            Registra la primera compra manualmente, o convierte una oportunidad evaluada por FlipMaster desde el módulo de Oportunidades.
          </p>
          <button
            onClick={() => setShowManual(true)}
            className="mt-4 bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition inline-flex items-center space-x-2"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Registrar compra manual</span>
          </button>
        </div>
      )}

      {/* Purchases List Table */}
      {purchasedItems.length > 0 && (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
          <h3 className="font-serif text-sm font-normal text-[#121212] uppercase tracking-wider mb-4">
            Historial de Adquisiciones Registradas
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#121212]">
              <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-lg">Producto / Marca</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Monto Pagado (USD)</th>
                  <th className="p-3">Método Pago</th>
                  <th className="p-3">Tracking US</th>
                  <th className="p-3 text-right rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e4e0]">
                {purchasedItems.map((flip) => {
                  const p = flip.purchase;
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
                            <div className="text-[10px] text-[#616161]">{flip.platform} • {flip.category}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-medium text-[#121212]">{p?.supplierName || flip.platform}</td>

                      <td className="p-3">
                        <div className="font-bold text-[#121212]">{formatUSD(p?.totalUSD || flip.analysis?.flipMath.basePriceUSD || 0)}</div>
                        <div className="text-[10px] text-[#616161]">Fecha: {p?.purchaseDate || "Reciente"}</div>
                      </td>

                      <td className="p-3">
                        <span className="bg-[#e6e4e0] px-2 py-0.5 rounded-full text-[11px] font-mono text-[#121212]">
                          {p?.paymentMethod || "Zelle"}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[#616161] text-[11px]">
                        {p?.trackingUS ? (
                          <span className="text-[#121212] font-semibold">{p.trackingUS}</span>
                        ) : (
                          <span className="text-[#616161]">Pendiente de guía</span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => onViewFlipDetails(flip)}
                          className="bg-[#121212] hover:bg-[#282828] text-white font-medium px-3 py-1.5 rounded-full text-xs transition shadow-none"
                        >
                          Ficha 360°
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e6e4e0] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e6e4e0] pb-4">
              <div className="flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-[#121212]" />
                <h3 className="text-lg font-serif font-normal text-[#121212]">Registrar Compra Manual</h3>
              </div>
              <button onClick={() => setShowManual(false)} className="text-[#616161] hover:text-[#121212]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">Producto comprado</label>
                <input
                  type="text"
                  value={mTitulo}
                  onChange={(e) => setMTitulo(e.target.value)}
                  placeholder="Ej: MacBook Pro 15 2019 - Pantalla rota"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Precio pagado (USD)</label>
                  <input type="number" step="0.01" value={mPrecio} onChange={(e) => setMPrecio(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Peso estimado (lbs)</label>
                  <input type="number" step="0.1" value={mPeso} onChange={(e) => setMPeso(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Proveedor</label>
                  <input type="text" value={mProveedor} onChange={(e) => setMProveedor(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#121212]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Método de pago</label>
                  <select value={mMetodo} onChange={(e) => setMMetodo(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#121212]">
                    <option>Zelle</option>
                    <option>Binance USDT</option>
                    <option>Pago Móvil</option>
                    <option>Efectivo USD</option>
                    <option>Banesco Panamá</option>
                    <option>Zinli</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Fecha de compra</label>
                  <input type="date" value={mFecha} onChange={(e) => setMFecha(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#121212]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#616161] mb-1">Tracking US (opcional)</label>
                  <input type="text" value={mTracking} onChange={(e) => setMTracking(e.target.value)} className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">URL del anuncio (opcional)</label>
                <input type="url" value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="https://www.ebay.com/itm/..." className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#121212]" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowManual(false)} className="bg-[#e6e4e0] hover:bg-[#d8d6d2] text-[#121212] font-medium text-xs px-4 py-2 rounded-full transition">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-4 py-2 rounded-full transition">
                  Registrar compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
