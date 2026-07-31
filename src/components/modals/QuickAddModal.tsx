import React, { useState } from "react";
import { FlipItem, Transaction, AppSettings } from "../../types";
import { X, ShoppingBag, DollarSign, Boxes, Bell, Plus, CheckCircle2 } from "lucide-react";
import { formatUSD, formatVES } from "../../lib/currency";

export type QuickAddType = "purchase" | "sale" | "inventory" | "alert" | null;

interface QuickAddModalProps {
  type: QuickAddType;
  flips: FlipItem[];
  settings: AppSettings;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onAddFlip: (flip: FlipItem) => void;
  onRecordSale: (flipId: string, saleData: any) => void;
  onCreatePriceAlert?: (alert: { title: string; targetPriceUSD: number; currentPriceUSD: number; sourceUrl: string }) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  type,
  flips,
  settings,
  onClose,
  onAddTransaction,
  onAddFlip,
  onRecordSale,
  onCreatePriceAlert,
}) => {
  if (!type) return null;

  // Form states
  // Purchase State
  const [purchaseTitle, setPurchaseTitle] = useState("");
  const [purchasePriceUSD, setPurchasePriceUSD] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("eBay");
  const [purchaseCategory, setPurchaseCategory] = useState<any>("Laptops & MacBooks");
  const [purchasePayMethod, setPurchasePayMethod] = useState<any>("Zelle");

  // Sale State
  const [selectedFlipId, setSelectedFlipId] = useState(
    flips.find((f) => f.status === "listed" || f.status === "ready_for_sale")?.id || flips[0]?.id || ""
  );
  const [salePriceUSD, setSalePriceUSD] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCity, setBuyerCity] = useState("Caracas");
  const [saleChannel, setSaleChannel] = useState<any>("MercadoLibre");
  const [salePayMethod, setSalePayMethod] = useState<any>("Pago Móvil");

  // Inventory State
  const [invTitle, setInvTitle] = useState("");
  const [invBrand, setInvBrand] = useState("");
  const [invModel, setInvModel] = useState("");
  const [invTargetPriceUSD, setInvTargetPriceUSD] = useState("");
  const [invLocation, setInvLocation] = useState("Vitrina Maracay");
  const [invCondition, setInvCondition] = useState<any>("A");

  // Alert State
  const [alertTitle, setAlertTitle] = useState("");
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertCurrentPrice, setAlertCurrentPrice] = useState("");
  const [alertUrl, setAlertUrl] = useState("");

  const availableForSale = flips.filter(
    (f) => f.status === "ready_for_sale" || f.status === "listed" || f.inventory
  );

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const priceUSD = parseFloat(purchasePriceUSD) || 0;
    if (!purchaseTitle || priceUSD <= 0) {
      alert("Ingresa un título y un precio válido.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Create Flip Item
    const newFlip: FlipItem = {
      id: `FLIP-${Date.now().toString().slice(-4)}`,
      title: purchaseTitle,
      brand: purchaseTitle.split(" ")[0] || "Generico",
      model: purchaseTitle.split(" ").slice(1).join(" ") || "Equipo",
      category: purchaseCategory,
      platform: purchaseSupplier,
      status: "purchased",
      sourceUrl: "https://ebay.com",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purchase: {
        priceUSD,
        shippingUSUSD: 0,
        taxUSD: 0,
        totalUSD: priceUSD,
        purchaseDate: todayStr,
        supplierName: purchaseSupplier,
        paymentMethod: purchasePayMethod,
      },
      logistics: {
        currentLeg: 1,
        weightLbs: 3.0,
        freightCostUSD: 13.5,
        trackingNumber: `LIB-${Math.floor(100000 + Math.random() * 900000)}-VZ`,
        carrierStatusText: "Comprado y registrado vía QuickAdd",
      },
      timeline: [
        {
          id: `TL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Usuario (QuickAdd)",
          title: "Compra Registrada Rápida",
          description: `Compra directa por ${formatUSD(priceUSD)} en ${purchaseSupplier}.`,
          stage: "Compra",
        },
      ],
    };

    onAddFlip(newFlip);

    // Record Transaction
    onAddTransaction({
      date: todayStr,
      type: "expense",
      category: "Compra Producto",
      amountUSD: priceUSD,
      amountVES: priceUSD * settings.paraleloRate,
      exchangeRate: settings.paraleloRate,
      currency: "USD",
      paymentMethod: purchasePayMethod,
      notes: `Compra rápida de ${purchaseTitle} a ${purchaseSupplier}`,
    });

    onClose();
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    const priceUSD = parseFloat(salePriceUSD) || 0;
    if (!selectedFlipId || priceUSD <= 0) {
      alert("Selecciona un equipo de inventario y asigna un precio de venta.");
      return;
    }

    const priceVES = priceUSD * settings.paraleloRate;
    const saleData = {
      channel: saleChannel,
      salePriceUSD: priceUSD,
      salePriceVES: priceVES,
      exchangeRateUsed: settings.paraleloRate,
      platformCommissionUSD: Math.round(priceUSD * 0.05 * 100) / 100,
      netProceedsUSD: Math.round(priceUSD * 0.95 * 100) / 100,
      saleDate: new Date().toISOString().split("T")[0],
      buyerName: buyerName || "Cliente Contado",
      buyerPhone: buyerPhone || "+58 412-0000000",
      buyerCity: buyerCity || "Caracas",
      warrantyDays: 30,
      paymentMethodUsed: salePayMethod,
    };

    onRecordSale(selectedFlipId, saleData);
    onClose();
  };

  const handleSubmitInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPrice = parseFloat(invTargetPriceUSD) || 0;
    if (!invTitle || targetPrice <= 0) {
      alert("Ingresa un título y precio objetivo válido.");
      return;
    }

    const brand = invBrand || invTitle.split(" ")[0] || "Apple";
    const model = invModel || "Equipo";

    const newFlip: FlipItem = {
      id: `FLIP-${Date.now().toString().slice(-4)}`,
      title: invTitle,
      brand,
      model,
      category: "Laptops & MacBooks",
      platform: "Local",
      status: "ready_for_sale",
      sourceUrl: "",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inventory: {
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        serialNumber: `SN-${Math.floor(100000 + Math.random() * 899999)}`,
        physicalLocationTag: invLocation,
        conditionGrade: invCondition,
        targetPriceUSD: targetPrice,
        minAcceptablePriceUSD: Math.round(targetPrice * 0.9 * 100) / 100,
        testedOk: true,
      },
      timeline: [
        {
          id: `TL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Usuario (QuickAdd)",
          title: "Item Ingresado a Inventario",
          description: `Registrado en estante ${invLocation} por ${formatUSD(targetPrice)}.`,
          stage: "Inventario",
        },
      ],
    };

    onAddFlip(newFlip);
    onClose();
  };

  const handleSubmitAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const targetP = parseFloat(alertTargetPrice) || 0;
    const currentP = parseFloat(alertCurrentPrice) || 0;
    if (!alertTitle || targetP <= 0) {
      alert("Ingresa un nombre y un precio objetivo válido.");
      return;
    }

    if (onCreatePriceAlert) {
      onCreatePriceAlert({
        title: alertTitle,
        targetPriceUSD: targetP,
        currentPriceUSD: currentP || targetP * 0.95,
        sourceUrl: alertUrl || "https://ebay.com",
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#e6e4e0] rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#616161] hover:text-[#121212] p-1.5 rounded-full hover:bg-[#e6e4e0] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-[#e6e4e0] pb-4">
          <div className="w-10 h-10 rounded-full bg-[#121212] text-white flex items-center justify-center shrink-0">
            {type === "purchase" && <ShoppingBag className="w-5 h-5" />}
            {type === "sale" && <DollarSign className="w-5 h-5" />}
            {type === "inventory" && <Boxes className="w-5 h-5" />}
            {type === "alert" && <Bell className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-serif text-xl font-normal text-[#121212]">
              {type === "purchase" && "Registrar Nueva Compra"}
              {type === "sale" && "Registrar Venta Directa"}
              {type === "inventory" && "Agregar Item a Inventario"}
              {type === "alert" && "Crear Alerta de Precio eBay"}
            </h3>
            <p className="text-xs text-[#616161]">
              Acción rápida sin salir del panel de control
            </p>
          </div>
        </div>

        {/* Modal Form 1: Purchase */}
        {type === "purchase" && (
          <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">
                Título / Descripción del Producto *
              </label>
              <input
                type="text"
                required
                value={purchaseTitle}
                onChange={(e) => setPurchaseTitle(e.target.value)}
                placeholder="Ej. MacBook Air M1 2020 8GB 256GB"
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Monto Compra (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={purchasePriceUSD}
                  onChange={(e) => setPurchasePriceUSD(e.target.value)}
                  placeholder="220.00"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono font-bold text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Proveedor / Plataforma
                </label>
                <select
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="eBay">eBay</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Swappa">Swappa</option>
                  <option value="MercadoLibre US">MercadoLibre US</option>
                  <option value="Proveedor Directo">Proveedor Directo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Categoría
                </label>
                <select
                  value={purchaseCategory}
                  onChange={(e) => setPurchaseCategory(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="Laptops & MacBooks">Laptops & MacBooks</option>
                  <option value="Consolas & Gaming">Consolas & Gaming</option>
                  <option value="Smartphones">Smartphones</option>
                  <option value="Componentes PC">Componentes PC</option>
                  <option value="Audio & Video">Audio & Video</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Método de Pago
                </label>
                <select
                  value={purchasePayMethod}
                  onChange={(e) => setPurchasePayMethod(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="Zelle">Zelle</option>
                  <option value="Binance USDT">Binance USDT</option>
                  <option value="Banesco Panamá">Banesco Panamá</option>
                  <option value="Efectivo USD">Efectivo USD</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#616161] hover:text-[#121212] rounded-full border border-[#e6e4e0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-[#282828] rounded-full transition flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Guardar Compra</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Form 2: Sale */}
        {type === "sale" && (
          <form onSubmit={handleSubmitSale} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">
                Seleccionar Producto de Inventario *
              </label>
              <select
                value={selectedFlipId}
                onChange={(e) => setSelectedFlipId(e.target.value)}
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
              >
                {availableForSale.length === 0 ? (
                  <option value="">No hay productos listos para venta en inventario</option>
                ) : (
                  availableForSale.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.inventory?.sku || f.id}) - Objetivo: {formatUSD(f.inventory?.targetPriceUSD || f.analysis?.flipMath.estimatedMarketPriceVzlaUSD || 0)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Precio de Venta Real (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={salePriceUSD}
                  onChange={(e) => setSalePriceUSD(e.target.value)}
                  placeholder="550.00"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono font-bold text-[#1a5336] focus:ring-1 focus:ring-[#121212]"
                />
                {salePriceUSD && (
                  <span className="text-[10px] text-[#616161] mt-1 block font-mono">
                    ≈ {formatVES(parseFloat(salePriceUSD) * settings.paraleloRate)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Canal de Venta
                </label>
                <select
                  value={saleChannel}
                  onChange={(e) => setSaleChannel(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="MercadoLibre">MercadoLibre</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="Venta Directa">Venta Directa</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Nombre del Comprador
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Carlos Rodríguez"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+58 412 5550192"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  placeholder="Caracas"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Método de Pago
                </label>
                <select
                  value={salePayMethod}
                  onChange={(e) => setSalePayMethod(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Efectivo USD">Efectivo USD</option>
                  <option value="Binance USDT">Binance USDT</option>
                  <option value="Banesco Panamá">Banesco Panamá</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#616161] hover:text-[#121212] rounded-full border border-[#e6e4e0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-[#282828] rounded-full transition flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registrar Venta</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Form 3: Inventory */}
        {type === "inventory" && (
          <form onSubmit={handleSubmitInventory} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">
                Título del Producto en Stock *
              </label>
              <input
                type="text"
                required
                value={invTitle}
                onChange={(e) => setInvTitle(e.target.value)}
                placeholder="Ej. PlayStation 5 Digital Edition Reacondicionada"
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={invBrand}
                  onChange={(e) => setInvBrand(e.target.value)}
                  placeholder="Sony"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Modelo / Especificación
                </label>
                <input
                  type="text"
                  value={invModel}
                  onChange={(e) => setInvModel(e.target.value)}
                  placeholder="PS5 Digital 825GB"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Precio Venta USD *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invTargetPriceUSD}
                  onChange={(e) => setInvTargetPriceUSD(e.target.value)}
                  placeholder="480.00"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono font-bold text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Grado Cosmético
                </label>
                <select
                  value={invCondition}
                  onChange={(e) => setInvCondition(e.target.value)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                >
                  <option value="A+">Grado A+ (Como Nuevo)</option>
                  <option value="A">Grado A (Excelente)</option>
                  <option value="B">Grado B (Detalles Menores)</option>
                  <option value="C">Grado C (Usado Funcional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Ubicación Estante
                </label>
                <input
                  type="text"
                  value={invLocation}
                  onChange={(e) => setInvLocation(e.target.value)}
                  placeholder="Vitrina Maracay"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#616161] hover:text-[#121212] rounded-full border border-[#e6e4e0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-[#282828] rounded-full transition flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Agregar a Inventario</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Form 4: Price Alert */}
        {type === "alert" && (
          <form onSubmit={handleSubmitAlert} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">
                Nombre del Artículo / Modelo a Monitorear *
              </label>
              <input
                type="text"
                required
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="Ej. MacBook Pro 14 M1 Pro 16GB"
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Precio Objetivo Máximo de Compra (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(e.target.value)}
                  placeholder="550.00"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono font-bold text-[#121212] focus:ring-1 focus:ring-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#616161] mb-1">
                  Precio Actual Detectado en eBay (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={alertCurrentPrice}
                  onChange={(e) => setAlertCurrentPrice(e.target.value)}
                  placeholder="510.00"
                  className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs font-mono font-bold text-[#1a5336] focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#616161] mb-1">
                Enlace / URL de la Búsqueda o Anuncio en eBay
              </label>
              <input
                type="url"
                value={alertUrl}
                onChange={(e) => setAlertUrl(e.target.value)}
                placeholder="https://www.ebay.com/itm/..."
                className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#616161] hover:text-[#121212] rounded-full border border-[#e6e4e0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#121212] hover:bg-[#282828] rounded-full transition flex items-center space-x-1"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Crear Alerta de Precio</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
