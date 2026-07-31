import { calcularCourier } from "./liberty";

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatVES(amount: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatPercent(percent: number): string {
  return `${(percent || 0).toFixed(2)}%`;
}

/**
 * Wrapper del cálculo de courier: delega en calcularCourier() de lib/liberty.ts
 * (desglose real Liberty: flete + combustible + G.Op + gestión aduanal + seguro + IVA,
 * peso volumétrico y regla del mayor). Evita dos fórmulas de courier compitiendo.
 */
export function calculateLandedCost(
  basePriceUSD: number,
  shippingUSUSD: number,
  courierRatePerLbUSD: number,
  minCourierFeeUSD: number,
  weightLbs: number,
  restorationCostUSD: number
): {
  freightCostUSD: number;
  totalLandedUSD: number;
} {
  const { totalCourierUSD } = calcularCourier({
    weightLbs,
    fobUSD: basePriceUSD,
    courier: {
      id: "liberty_express",
      name: "Liberty Express Miami (Aéreo)",
      type: "air",
      ratePerLbUSD: courierRatePerLbUSD,
      minFeeUSD: minCourierFeeUSD,
      minWeightLbs: 3,
      combustiblePorLbUSD: 0.75,
      gastosOperacionalesPorLbUSD: 0.75,
      insurancePercent: 5,
      customsFeeUSD: 1.0,
      ivaPorcentaje: 16,
      divisorVolumetrico: 166,
      embalaje: "caja",
      avgDeliveryDays: 10,
      trackingBaseUrl: "",
      addressCasilleroMiami: "",
      active: true,
    },
    embalaje: "caja",
  });
  const freightCostUSD = totalCourierUSD;
  const totalLandedUSD = basePriceUSD + shippingUSUSD + freightCostUSD + restorationCostUSD;

  return { freightCostUSD, totalLandedUSD };
}

export function calculateFlipMetrics(
  totalLandedUSD: number,
  targetSaleUSD: number,
  platformCommissionPercent = 8.0
): {
  commissionUSD: number;
  netProceedsUSD: number;
  netProfitUSD: number;
  roiPercent: number;
} {
  const commissionUSD = (targetSaleUSD * platformCommissionPercent) / 100;
  const netProceedsUSD = targetSaleUSD - commissionUSD;
  const netProfitUSD = netProceedsUSD - totalLandedUSD;
  const roiPercent = totalLandedUSD > 0 ? (netProfitUSD / totalLandedUSD) * 100 : 0;

  return {
    commissionUSD,
    netProceedsUSD,
    netProfitUSD,
    roiPercent,
  };
}
