import React, { useState } from "react";
import { AppSettings } from "../../types";
import { Calculator, DollarSign, Truck, Percent, RefreshCw, ArrowRightLeft, ShieldAlert } from "lucide-react";

interface CalculatorsModuleProps {
  settings: AppSettings;
}

export const CalculatorsModule: React.FC<CalculatorsModuleProps> = ({ settings }) => {
  // 1. Freight Calculator State
  const activeCourier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];
  const [weightLbs, setWeightLbs] = useState<number>(3.5);
  const [courierRate, setCourierRate] = useState<number>(activeCourier?.ratePerLbUSD || 4.5);
  const [courierMin, setCourierMin] = useState<number>(activeCourier?.minFeeUSD || 15.0);
  const [extraInsurance, setExtraInsurance] = useState<number>(0);

  const rawFreight = weightLbs * courierRate;
  const finalFreight = Math.max(rawFreight, courierMin) + extraInsurance;

  // 2. Exchange Rate & Gap Calculator State
  const [usdAmount, setUsdAmount] = useState<number>(100);
  const [vesAmount, setVesAmount] = useState<number>(usdAmount * settings.paraleloRate);

  const gapPercent = ((settings.paraleloRate - settings.bcvRate) / settings.bcvRate) * 100;

  const handleUsdChange = (val: number) => {
    setUsdAmount(val);
    setVesAmount(val * settings.paraleloRate);
  };

  const handleVesChange = (val: number) => {
    setVesAmount(val);
    setUsdAmount(settings.paraleloRate > 0 ? val / settings.paraleloRate : 0);
  };

  // 3. Flip ROI & Max Bid Calculator State
  const [targetSalePrice, setTargetSalePrice] = useState<number>(380);
  const [estimatedRepairCost, setEstimatedRepairCost] = useState<number>(45);
  const [targetRoiPercent, setTargetRoiPercent] = useState<number>(35);
  const [sellingCommissionsPercent, setSellingCommissionsPercent] = useState<number>(8); // MercadoLibre Vzla fee

  const sellingFees = targetSalePrice * (sellingCommissionsPercent / 100);
  const netRevenue = targetSalePrice - sellingFees;
  const totalCostLimit = netRevenue / (1 + targetRoiPercent / 100);
  const maxBidUSD = Math.max(0, totalCostLimit - finalFreight - estimatedRepairCost);
  const estimatedProfitUSD = netRevenue - (maxBidUSD + finalFreight + estimatedRepairCost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e6e4e0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#121212] flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#121212]" />
            <span>Calculadoras Financieras & Logísticas</span>
          </h1>
          <p className="text-xs text-[#616161] mt-1">
            Herramientas de cálculo rápido para envíos Miami → Venezuela, tasas de cambio BCV vs Paralelo y simulación de Puja Máxima.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-[#e6e4e0]/50 px-3.5 py-1.5 rounded-full border border-[#e6e4e0] text-xs">
          <span className="text-[#616161]">Courier Activo:</span>
          <span className="font-semibold text-[#121212]">{activeCourier?.name || "Liberty Express"}</span>
          <span className="font-mono text-[#1a5336] bg-[#e6f4ea] px-2 py-0.5 rounded-full text-[11px] font-medium">
            ${courierRate}/lb
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. CALCULADORA DE FLETE CASILLERO MIAMI -> VE */}
        <div className="bg-white rounded-2xl border border-[#e6e4e0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e6e4e0]">
            <h2 className="text-sm font-bold text-[#121212] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#121212]" />
              <span>Flete Casillero Miami → VE</span>
            </h2>
            <span className="text-[10px] font-mono text-[#616161] bg-[#e6e4e0]/60 px-2 py-0.5 rounded-full">
              Puerta a Puerta
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-xs text-[#616161] mb-1">Peso del Paquete (Libras / lbs)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weightLbs}
                onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-2 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#616161] mb-1">Tarifa/lb ($USD)</label>
                <input
                  type="number"
                  step="0.5"
                  value={courierRate}
                  onChange={(e) => setCourierRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-2 text-xs font-mono text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#616161] mb-1">Cobro Mínimo ($USD)</label>
                <input
                  type="number"
                  step="1"
                  value={courierMin}
                  onChange={(e) => setCourierMin(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-2 text-xs font-mono text-[#121212]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Seguro / Gastos Adicionales ($USD)</label>
              <input
                type="number"
                step="1"
                value={extraInsurance}
                onChange={(e) => setExtraInsurance(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-2 text-xs font-mono text-[#121212]"
              />
            </div>
          </div>

          <div className="bg-[#121212] text-white rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-white/70">
              <span>Cálculo por Peso ({weightLbs} lbs x ${courierRate}):</span>
              <span className="font-mono">${rawFreight.toFixed(2)}</span>
            </div>
            {rawFreight < courierMin && (
              <div className="text-[10px] text-amber-300 font-mono">
                * Aplica tarifa mínima del courier (${courierMin} USD)
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-white/20 text-sm font-bold">
              <span>Costo Total de Flete:</span>
              <span className="text-emerald-400 font-mono text-lg">${finalFreight.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* 2. CALCULADORA DE TASAS DE CAMBIO (VES / USD) */}
        <div className="bg-white rounded-2xl border border-[#e6e4e0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e6e4e0]">
            <h2 className="text-sm font-bold text-[#121212] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#121212]" />
              <span>Convertidor VES / USD Vzla</span>
            </h2>
            <span className="text-[10px] font-mono text-[#1a5336] bg-[#e6f4ea] px-2 py-0.5 rounded-full font-medium">
              Brecha {gapPercent.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#f8f7f5] p-2.5 rounded-xl border border-[#e6e4e0]">
            <div>
              <span className="text-[#616161]">Dólar Paralelo:</span>
              <p className="font-mono font-bold text-[#121212]">{Number(settings.paraleloRate || 0).toFixed(2)} VES/USD</p>
            </div>
            <div>
              <span className="text-[#616161]">Dólar BCV Oficial:</span>
              <p className="font-mono font-bold text-[#121212]">{Number(settings.bcvRate || 0).toFixed(2)} VES/USD</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-xs text-[#616161] mb-1">Monto en Dólares ($USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#616161] text-xs font-mono">$</span>
                <input
                  type="number"
                  value={usdAmount}
                  onChange={(e) => handleUsdChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-xl pl-7 pr-3 py-2 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>

            <div className="flex items-center justify-center my-1 text-[#616161]">
              <ArrowRightLeft className="w-4 h-4" />
            </div>

            <div>
              <label className="block text-xs text-[#616161] mb-1">Monto en Bolívares (VES Paralelo)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#616161] text-xs font-mono">Bs.</span>
                <input
                  type="number"
                  value={Math.round(vesAmount * 100) / 100}
                  onChange={(e) => handleVesChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#e6e4e0] rounded-xl pl-10 pr-3 py-2 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#e6f4ea] rounded-xl border border-[#ceead6] text-xs text-[#137333] space-y-1">
            <div className="flex justify-between font-mono">
              <span>Al Tasa BCV Oficial:</span>
              <span className="font-bold">Bs. {(usdAmount * settings.bcvRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Al Tasa Paralelo Vzla:</span>
              <span className="font-bold">Bs. {(usdAmount * settings.paraleloRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 3. CALCULADORA DE PUJA MÁXIMA & MARGEN DE GANANCIA (FLIPMATH) */}
        <div className="bg-white rounded-2xl border border-[#e6e4e0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e6e4e0]">
            <h2 className="text-sm font-bold text-[#121212] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#121212]" />
              <span>Simulador FlipMath ROI</span>
            </h2>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              Puja Máxima
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Precio Venta Estimado VE ($USD)</label>
              <input
                type="number"
                value={targetSalePrice}
                onChange={(e) => setTargetSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#616161] mb-1">Costo Repuestos ($USD)</label>
                <input
                  type="number"
                  value={estimatedRepairCost}
                  onChange={(e) => setEstimatedRepairCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#616161] mb-1">ROI Objetivo (%)</label>
                <input
                  type="number"
                  value={targetRoiPercent}
                  onChange={(e) => setTargetRoiPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#121212]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#616161] mb-1">Comisión de Venta (%)</label>
              <input
                type="number"
                value={sellingCommissionsPercent}
                onChange={(e) => setSellingCommissionsPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8f7f5] border border-[#e6e4e0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#121212]"
              />
            </div>
          </div>

          <div className="border-t border-[#e6e4e0] pt-3 space-y-2">
            <div className="p-3 bg-[#f8f7f5] rounded-xl border border-[#e6e4e0] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#616161]">
                <span>Flete Miami Calculado:</span>
                <span className="font-mono text-[#121212]">${finalFreight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#616161]">
                <span>Comisión Venta Vzla:</span>
                <span className="font-mono text-[#121212]">${sellingFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#121212] pt-1 border-t border-[#e6e4e0]">
                <span>Puja Máxima Recomendada:</span>
                <span className="font-mono text-[#1a5336] text-sm">${maxBidUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between font-medium text-[#137333] pt-0.5">
                <span>Ganancia Neta Estimada:</span>
                <span className="font-mono">${estimatedProfitUSD.toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
