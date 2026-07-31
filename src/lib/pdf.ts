import { AppSettings, FlipItem, FlipMasterAnalysis } from "../types";
import { formatUSD, formatVES, formatPercent } from "./currency";
import { calcularCourier } from "./liberty";

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(s: string | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorVeredicto(decision?: string): { color: string; bg: string; label: string } {
  const d = (decision || "").toUpperCase();
  if (d.includes("VALE")) return { color: "#059669", bg: "#e6f4ea", label: "✅ PUJA — VALE LA PENA" };
  if (d.includes("NO")) return { color: "#dc2626", bg: "#fef2f2", label: "⛔ NO PUJAS" };
  return { color: "#b45309", bg: "#fef7e0", label: "⚠️ CONDICIONAL / DEPENDE" };
}

const PREGUNTAS_GENERICAS: string[] = [
  "¿La batería mantiene carga? ¿Qué % de salud reporta el sistema (p.ej. Coconut Battery)?",
  "¿Está desvinculado de iCloud/MDM o bloqueo de cuenta? (solicitar prueba con IMEI/Serial)",
  "¿La pantalla funciona conectada a un monitor externo? (descarta falla de GPU/placa)",
  "¿Incluye cargador, cables y caja originales?",
  "¿Tiene historial de reparaciones previas o sellos/calcomanías de garantía rotos?",
  "¿Envías a freight-forwarder/casillero en Miami? ¿Cuál es la política de devoluciones?",
];

function asegurarPreguntas(lista?: string[]): string[] {
  const base = (lista || []).filter((q) => q && q.trim());
  for (const g of PREGUNTAS_GENERICAS) {
    if (base.length >= 5) break;
    if (!base.includes(g)) base.push(g);
  }
  return base;
}

function desgloseCourier(
  analysis: FlipMasterAnalysis | undefined,
  courier: AppSettings["couriers"][number] | undefined
): string {
  if (!analysis || !courier) return "";
  const weight = analysis.shippingToVenezuela?.estimatedWeightLbs || 3;
  const fob = analysis.flipMath?.basePriceUSD || 0;
  const r = calcularCourier({
    weightLbs: weight,
    fobUSD: fob,
    courier,
    embalaje: courier.embalaje || "caja",
  });
  return [
    `<tr><td>Peso Real</td><td class="mono">${r.pesoRealLbs.toFixed(2)} lbs</td></tr>`,
    r.pesoVolumetricoLbs > 0
      ? `<tr><td>Peso Volumétrico (÷${courier.divisorVolumetrico})</td><td class="mono">${r.pesoVolumetricoLbs.toFixed(2)} lbs</td></tr>`
      : "",
    `<tr><td>Peso Cobrable (mayor)</td><td class="mono"><b>${r.pesoCobrableLbs.toFixed(2)} lbs</b></td></tr>`,
    `<tr><td>Flete ($${courier.ratePerLbUSD}/lb)</td><td class="mono">${formatUSD(r.fleteUSD)}</td></tr>`,
    `<tr><td>Combustible ($${courier.combustiblePorLbUSD}/lb)</td><td class="mono">${formatUSD(r.combustibleUSD)}</td></tr>`,
    `<tr><td>Gastos Operacionales</td><td class="mono">${formatUSD(r.gastosOperacionalesUSD)}</td></tr>`,
    `<tr><td>Gestión Aduanal</td><td class="mono">${formatUSD(r.gestionAduanalUSD)}</td></tr>`,
    `<tr><td>Seguro (${courier.insurancePercent}% FOB)</td><td class="mono">${formatUSD(r.seguroUSD)}</td></tr>`,
    `<tr><td>IVA ${courier.ivaPorcentaje}%</td><td class="mono">${formatUSD(r.ivaUSD)}</td></tr>`,
    `<tr style="background:#f1f5f9;font-weight:700"><td>TOTAL COURIER</td><td class="mono">${formatUSD(r.totalCourierUSD)}</td></tr>`,
  ]
    .filter(Boolean)
    .join("");
}

function kpiCard(label: string, value: string, color = "#0f172a"): string {
  return `<div class="kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value" style="color:${color}">${esc(value)}</div></div>`;
}

function cardTopOportunidad(flip: FlipItem, medalla: string): string {
  const math = flip.analysis?.flipMath;
  const verdict = colorVeredicto(flip.analysis?.finalVerdict?.decision);
  return `
  <div class="card">
    <div class="medalla">${medalla} <span style="font-size:11px;color:#64748b;font-weight:600">${esc(flip.platform)} · ${esc(flip.category)}</span></div>
    <h4>${esc(flip.title)}</h4>
    <div class="verdict" style="background:${verdict.bg};color:${verdict.color}">${verdict.label}</div>
    <div class="grid2">
      <div><span style="color:#64748b">Precio / Puja</span><br/><b class="num">${formatUSD(math?.basePriceUSD || 0)}</b></div>
      <div><span style="color:#64748b">Costo Landed Vzla</span><br/><b class="num">${formatUSD(math?.totalLandedCostUSD || 0)}</b></div>
      <div><span style="color:#64748b">Reventa Vzla</span><br/><b class="num" style="color:#059669">${formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</b></div>
      <div><span style="color:#64748b">ROI</span><br/><b class="num" style="color:#059669">${formatPercent(math?.roiPercent || 0)}</b></div>
      <div><span style="color:#64748b">Puja Máx</span><br/><b class="num">${formatUSD(flip.analysis?.auctionStrategy?.maxAbsoluteBidUSD || 0)}</b></div>
      <div><span style="color:#64748b">Ganancia Neta</span><br/><b class="num">${formatUSD(math?.netProfitUSD || 0)}</b></div>
    </div>
    ${flip.analysis?.finalVerdict?.summaryExplanation ? `<p style="font-size:11px;color:#475569;margin-top:8px">${esc(flip.analysis.finalVerdict.summaryExplanation)}</p>` : ""}
  </div>`;
}

// ── Plantilla HTML base ────────────────────────────────────────────────────

interface SeccionPDF {
  n: string;
  titulo: string;
  body: string;
}

function armarHTML(opts: {
  titulo: string;
  metas: [string, string][];
  kpis: string;
  secciones: SeccionPDF[];
  footer: string;
}): string {
  const metasHTML = opts.metas
    .map(
      ([l, v]) =>
        `<div class="meta"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`
    )
    .join("");
  const seccionesHTML = opts.secciones
    .map(
      (s) =>
        `<div class="seccion"><div class="sec-head"><span class="sec-n">${esc(s.n)}</span><span class="sec-t">${esc(s.titulo)}</span></div>${s.body}</div>`
    )
    .join("");

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${esc(opts.titulo)}</title><style>
@page{size:letter;margin:0}
*{box-sizing:border-box}
body{background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;margin:0;padding:28px 12px}
.pagina{max-width:820px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.12)}
header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#334155 100%);color:#fff;padding:32px 36px}
.kicker{color:#fbbf24;font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
header h1{font-size:22px;margin:8px 0 6px;line-height:1.25}
header .sub{color:#cbd5e1;font-size:12px}
.metas{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;padding:16px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.meta span{display:block;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}
.meta strong{font-size:12px;color:#0f172a}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:22px 36px 6px}
.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:13px;text-align:center}
.kpi-label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
.kpi-value{font-size:19px;font-weight:800;margin-top:4px}
.contenido{padding:0 36px 36px}
.seccion{margin-top:26px}
.sec-head{display:flex;align-items:center;gap:10px;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:14px}
.sec-n{background:#0f172a;color:#fbbf24;font-size:12px;font-weight:800;border-radius:6px;padding:4px 9px}
.sec-t{font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th{background:#0f172a;color:#fff;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
.mono{font-family:'SF Mono',Menlo,monospace;font-size:11px}
.verdict{border-radius:8px;padding:10px 12px;font-size:11.5px;font-weight:700;margin:8px 0}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-top:12px}
.card h4{margin:6px 0 4px;font-size:13px;color:#0f172a}
.card .grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-size:11px;color:#475569}
.card .num{color:#0f172a}
.medalla{font-size:18px}
ul.preguntas{list-style:none;padding:0;margin:0}
ul.preguntas li{background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #d97706;border-radius:8px;padding:9px 12px;margin-top:8px;font-size:12px}
ol.pasos{counter-reset:p;padding:0;list-style:none}
ol.pasos li{counter-increment:p;padding:9px 10px 9px 38px;position:relative;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-top:8px;font-size:12px}
ol.pasos li::before{content:counter(p);position:absolute;left:10px;top:8px;background:#0f172a;color:#fbbf24;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px}
.nota{background:#fef7e0;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:11px;color:#92400e;margin-top:10px}
footer{background:#0f172a;color:#94a3b8;text-align:center;font-size:10px;letter-spacing:.08em;padding:14px;text-transform:uppercase}
@media print{body{background:#fff;padding:0}.pagina{box-shadow:none;border-radius:0;max-width:100%}.seccion{break-inside:avoid}}
</style></head><body>
<div class="pagina">
<header><div class="kicker">FlipMaster · Análisis Estratégico de Flipping</div><h1>${esc(opts.titulo)}</h1><div class="sub">${esc(opts.footer)}</div></header>
<div class="metas">${metasHTML}</div>
<div class="kpis">${opts.kpis}</div>
<div class="contenido">${seccionesHTML}</div>
<footer>FLIPMASTER · ${esc(opts.footer)}</footer>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>
</body></html>`;
}

export function abrirPDF(html: string): void {
  const w = window.open("", "_blank", "width=960,height=780");
  if (!w) {
    alert("Permite las ventanas emergentes para exportar el PDF de FlipMaster.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ── Exportadores ───────────────────────────────────────────────────────────

export function exportarAnalisisPDF(
  analysis: FlipMasterAnalysis,
  settings: AppSettings,
  url = "",
  title = ""
): void {
  const courier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];
  const verdict = colorVeredicto(analysis.finalVerdict?.decision);
  const math = analysis.flipMath;
  const ident = analysis.productIdentification;

  const secciones: SeccionPDF[] = [
    {
      n: "1",
      titulo: "Resumen Ejecutivo",
      body: `<div class="verdict" style="background:${verdict.bg};color:${verdict.color}">${verdict.label}</div>
<table>
<tr><th>Concepto</th><th>Valor</th></tr>
<tr><td>Precio Base / Puja</td><td class="mono">${formatUSD(math?.basePriceUSD || 0)}</td></tr>
<tr><td>Envío interno US</td><td class="mono">${formatUSD(analysis.shippingToVenezuela?.internalUSFreightUSD || 0)}</td></tr>
<tr><td>Courier a Venezuela</td><td class="mono">${formatUSD(analysis.shippingToVenezuela?.internationalCourierUSD || 0)}</td></tr>
<tr><td>Restauración (pesimista)</td><td class="mono">${formatUSD(math?.restorationPessimisticUSD || 0)}</td></tr>
<tr><td><b>Costo Total Puesto en Vzla</b></td><td class="mono"><b>${formatUSD(math?.totalLandedCostUSD || 0)}</b></td></tr>
<tr><td>Reventa Estimada Vzla</td><td class="mono" style="color:#059669"><b>${formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</b> (${formatVES(math?.estimatedMarketPriceVzlaVES || 0)})</td></tr>
<tr><td><b>Ganancia Neta Est.</b></td><td class="mono" style="color:#059669"><b>${formatUSD(math?.netProfitUSD || 0)}</b></td></tr>
<tr><td><b>ROI %</b></td><td class="mono" style="color:#059669"><b>${formatPercent(math?.roiPercent || 0)}</b></td></tr>
</table>
<div class="nota">⚠️ Regla de oro FlipMaster: el veredicto usa el ESCENARIO PESIMISTA. “Untested” = roto hasta demostrar lo contrario. El cálculo de courier usa la tarifa real de $3.10/lb de Liberty Express.</div>`,
    },
    {
      n: "2",
      titulo: "Identificación & Perfil del Artículo",
      body: `<table>
<tr><th>Campo</th><th>Detalle</th></tr>
<tr><td>Marca / Modelo</td><td>${esc(ident?.brand)} ${esc(ident?.model)}</td></tr>
<tr><td>Variante / Specs</td><td>${esc(ident?.variant)} — ${esc(ident?.specs)}</td></tr>
<tr><td>Condición Declarada</td><td>${esc(ident?.declaredCondition)}</td></tr>
<tr><td>Defectos Declarados</td><td>${(ident?.declaredDefects || []).map((d) => `• ${esc(d)}<br/>`).join("") || "—"}</td></tr>
<tr><td>Accesorios Faltantes</td><td>${(ident?.missingAccessories || []).map((d) => `• ${esc(d)}<br/>`).join("") || "—"}</td></tr>
<tr><td>Nivel de Riesgo</td><td><span class="tag" style="background:${ident?.riskLevel === "Bajo" ? "#dcfce7" : ident?.riskLevel === "Medio" ? "#fef7e0" : "#fee2e2"};color:${ident?.riskLevel === "Bajo" ? "#166534" : ident?.riskLevel === "Medio" ? "#92400e" : "#991b1b"}">${esc(ident?.riskLevel)}</span></td></tr>
<tr><td>Señales de Riesgo</td><td>${(ident?.riskSignals || []).map((d) => `• ${esc(d)}<br/>`).join("") || "Ninguna detectada"}</td></tr>
</table>`,
    },
    {
      n: "3",
      titulo: "Costo de Restauración (Taller)",
      body: `<table>
<tr><th>Repuesto / Trabajo</th><th>Costo Est.</th><th>Dificultad</th><th>Especialista</th></tr>
${(analysis.restorationCost?.defectsBreakdown || [])
  .map(
    (b) =>
      `<tr><td>${esc(b.item)}</td><td class="mono">${formatUSD(b.estimatedPartCostUSD)}</td><td>${esc(b.difficulty)}</td><td>${b.requiresSpecialist ? "✅ Sí" : "—"}</td></tr>`
  )
  .join("")}
<tr><td><b>Escenario Optimista</b></td><td class="mono"><b>${formatUSD(analysis.restorationCost?.optimisticCostUSD || 0)}</b></td><td colspan="2"></td></tr>
<tr><td><b>Escenario Pesimista (usado en veredicto)</b></td><td class="mono" style="color:#991b1b"><b>${formatUSD(analysis.restorationCost?.pessimisticCostUSD || 0)}</b></td><td colspan="2"></td></tr>
<tr><td><b>Presupuesto Recomendado</b></td><td class="mono"><b>${formatUSD(analysis.restorationCost?.recommendedBudgetUSD || 0)}</b></td><td colspan="2"></td></tr>
</table>`,
    },
    {
      n: "4",
      titulo: "Matemática del Flip — Desglose Courier Real",
      body: `<p style="font-size:11px;color:#475569;margin-top:0">Tarifa vigente <b>$${courier.ratePerLbUSD}/lb</b> (mínimo $${courier.minFeeUSD}; embalaje ${courier.embalaje}; el desglose usa el peso estimado declarado; + combustible + gastos op + gestión aduanal + seguro + IVA 16%).</p>
<table>${desgloseCourier(analysis, courier)}</table>
<p style="font-size:11px;color:#475569;margin-top:10px"><b>Regla de compra:</b> Costo total puesto en Vzla ≤ 50-60% de la reventa local y ROI ≥ 30-40%.</p>`,
    },
    {
      n: "5",
      titulo: "Estrategia de Puja",
      body: `<table>
<tr><th>Factor</th><th>Análisis</th></tr>
<tr><td>¿Es subasta?</td><td>${analysis.auctionStrategy?.isAuction ? "✅ Sí — aplicar sniping" : "❌ No — Buy It Now / Best Offer"}</td></tr>
<tr><td><b>Puja Máxima Absoluta</b></td><td class="mono"><b>${formatUSD(analysis.auctionStrategy?.maxAbsoluteBidUSD || 0)}</b> — NO se negocia bajo ninguna circunstancia</td></tr>
<tr><td>Táctica Recomendada</td><td>${esc(analysis.auctionStrategy?.suggestedTactic)}</td></tr>
<tr><td>Ventaja Competitiva</td><td>${esc(analysis.auctionStrategy?.edgeNotes)}</td></tr>
</table>`,
    },
    {
      n: "6",
      titulo: "Preguntas Obligatorias al Vendedor",
      body: `<ul class="preguntas">${asegurarPreguntas(analysis.finalVerdict?.pendingQuestionsForSeller)
        .map((q) => `<li>${esc(q)}</li>`)
        .join("")}</ul>
<div class="nota">📌 Envía estas preguntas ANTES de pujar. Cualquier respuesta vaga o evasiva = baja la puja máxima un 20% o descarta el flip.</div>`,
    },
    {
      n: "7",
      titulo: "Comparativa Final de Factores",
      body: `<table>
<tr><th>Factor</th><th>Valor</th><th>Evaluación</th></tr>
<tr><td>Precio base / puja</td><td class="mono">${formatUSD(math?.basePriceUSD || 0)}</td><td>${math?.basePriceUSD && math?.basePriceUSD <= (analysis.auctionStrategy?.maxAbsoluteBidUSD || 0) ? "✅ Dentro de límite" : "⚠️ Verificar"}</td></tr>
<tr><td>Repuestos</td><td class="mono">${formatUSD(math?.restorationPessimisticUSD || 0)}</td><td>${math?.restorationPessimisticUSD && math?.restorationPessimisticUSD < (math?.estimatedMarketPriceVzlaUSD || 0) * 0.25 ? "✅ Aceptable" : "⚠️ Alto"}</td></tr>
<tr><td>Courier Vzla</td><td class="mono">${formatUSD(analysis.shippingToVenezuela?.totalLandedShippingUSD || 0)}</td><td>${analysis.shippingToVenezuela?.courierNotes ? "✅ ${esc(analysis.shippingToVenezuela.courierNotes)}" : ""}</td></tr>
<tr><td>Reventa Vzla</td><td class="mono" style="color:#059669">${formatUSD(math?.estimatedMarketPriceVzlaUSD || 0)}</td><td>${math?.netProfitUSD && math?.netProfitUSD >= 25 ? "✅ Ganancia ≥ $25" : "⚠️ Margen bajo"}</td></tr>
<tr><td>ROI</td><td class="mono" style="color:#059669">${formatPercent(math?.roiPercent || 0)}</td><td>${math?.roiPercent && math?.roiPercent >= 30 ? "✅ ≥ 30%" : "⚠️ Bajo"}</td></tr>
<tr><td><b>Veredicto</b></td><td colspan="2"><span class="tag" style="background:${verdict.bg};color:${verdict.color}">${verdict.label}</span></td></tr>
</table>`,
    },
    {
      n: "8",
      titulo: "Cómo Explotar Esta Oportunidad",
      body: `<ol class="pasos">
<li>Contacta al vendedor con las preguntas de la sección 6 ANTES de pujar.</li>
<li>Programa una alarma de <b>sniping</b> para los últimos 5-10 segundos de la subasta; nunca pujes temprano.</li>
<li>Presupuesta repuestos en eBay/iFixit/AliExpress con el escenario pesimista (nunca el optimista).</li>
<li>Genera la guía de compra hacia tu casillero de Miami (Liberty Express Doral) apenas ganes.</li>
<li>Al llegar a Venezuela: diagnóstico en taller → reparación → control de calidad → publicar en MercadoLibre/Instagram.</li>
<li>Registra todo en FlipTrack: costo real vs. presupuestado para calibrar el siguiente flip.</li>
</ol>`,
    },
  ];

  const html = armarHTML({
    titulo: title || `${ident?.brand || ""} ${ident?.model || "Análisis FlipMaster"}`,
    metas: [
      ["Anuncio / URL", url || "Manual"],
      ["Categoría", ident?.category || "Otros"],
      ["Condición", ident?.declaredCondition || "Usado"],
      ["Fecha", new Date().toLocaleDateString("es-VE")],
      ["Motor", "NVIDIA NIM (DeepSeek) / FlipMaster"],
    ],
    kpis:
      kpiCard("ROI Est.", formatPercent(math?.roiPercent || 0), "#059669") +
      kpiCard("Puja Máxima", formatUSD(analysis.auctionStrategy?.maxAbsoluteBidUSD || 0)) +
      kpiCard("Reventa Vzla", formatUSD(math?.estimatedMarketPriceVzlaUSD || 0), "#059669") +
      kpiCard("Riesgo", ident?.riskLevel || "Medio", ident?.riskLevel === "Bajo" ? "#059669" : ident?.riskLevel === "Medio" ? "#b45309" : "#991b1b"),
    secciones,
    footer: `Análisis FlipMaster · ${esc(ident?.brand || "")} ${esc(ident?.model || "")} · ${new Date().toLocaleDateString("es-VE")}`,
  });

  abrirPDF(html);
}

export function exportarTiendaPDF(
  tienda: { nombre: string; url: string; tier: string; categoria: string; precioMaximoUSD: number },
  oportunidades: FlipItem[],
  settings: AppSettings
): void {
  const sorted = [...oportunidades].sort(
    (a, b) => (b.analysis?.flipMath?.roiPercent || 0) - (a.analysis?.flipMath?.roiPercent || 0)
  );
  const top3 = sorted.slice(0, 3);
  const roiProm = sorted.length
    ? sorted.reduce((s, f) => s + (f.analysis?.flipMath?.roiPercent || 0), 0) / sorted.length
    : 0;
  const gananciaTotal = sorted.reduce((s, f) => s + (f.analysis?.flipMath?.netProfitUSD || 0), 0);
  const capitalTotal = sorted.reduce((s, f) => s + (f.analysis?.flipMath?.totalLandedCostUSD || 0), 0);

  const courier = settings.couriers.find((c) => c.id === settings.activeCourierId) || settings.couriers[0];
  const top1 = top3[0];

  const secciones: SeccionPDF[] = [
    {
      n: "1",
      titulo: "Resumen Ejecutivo",
      body: `<div class="nota">⚠️ Este reporte es un análisis ESTRATÉGICO automatizado del escáner FlipTrack + FlipMaster. Los precios de reventa en Venezuela provienen de tu configuración (dólar paralelo ${formatVES(settings.paraleloRate)}). Verifica cada item contra el vendedor antes de pujar.</div>
<table>
<tr><th>Métrica</th><th>Valor</th></tr>
<tr><td>Oportunidades rentables encontradas</td><td class="mono"><b>${sorted.length}</b></td></tr>
<tr><td>ROI promedio</td><td class="mono" style="color:#059669"><b>${formatPercent(roiProm)}</b></td></tr>
<tr><td>Ganancia neta total proyectada</td><td class="mono" style="color:#059669"><b>${formatUSD(gananciaTotal)}</b></td></tr>
<tr><td>Capital total requerido (puesto en Vzla)</td><td class="mono">${formatUSD(capitalTotal)}</td></tr>
<tr><td>Precio máximo por item (tier ${esc(tienda.tier)})</td><td class="mono">${formatUSD(tienda.precioMaximoUSD)}</td></tr>
</table>`,
    },
    {
      n: "2",
      titulo: "Perfil del Vendedor / Tienda",
      body: `<table>
<tr><th>Campo</th><th>Detalle</th></tr>
<tr><td>Tienda</td><td>${esc(tienda.nombre)}</td></tr>
<tr><td>URL</td><td class="mono" style="word-break:break-all">${esc(tienda.url)}</td></tr>
<tr><td>Tier</td><td><span class="tag" style="background:${tienda.tier === "A" ? "#dcfce7" : tienda.tier === "B" ? "#fef7e0" : "#fee2e2"};color:${tienda.tier === "A" ? "#166534" : tienda.tier === "B" ? "#92400e" : "#991b1b"}">Tier ${esc(tienda.tier)}</span></td></tr>
<tr><td>Categoría</td><td>${esc(tienda.categoria)}</td></tr>
<tr><td>Veredicto de confianza</td><td>${sorted.length >= 3 ? '<span class="tag" style="background:#dcfce7;color:#166534">✅ ALTA — ' + sorted.length + " oportunidades detectadas</span>" : sorted.length > 0 ? '<span class="tag" style="background:#fef7e0;color:#92400e">⚠️ MEDIA — ' + sorted.length + " oportunidad(es) detectada(s)</span>" : '<span class="tag" style="background:#fee2e2;color:#991b1b">❌ BAJA — sin oportunidades en este escaneo</span>'}</td></tr>
</table>`,
    },
    {
      n: "3",
      titulo: "Top Oportunidades (Por ROI)",
      body:
        top3.length === 0
          ? '<div class="nota">Sin oportunidades positivas en el último escaneo. Ajusta el precio máximo del tier o revisa la categoría.</div>'
          : top3
              .map((f, i) => cardTopOportunidad(f, ["🥇", "🥈", "🥉"][i]))
              .join(""),
    },
    {
      n: "4",
      titulo: "Matemática Completa del Flip (Item Top)",
      body: top1
        ? `<p style="font-size:11px;color:#475569;margin-top:0"><b>${esc(top1.title)}</b></p>
<table>${desgloseCourier(top1.analysis, courier)}</table>
<div class="grid2" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-size:11px">
<div>Precio base: <b>${formatUSD(top1.analysis?.flipMath?.basePriceUSD || 0)}</b></div>
<div>Repuestos pesimista: <b>${formatUSD(top1.analysis?.flipMath?.restorationPessimisticUSD || 0)}</b></div>
<div>Reventa Vzla: <b style="color:#059669">${formatUSD(top1.analysis?.flipMath?.estimatedMarketPriceVzlaUSD || 0)}</b></div>
<div>ROI: <b style="color:#059669">${formatPercent(top1.analysis?.flipMath?.roiPercent || 0)}</b></div>
<div>Puja Máx: <b>${formatUSD(top1.analysis?.auctionStrategy?.maxAbsoluteBidUSD || 0)}</b></div>
<div>Ganancia: <b style="color:#059669">${formatUSD(top1.analysis?.flipMath?.netProfitUSD || 0)}</b></div>
</div>`
        : '<div class="nota">Sin items analizados en este escaneo.</div>',
    },
    {
      n: "5",
      titulo: "Estrategia de Puja por Item",
      body: `<table>
<tr><th>Item</th><th>Táctica</th><th>Puja Máx</th><th>Ventaja</th></tr>
${sorted
  .slice(0, 6)
  .map(
    (f) =>
      `<tr><td>${esc(f.title.slice(0, 50))}</td><td>${esc(f.analysis?.auctionStrategy?.suggestedTactic)}</td><td class="mono"><b>${formatUSD(f.analysis?.auctionStrategy?.maxAbsoluteBidUSD || 0)}</b></td><td style="font-size:10px">${esc(f.analysis?.auctionStrategy?.edgeNotes?.slice(0, 60))}</td></tr>`
  )
  .join("")}
</table>`,
    },
    {
      n: "6",
      titulo: "Preguntas Obligatorias al Vendedor",
      body: `<ul class="preguntas">${asegurarPreguntas(top1?.analysis?.finalVerdict?.pendingQuestionsForSeller)
        .map((q) => `<li>${esc(q)}</li>`)
        .join("")}</ul>
<div class="nota">📌 Preguntas obligatorias en TODO flujo de compra. Si el vendedor evade responder, descarta el item.</div>`,
    },
    {
      n: "7",
      titulo: "Tabla Comparativa Final",
      body: `<table>
<tr><th>#</th><th>Item</th><th>Precio</th><th>Puja Máx</th><th>Reventa Vzla</th><th>Ganancia</th><th>Riesgo</th><th>Veredicto</th></tr>
${sorted
  .slice(0, 8)
  .map((f, i) => {
    const v = colorVeredicto(f.analysis?.finalVerdict?.decision);
    return `<tr>
<td>${i + 1}</td>
<td style="font-size:10px">${esc(f.title.slice(0, 42))}</td>
<td class="mono">${formatUSD(f.analysis?.flipMath?.basePriceUSD || 0)}</td>
<td class="mono"><b>${formatUSD(f.analysis?.auctionStrategy?.maxAbsoluteBidUSD || 0)}</b></td>
<td class="mono" style="color:#059669">${formatUSD(f.analysis?.flipMath?.estimatedMarketPriceVzlaUSD || 0)}</td>
<td class="mono" style="color:#059669">${formatUSD(f.analysis?.flipMath?.netProfitUSD || 0)}</td>
<td>${esc(f.analysis?.productIdentification?.riskLevel || "Medio")}</td>
<td><span class="tag" style="background:${v.bg};color:${v.color}">${v.label.split(" ")[0]}</span></td>
</tr>`;
  })
  .join("")}
</table>`,
    },
    {
      n: "8",
      titulo: "Cómo Explotar Esta Tienda",
      body: `<ol class="pasos">
<li>Configura un escaneo automático de esta tienda con la frecuencia del tier (${esc(tienda.tier === "C" ? "48h" : "24h")}).</li>
<li>Revisa las alertas de Telegram: el escáner te avisa al instante cuando aparece una oportunidad nueva.</li>
<li>Gana la subasta con sniping en los últimos 5-10 segundos y usa el precio de puja máxima del reporte.</li>
<li>Consolida varias compras de la misma tienda en un solo embarque para amortizar el flete.</li>
<li>Después de 3 flips con esta tienda, evalúa subir de tier o negociar precio directo por volumen.</li>
</ol>`,
    },
  ];

  const html = armarHTML({
    titulo: `Reporte de Tienda — ${tienda.nombre}`,
    metas: [
      ["Tienda", tienda.nombre],
      ["URL", tienda.url],
      ["Tier", `Tier ${tienda.tier}`],
      ["Categoría", tienda.categoria],
      ["Precio Máx", formatUSD(tienda.precioMaximoUSD)],
      ["Fecha", new Date().toLocaleDateString("es-VE")],
    ],
    kpis:
      kpiCard("Oportunidades", String(sorted.length), "#059669") +
      kpiCard("ROI Promedio", formatPercent(roiProm), "#059669") +
      kpiCard("Ganancia Total", formatUSD(gananciaTotal), "#059669") +
      kpiCard("Capital Necesario", formatUSD(capitalTotal)),
    secciones,
    footer: `Tienda ${tienda.nombre} · ${new Date().toLocaleDateString("es-VE")}`,
  });

  abrirPDF(html);
}

export function exportarNegocioPDF(flips: FlipItem[], settings: AppSettings): void {
  const oportunidades = flips.filter((f) => ["saved_opportunity", "evaluating", "bidding"].includes(f.status));
  const vendidos = flips.filter((f) => f.status === "sold");
  const gananciaTotal = flips.reduce((s, f) => s + (f.analysis?.flipMath?.netProfitUSD || 0), 0);
  const roiProm = flips.length
    ? flips.reduce((s, f) => s + (f.analysis?.flipMath?.roiPercent || 0), 0) / flips.length
    : 0;

  const secciones: SeccionPDF[] = [
    {
      n: "1",
      titulo: "Resumen Ejecutivo del Negocio",
      body: `<table>
<tr><th>Métrica</th><th>Valor</th></tr>
<tr><td>Total de flips registrados</td><td class="mono">${flips.length}</td></tr>
<tr><td>Oportunidades en pipeline</td><td class="mono">${oportunidades.length}</td></tr>
<tr><td>Ventas cerradas</td><td class="mono">${vendidos.length}</td></tr>
<tr><td>Ganancia neta total proyectada</td><td class="mono" style="color:#059669"><b>${formatUSD(gananciaTotal)}</b></td></tr>
<tr><td>ROI promedio</td><td class="mono" style="color:#059669"><b>${formatPercent(roiProm)}</b></td></tr>
<tr><td>Dólar paralelo usado</td><td class="mono">${formatVES(settings.paraleloRate)}</td></tr>
</table>`,
    },
    {
      n: "2",
      titulo: "Portafolio por Categoría",
      body: (() => {
        const cats: Record<string, { count: number; profit: number }> = {};
        flips.forEach((f) => {
          const c = f.category || "Otros";
          cats[c] = cats[c] || { count: 0, profit: 0 };
          cats[c].count += 1;
          cats[c].profit += f.analysis?.flipMath?.netProfitUSD || 0;
        });
        return `<table><tr><th>Categoría</th><th>Flips</th><th>Ganancia Proyectada</th></tr>${Object.entries(cats)
          .map(
            ([c, v]) =>
              `<tr><td>${esc(c)}</td><td class="mono">${v.count}</td><td class="mono" style="color:#059669">${formatUSD(v.profit)}</td></tr>`
          )
          .join("")}</table>`;
      })(),
    },
    {
      n: "3",
      titulo: "Top Oportunidades Actuales",
      body: oportunidades
        .slice()
        .sort((a, b) => (b.analysis?.flipMath?.roiPercent || 0) - (a.analysis?.flipMath?.roiPercent || 0))
        .slice(0, 3)
        .map((f, i) => cardTopOportunidad(f, ["🥇", "🥈", "🥉"][i]))
        .join("") || '<div class="nota">Sin oportunidades activas. Corre el AI Analyzer o el escáner de tiendas.</div>',
    },
    {
      n: "4",
      titulo: "Preguntas Obligatorias al Vendedor",
      body: `<ul class="preguntas">${asegurarPreguntas(
        flips
          .map((f) => f.analysis?.finalVerdict?.pendingQuestionsForSeller || [])
          .flat()
      )
        .map((q) => `<li>${esc(q)}</li>`)
        .join("")}</ul>`,
    },
    {
      n: "5",
      titulo: "Próximos Pasos Operativos",
      body: `<ol class="pasos">
<li>Ejecuta los flips con mayor ROI primero para rotar capital.</li>
<li>Mantén la tasa de cambio actualizada desde Ajustes (DolarFlow).</li>
<li>Registra cada compra con su guía de courier para trazabilidad.</li>
<li>Documenta facturas y guías en el Inbox Documental.</li>
</ol>`,
    },
  ];

  const html = armarHTML({
    titulo: "Reporte de Negocio FlipTrack",
    metas: [
      ["Operador", "FlipTrack Vzla"],
      ["Casillero", "Liberty Express Miami"],
      ["Fecha", new Date().toLocaleDateString("es-VE")],
      ["Flips", String(flips.length)],
    ],
    kpis:
      kpiCard("Flips", String(flips.length)) +
      kpiCard("Ganancia Total", formatUSD(gananciaTotal), "#059669") +
      kpiCard("ROI Promedio", formatPercent(roiProm), "#059669") +
      kpiCard("En Pipeline", String(oportunidades.length), "#b45309"),
    secciones,
    footer: `FlipTrack Vzla · ${new Date().toLocaleDateString("es-VE")}`,
  });

  abrirPDF(html);
}
