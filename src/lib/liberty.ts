import { CourierRateConfig } from "../types";

export interface CourierDesglose {
  pesoRealLbs: number;
  pesoVolumetricoLbs: number;
  pesoCobrableLbs: number;
  embalaje: "sobre" | "caja";
  fleteUSD: number;
  combustibleUSD: number;
  gastosOperacionalesUSD: number;
  gestionAduanalUSD: number;
  seguroUSD: number;
  baseImponibleIVA: number;
  ivaUSD: number;
  totalCourierUSD: number;
  detalle: string[];
}

export interface CourierInput {
  weightLbs: number;
  largoIn?: number;
  altoIn?: number;
  profundidadIn?: number;
  fobUSD: number;
  courier: CourierRateConfig;
  embalaje: "sobre" | "caja";
}

/**
 * Calcula el costo de courier con desglose completo Liberty Express.
 *
 * Reglas:
 * - Si embalaje === 'sobre': tarifa plana ~minFee (sobre $17-20), peso real
 * - Si embalaje === 'caja': se cobra MAYOR entre peso real y volumétrico
 * - El mínimo de $25 aplica SOLO al flete cuando peso cobrable < 3 lb
 * - Los recargos (combustible, G.Op, gestión aduanal, IVA, seguro) se suman SIEMPRE
 */
export function calcularCourier(input: CourierInput): CourierDesglose {
  const { weightLbs, largoIn = 0, altoIn = 0, profundidadIn = 0, fobUSD, courier, embalaje } = input;

  const pesoRealLbs = Math.max(weightLbs, 0.1);

  // Peso volumétrico (solo aplica para caja)
  let pesoVolumetricoLbs = 0;
  if (embalaje === "caja" && largoIn > 0 && altoIn > 0 && profundidadIn > 0 && courier.divisorVolumetrico > 0) {
    const volumenPulgadas3 = largoIn * altoIn * profundidadIn;
    pesoVolumetricoLbs = volumenPulgadas3 / courier.divisorVolumetrico;
  }

  // Peso cobrable: el mayor entre real y volumétrico (para caja)
  let pesoCobrableLbs: number;
  let fleteUSD: number;

  if (embalaje === "sobre") {
    // Sobre = tarifa plana
    pesoCobrableLbs = pesoRealLbs;
    fleteUSD = Math.max(courier.minFeeUSD, pesoRealLbs * courier.ratePerLbUSD);
  } else {
    pesoCobrableLbs = Math.max(pesoRealLbs, pesoVolumetricoLbs);
    // Mínimo $25 aplica SOLO al flete cuando peso cobrable < 3 lb
    const minWeight = courier.minWeightLbs || 3;
    const fleteBase = pesoCobrableLbs * courier.ratePerLbUSD;
    if (pesoCobrableLbs < minWeight) {
      // Aplica mínimo al flete
      fleteUSD = Math.max(courier.minFeeUSD, fleteBase);
    } else {
      fleteUSD = fleteBase;
    }
  }

  // Recargos
  const combustibleUSD = pesoCobrableLbs * courier.combustiblePorLbUSD;
  const gastosOperacionalesUSD = pesoCobrableLbs * courier.gastosOperacionalesPorLbUSD;
  const gestionAduanalUSD = courier.customsFeeUSD;
  const seguroUSD = (fobUSD * courier.insurancePercent) / 100;

  // IVA: 16% sobre (flete + combustible + G.Op + gestión aduanal)
  const baseImponibleIVA = fleteUSD + combustibleUSD + gastosOperacionalesUSD + gestionAduanalUSD;
  const ivaUSD = (baseImponibleIVA * courier.ivaPorcentaje) / 100;

  const totalCourierUSD = fleteUSD + combustibleUSD + gastosOperacionalesUSD + gestionAduanalUSD + seguroUSD + ivaUSD;

  const detalle: string[] = [];
  detalle.push(`Embalaje: ${embalaje === "sobre" ? "📨 Sobre" : "📦 Caja"}`);
  detalle.push(`Peso Real: ${pesoRealLbs.toFixed(2)} lbs`);
  if (embalaje === "caja" && pesoVolumetricoLbs > 0) {
    detalle.push(`Dimensiones: ${largoIn}×${altoIn}×${profundidadIn} in → Vol. ${(largoIn * altoIn * profundidadIn).toFixed(0)} in³`);
    detalle.push(`Peso Volumétrico: ${pesoVolumetricoLbs.toFixed(2)} lbs (÷ ${courier.divisorVolumetrico})`);
    detalle.push(`Peso Cobrable (mayor): ${pesoCobrableLbs.toFixed(2)} lbs`);
  }
  detalle.push(`Flete: $${fleteUSD.toFixed(2)} (${pesoCobrableLbs.toFixed(2)} lbs × $${courier.ratePerLbUSD}/lb)`);
  detalle.push(`Combustible: $${combustibleUSD.toFixed(2)} (${pesoCobrableLbs.toFixed(2)} × $${courier.combustiblePorLbUSD}/lb)`);
  detalle.push(`Gastos Operacionales: $${gastosOperacionalesUSD.toFixed(2)} (${pesoCobrableLbs.toFixed(2)} × $${courier.gastosOperacionalesPorLbUSD}/lb)`);
  detalle.push(`Gestión Aduanal: $${gestionAduanalUSD.toFixed(2)}`);
  detalle.push(`Seguro: $${seguroUSD.toFixed(2)} (${courier.insurancePercent}% de $${fobUSD.toFixed(2)} FOB)`);
  detalle.push(`IVA ${courier.ivaPorcentaje}%: $${ivaUSD.toFixed(2)} (sobre $${baseImponibleIVA.toFixed(2)})`);

  return {
    pesoRealLbs,
    pesoVolumetricoLbs,
    pesoCobrableLbs,
    embalaje,
    fleteUSD,
    combustibleUSD,
    gastosOperacionalesUSD,
    gestionAduanalUSD,
    seguroUSD,
    baseImponibleIVA,
    ivaUSD,
    totalCourierUSD,
    detalle,
  };
}

/**
 * Calculate landed cost with full courier breakdown.
 * Supersedes the old calculateLandedCost in currency.ts.
 */
export function calcularCostoTotalLanded(
  basePriceUSD: number,
  domesticShippingUSD: number,
  courierInput: CourierInput,
  restorationCostUSD: number
): {
  freightCostUSD: number;
  totalLandedUSD: number;
  courierDesglose: CourierDesglose;
} {
  const courierDesglose = calcularCourier(courierInput);
  const freightCostUSD = courierDesglose.totalCourierUSD;
  const totalLandedUSD = basePriceUSD + domesticShippingUSD + freightCostUSD + restorationCostUSD;
  return { freightCostUSD, totalLandedUSD, courierDesglose };
}