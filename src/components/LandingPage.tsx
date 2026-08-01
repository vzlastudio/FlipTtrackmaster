import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  Globe,
  Bot,
  ScanSearch,
  Truck,
  Wrench,
  TrendingUp,
  FileText,
  ArrowRight,
  Check,
  Zap,
  Wallet,
  MessageCircle,
  Instagram,
  Cpu,
  DollarSign,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

// ── CONFIG EDITABLE ─────────────────────────────────────────────────────────
// Número de WhatsApp para el footer (formato internacional sin "+"):
const WHATSAPP = "584120000000"; // ⚠️ REEMPLAZA con tu número real
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Hola! Quiero información sobre FlipTrack 🚀"
)}`;

type Lang = "es" | "en";
type Theme = "light" | "dark";

// ── I18N (Español / English) ────────────────────────────────────────────────
const I18N = {
  es: {
    tag: "Vzla OS",
    nav: { features: "Características", how: "Cómo funciona", pricing: "Precios", contact: "Contacto", cta: "Ingresar" },
    hero: {
      badge: "⚡ Motor IA FlipMaster · DeepSeek · Casillero Miami",
      title1: "Convierte ofertas de",
      title2: "eBay en ganancias",
      title3: "en Venezuela",
      sub: "Analiza productos con IA, importa vía casillero Liberty Express y revende con ganancia. Todo tu flujo de flipping — de la puja a la venta — en un solo sistema.",
      ctaPrimary: "Ingresar a la plataforma",
      ctaSecondary: "Ver características",
      trust: "Sin tarjetas · Dólar BCV y paralelo en vivo · Tus datos, offline-first",
      mockVerdict: "VALE LA PENA TRAERLO",
      mockRoiLabel: "ROI est.",
      mockRoi: "64.9%",
      mockProfit: "+$217",
    },
    stats: [
      { value: "18", label: "Módulos operativos" },
      { value: "4", label: "Plataformas: eBay, Amazon, ML, Swappa" },
      { value: "$3.10", label: "Tarifa Liberty / lb" },
      { value: "40%+", label: "ROI objetivo por flip" },
    ],
    features: {
      title: "Un sistema operativo completo para tu flip",
      sub: "No es un CRUD: es FlipMaster, tu analista de ofertas 24/7, más el control operativo de todo tu inventario.",
      items: [
        {
          icon: Bot,
          title: "AI Analyzer — FlipMaster",
          desc: "Inspección forense de ofertas: defectos, repuestos, matemática completa del flip, puja máxima y veredicto PUJA / NO PUJAS. Reglas estrictas de red e iCloud aplicadas por código.",
        },
        {
          icon: ScanSearch,
          title: "Escáner de Tiendas",
          desc: "Registra tiendas de eBay por tier de valor, escanéalas con Firecrawl y deja que la IA evalúe cada item. Las oportunidades positivas llegan a tu pipeline y por Telegram.",
        },
        {
          icon: Truck,
          title: "Tránsito & Logística",
          desc: "Seguimiento en 4 tramos: US → Miami → Venezuela, con tracking US, guía Liberty Express, pesos, fletes y vista lista/cuadrícula.",
        },
        {
          icon: Wrench,
          title: "Taller & Inventario",
          desc: "Reparaciones con costos de repuestos, técnico asignado, control de calidad y catálogo listo para venta.",
        },
        {
          icon: TrendingUp,
          title: "Ventas & Clientes",
          desc: "Registra ventas, canales (ML, Instagram, WhatsApp), directorio de clientes y cierra el ciclo con la ganancia real del flip.",
        },
        {
          icon: DollarSign,
          title: "Dólar en vivo & Reportes",
          desc: "Tasas BCV y paralelo desde DolarFlow actualizando todos los cálculos, reportes profesionales en PDF y respaldos JSON.",
        },
      ],
    },
    how: {
      title: "De la puja a la venta en 4 pasos",
      steps: [
        { n: "01", t: "Analiza con IA", d: "Pega un enlace de eBay y FlipMaster hace la inspección forense con números." },
        { n: "02", t: "Compra y puja", d: "Sniping con puja máxima calculada. La disciplina es la regla #1." },
        { n: "03", t: "Importa vía Liberty", d: "Sigue tu paquete de Miami a Venezuela con flete real por libras." },
        { n: "04", t: "Revende y gana", d: "Publícalo, véndelo y mide tu ROI real en el dashboard." },
      ],
    },
    pricing: {
      title: "Precios simples",
      sub: "Empieza gratis y escala cuando quieras. Precios editables.",
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "/mes",
          desc: "Para probar el motor FlipMaster.",
          features: ["AI Analyzer (5 análisis/mes)", "Calculadora Liberty", "Dólar BCV y paralelo", "Dashboard básico"],
          cta: "Comenzar gratis",
          featured: false,
        },
        {
          name: "Pro",
          price: "$5",
          period: "/mes",
          desc: "El sistema completo de flipping.",
          features: [
            "AI Analyzer ilimitado (DeepSeek)",
            "Escáner de tiendas + alertas Telegram",
            "Tránsito & logística 4 tramos",
            "Taller, inventario, ventas y clientes",
            "Reportes PDF profesionales",
            "Soporte prioritario",
          ],
          cta: "Elegir Pro",
          featured: true,
        },
        {
          name: "Business",
          price: "$15",
          period: "/mes",
          desc: "Para equipos y volumen alto.",
          features: ["Todo lo de Pro", "Multi-usuario y roles", "Auditoría completa", "Integración eBay OAuth", "Respaldos automáticos"],
          cta: "Elegir Business",
          featured: false,
        },
      ],
    },
    finalCta: {
      title: "Empieza a flipar con cabeza hoy",
      sub: "Analiza tu primera oferta gratis. Sin tarjetas, sin compromiso.",
      cta: "Ingresar a la plataforma",
    },
    footer: {
      desc: "Sistema operativo de flipping con IA para Venezuela. Compra barato en EE.UU., importa con casillero y revende con ganancia.",
      product: "Producto",
      linksProduct: ["Características", "Cómo funciona", "Precios"],
      contact: "Contacto",
      rights: "© 2026 FlipTrack Vzla. Todos los derechos reservados.",
      madeIn: "Hecho con ♥ en Venezuela",
    },
  },
  en: {
    tag: "Vzla OS",
    nav: { features: "Features", how: "How it works", pricing: "Pricing", contact: "Contact", cta: "Sign in" },
    hero: {
      badge: "⚡ FlipMaster AI Engine · DeepSeek · Miami PO Box",
      title1: "Turn eBay deals into",
      title2: "profits",
      title3: "in Venezuela",
      sub: "Analyze products with AI, import via Liberty Express courier and resell for profit. Your whole flipping flow — from bid to sale — in one system.",
      ctaPrimary: "Enter the platform",
      ctaSecondary: "See features",
      trust: "No credit card · Live BCV & parallel dollar · Your data, offline-first",
      mockVerdict: "WORTH BRINGING IT",
      mockRoiLabel: "Est. ROI",
      mockRoi: "64.9%",
      mockProfit: "+$217",
    },
    stats: [
      { value: "18", label: "Operational modules" },
      { value: "4", label: "Platforms: eBay, Amazon, ML, Swappa" },
      { value: "$3.10", label: "Liberty rate / lb" },
      { value: "40%+", label: "Target ROI per flip" },
    ],
    features: {
      title: "A complete operating system for your flip",
      sub: "Not a CRUD: it's FlipMaster, your 24/7 deal analyst, plus full operational control of your inventory.",
      items: [
        {
          icon: Bot,
          title: "AI Analyzer — FlipMaster",
          desc: "Forensic deal inspection: defects, parts, full flip math, max bid and a BID / DON'T BID verdict. Strict network & iCloud rules enforced in code.",
        },
        {
          icon: ScanSearch,
          title: "Store Scanner",
          desc: "Track eBay stores by value tier, scan them with Firecrawl and let AI score every item. Positive opportunities reach your pipeline and Telegram.",
        },
        {
          icon: Truck,
          title: "Transit & Logistics",
          desc: "4-leg tracking: US → Miami → Venezuela, with US tracking, Liberty Express guide, weights, freight and list/grid views.",
        },
        {
          icon: Wrench,
          title: "Workshop & Inventory",
          desc: "Repairs with parts costs, assigned technician, quality control and a catalog ready for sale.",
        },
        {
          icon: TrendingUp,
          title: "Sales & Clients",
          desc: "Record sales, channels (ML, Instagram, WhatsApp), client directory and close the loop with real flip profit.",
        },
        {
          icon: DollarSign,
          title: "Live FX & Reports",
          desc: "BCV & parallel rates from DolarFlow updating every calculation, professional PDF reports and JSON backups.",
        },
      ],
    },
    how: {
      title: "From bid to sale in 4 steps",
      steps: [
        { n: "01", t: "Analyze with AI", d: "Paste an eBay link and FlipMaster runs the forensic inspection with numbers." },
        { n: "02", t: "Buy & bid", d: "Sniping with a calculated max bid. Discipline is rule #1." },
        { n: "03", t: "Import via Liberty", d: "Track your package from Miami to Venezuela with real per-pound freight." },
        { n: "04", t: "Resell & profit", d: "List it, sell it and measure your real ROI on the dashboard." },
      ],
    },
    pricing: {
      title: "Simple pricing",
      sub: "Start free and scale when you want. Editable prices.",
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "/mo",
          desc: "To try the FlipMaster engine.",
          features: ["AI Analyzer (5/month)", "Liberty calculator", "BCV & parallel dollar", "Basic dashboard"],
          cta: "Start free",
          featured: false,
        },
        {
          name: "Pro",
          price: "$5",
          period: "/mo",
          desc: "The complete flipping system.",
          features: [
            "Unlimited AI Analyzer (DeepSeek)",
            "Store scanner + Telegram alerts",
            "4-leg transit & logistics",
            "Workshop, inventory, sales & clients",
            "Professional PDF reports",
            "Priority support",
          ],
          cta: "Choose Pro",
          featured: true,
        },
        {
          name: "Business",
          price: "$15",
          period: "/mo",
          desc: "For teams and high volume.",
          features: ["Everything in Pro", "Multi-user & roles", "Full audit", "eBay OAuth integration", "Automatic backups"],
          cta: "Choose Business",
          featured: false,
        },
      ],
    },
    finalCta: {
      title: "Start flipping smart today",
      sub: "Analyze your first deal free. No cards, no commitment.",
      cta: "Enter the platform",
    },
    footer: {
      desc: "AI-powered flipping operating system for Venezuela. Buy cheap in the US, import with a PO box and resell for profit.",
      product: "Product",
      linksProduct: ["Features", "How it works", "Pricing"],
      contact: "Contact",
      rights: "© 2026 FlipTrack Vzla. All rights reserved.",
      madeIn: "Made with ♥ in Venezuela",
    },
  },
} as const;

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("fm-lang");
      return saved === "en" || saved === "es" ? saved : "es";
    } catch {
      return "es";
    }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("fm-theme");
      return saved === "dark" || saved === "light" ? saved : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fm-lang", lang);
    } catch {}
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem("fm-theme", theme);
    } catch {}
  }, [theme]);

  const t = I18N[lang];
  const dark = theme === "dark";

  // Helper para elegir clases según tema
  const cc = (light: string, darkCls: string) => (dark ? darkCls : light);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${cc(
        "bg-[#faf9f6] text-[#121212]",
        "bg-[#0e0e10] text-[#f2f0ec]"
      )}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${cc(
          "bg-[#faf9f6]/80 border-[#e6e4e0]",
          "bg-[#0e0e10]/80 border-[#26262b]"
        )}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-full bg-[#121212] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-xl tracking-tight">FlipTrack</span>
                <span
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider ${cc(
                    "bg-[#e6e4e0] text-[#121212]",
                    "bg-[#26262b] text-[#f2f0ec]"
                  )}`}
                >
                  {t.tag}
                </span>
              </div>
            </div>
          </button>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-sm">
            {[
              { label: t.nav.features, id: "features" },
              { label: t.nav.how, id: "how" },
              { label: t.nav.pricing, id: "pricing" },
              { label: t.nav.contact, id: "contact" },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className={`transition-colors hover:opacity-70 ${cc("text-[#444]", "text-[#c9c7c2]")}`}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              title="Idioma / Language"
              className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${cc(
                "border-[#e6e4e0] hover:bg-[#e6e4e0]/50",
                "border-[#26262b] hover:bg-[#26262b]"
              )}`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase font-semibold">{lang === "es" ? "ES" : "EN"}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(dark ? "light" : "dark")}
              title="Tema / Theme"
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition ${cc(
                "border-[#e6e4e0] hover:bg-[#e6e4e0]/50",
                "border-[#26262b] hover:bg-[#26262b]"
              )}`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* CTA */}
            <button
              onClick={onEnterApp}
              className="hidden sm:flex items-center space-x-2 bg-[#121212] hover:bg-[#282828] text-white text-sm font-medium px-4 py-2 rounded-full transition active:scale-95"
            >
              <span>{t.nav.cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Decorative blur orbs */}
        <div className={`pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${cc("bg-[#121212]/5", "bg-white/5")}`} />
        <div className={`pointer-events-none absolute top-40 -left-32 w-96 h-96 rounded-full blur-3xl ${cc("bg-[#616161]/10", "bg-white/10")}`} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 items-center relative">
          {/* Left copy */}
          <div>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${cc(
                "border-[#e6e4e0] bg-white",
                "border-[#26262b] bg-[#161618]"
              )}`}
            >
              {t.hero.badge}
            </span>
            <h1 className="font-serif font-normal text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-6 tracking-tight">
              {t.hero.title1}{" "}
              <em className={`italic font-semibold ${cc("text-[#121212]", "text-white")}`}>{t.hero.title2}</em>{" "}
              {t.hero.title3}
            </h1>
            <p className={`mt-6 text-base sm:text-lg max-w-xl leading-relaxed ${cc("text-[#555]", "text-[#b8b6b0]")}`}>
              {t.hero.sub}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onEnterApp}
                className="group inline-flex items-center space-x-2 bg-[#121212] hover:bg-[#282828] text-white font-medium px-6 py-3.5 rounded-full transition active:scale-95"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo("features")}
                className={`inline-flex items-center px-6 py-3.5 rounded-full font-medium border transition ${cc(
                  "border-[#d9d6d0] hover:bg-[#e6e4e0]/50 text-[#121212]",
                  "border-[#26262b] hover:bg-[#161618] text-[#f2f0ec]"
                )}`}
              >
                {t.hero.ctaSecondary}
              </button>
            </div>
            <p className={`mt-6 text-xs flex items-center space-x-2 ${cc("text-[#888]", "text-[#6f6e69]")}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${cc("text-[#121212]", "text-[#f2f0ec]")}`} />
              <span>{t.hero.trust}</span>
            </p>
          </div>

          {/* Right: mock analysis card */}
          <div className="relative">
            <div
              className={`rounded-2xl border p-6 shadow-2xl ${cc(
                "bg-white border-[#e6e4e0]",
                "bg-[#161618] border-[#26262b]"
              )}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-[#121212] flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold font-mono">FlipMaster AI</span>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-1 rounded-full ${cc(
                    "bg-[#e6e4e0] text-[#555]",
                    "bg-[#26262b] text-[#aaa]"
                  )}`}
                >
                  {lang === "es" ? "análisis en vivo" : "live analysis"}
                </span>
              </div>

              {/* Mock JSON-ish output */}
              <div className={`font-mono text-[12px] space-y-2 ${cc("text-[#333]", "text-[#cfcfc9]")}`}>
                <p className={`${cc("text-[#121212]", "text-[#f2f0ec]")}`}>▶ {"{"} "finalVerdict": {"{"}</p>
                <p className="pl-5">
                  <span className={cc("text-[#616161]", "text-[#a8a6a0]")}>"decision"</span>:{" "}
                  <span className={`font-bold ${cc("text-[#121212]", "text-[#f2f0ec]")}`}>"{t.hero.mockVerdict}"</span>,
                </p>
                <p className="pl-5">
                  <span className={cc("text-[#616161]", "text-[#a8a6a0]")}>"roiPercent"</span>: <span className={cc("text-[#121212]", "text-[#f2f0ec]")}>64.9</span>,
                </p>
                <p className="pl-5">
                  <span className={cc("text-[#616161]", "text-[#a8a6a0]")}>"netProfitUSD"</span>: <span className={cc("text-[#121212]", "text-[#f2f0ec]")}>217.45</span>
                </p>
                <p className={`${cc("text-[#121212]", "text-[#f2f0ec]")}`}>▶ {"}"} "flipMath": {"{"}</p>
                <p className="pl-5">
                  <span className={cc("text-[#616161]", "text-[#a8a6a0]")}>"totalLandedCostUSD"</span>: <span className={cc("text-[#121212]", "text-[#f2f0ec]")}>363.05</span>,
                </p>
                <p className="pl-5">
                  <span className={cc("text-[#616161]", "text-[#a8a6a0]")}>"maxAbsoluteBidUSD"</span>: <span className={cc("text-[#121212]", "text-[#f2f0ec]")}>320</span>,
                </p>
                <p className={`${cc("text-[#121212]", "text-[#f2f0ec]")}`}>▶ {"}"} "riskLevel": "Bajo" {"}"}</p>
              </div>

              {/* Verdict badge */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-3 text-center ${cc("bg-[#121212] text-white", "bg-[#f2f0ec] text-[#0a0a0a]")}`}>
                  <p className="text-[10px] uppercase tracking-wider opacity-80">{lang === "es" ? "Veredicto" : "Verdict"}</p>
                  <p className="text-xs font-bold mt-1">PUJA ✓</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${cc("bg-[#f6f5f2] border border-[#e6e4e0]", "bg-[#1c1c1f] border border-[#26262b]")}`}>
                  <p className="text-[10px] uppercase tracking-wider">{t.hero.mockRoiLabel}</p>
                  <p className="text-xs font-bold mt-1">{t.hero.mockRoi}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${cc("bg-[#f6f5f2] border border-[#e6e4e0]", "bg-[#1c1c1f] border border-[#26262b]")}`}>
                  <p className="text-[10px] uppercase tracking-wider">{lang === "es" ? "Ganancia" : "Profit"}</p>
                  <p className="text-xs font-bold mt-1">{t.hero.mockProfit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section className={`border-y ${cc("border-[#e6e4e0]", "border-[#26262b]")}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {t.stats.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <p className="font-serif text-3xl font-bold">{s.value}</p>
              <p className={`text-xs mt-1 ${cc("text-[#666]", "text-[#a8a6a0]")}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight">{t.features.title}</h2>
          <p className={`mt-4 text-base leading-relaxed ${cc("text-[#555]", "text-[#b8b6b0]")}`}>{t.features.sub}</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.features.items.map((f) => (
            <div
              key={f.title}
              className={`group rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cc(
                "bg-white border-[#e6e4e0]",
                "bg-[#141416] border-[#26262b]"
              )}`}
            >
              <div className="w-11 h-11 rounded-xl bg-[#121212] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{f.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${cc("text-[#555]", "text-[#a8a6a0]")}`}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section
        id="how"
        className={`scroll-mt-16 border-y ${cc("bg-[#f1f0ec] border-[#e6e4e0]", "bg-[#141416] border-[#26262b]")}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight">{t.how.title}</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.how.steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="flex items-center space-x-3">
                  <span className={`font-serif text-4xl font-bold ${cc("text-[#121212]/80", "text-[#f2f0ec]/80")}`}>{s.n}</span>
                  <div className={`h-px flex-1 ${cc("bg-[#d9d6d0]", "bg-[#26262b]")}`} />
                </div>
                <h3 className="font-serif text-lg font-semibold mt-4">{s.t}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${cc("text-[#555]", "text-[#a8a6a0]")}`}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight">{t.pricing.title}</h2>
          <p className={`mt-4 ${cc("text-[#555]", "text-[#b8b6b0]")}`}>{t.pricing.sub}</p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 items-stretch">
          {t.pricing.plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                p.featured
                  ? cc(
                      "bg-[#121212] text-white border-[#121212] shadow-2xl md:-translate-y-3",
                      "bg-[#161618] text-[#f2f0ec] border-[#f2f0ec] shadow-2xl md:-translate-y-3"
                    )
                  : cc("bg-white border-[#e6e4e0]", "bg-[#141416] border-[#26262b]")
              }`}
            >
              {p.featured && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${cc("bg-white text-[#121212]", "bg-[#f2f0ec] text-[#121212]")}`}>
                  ★ {lang === "es" ? "Recomendado" : "Recommended"}
                </span>
              )}
              <h3 className="font-serif text-xl font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.featured ? cc("text-[#c9c7c2]", "text-[#a8a6a0]") : cc("text-[#666]", "text-[#a8a6a0]")}`}>{p.desc}</p>
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="font-serif text-4xl font-bold">{p.price}</span>
                <span className={`text-sm ${p.featured ? cc("text-[#c9c7c2]", "text-[#a8a6a0]") : cc("text-[#666]", "text-[#a8a6a0]")}`}>{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start space-x-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.featured ? cc("text-white", "text-[#f2f0ec]") : cc("text-[#121212]", "text-[#f2f0ec]")}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onEnterApp}
                className={`mt-8 w-full py-3 rounded-full text-sm font-medium transition active:scale-95 ${
                  p.featured
                    ? cc("bg-white hover:bg-[#dbdad7] text-[#121212]", "bg-[#f2f0ec] hover:bg-white text-[#0a0a0a]")
                    : cc(
                        "bg-[#121212] hover:bg-[#282828] text-white",
                        "bg-[#f2f0ec] hover:bg-white text-[#0a0a0a]"
                      )
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div
          className={`relative overflow-hidden rounded-3xl px-8 py-16 text-center ${cc(
            "bg-[#121212] text-white",
            "bg-gradient-to-br from-[#161618] to-[#0e0e10] border border-[#26262b]"
          )}`}
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <Zap className="w-10 h-10 text-white mx-auto" />
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight mt-4">{t.finalCta.title}</h2>
          <p className={`mt-3 max-w-xl mx-auto ${cc("text-[#aaa]", "text-[#b8b6b0]")}`}>{t.finalCta.sub}</p>
          <button
            onClick={onEnterApp}
            className="group inline-flex items-center space-x-2 bg-white hover:bg-[#dbdad7] text-[#121212] font-medium px-8 py-4 rounded-full mt-8 transition active:scale-95"
          >
            <span>{t.finalCta.cta}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        id="contact"
        className={`scroll-mt-16 border-t ${cc("border-[#e6e4e0]", "border-[#26262b]")}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#121212] flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-xl">FlipTrack</span>
            </div>
            <p className={`mt-4 text-sm max-w-sm leading-relaxed ${cc("text-[#666]", "text-[#a8a6a0]")}`}>
              {t.footer.desc}
            </p>
            <div className="mt-5 flex items-center space-x-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 text-sm font-medium px-4 py-2 rounded-full border transition ${cc(
                  "border-[#e6e4e0] hover:bg-[#e6e4e0]/50",
                  "border-[#26262b] hover:bg-[#161618]"
                )}`}
              >
                <MessageCircle className={`w-4 h-4 ${cc("text-[#121212]", "text-[#f2f0ec]")}`} />
                <span>WhatsApp</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 text-sm font-medium px-4 py-2 rounded-full border transition ${cc(
                  "border-[#e6e4e0] hover:bg-[#e6e4e0]/50",
                  "border-[#26262b] hover:bg-[#161618]"
                )}`}
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider">{t.footer.product}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.footer.linksProduct.map((l) => (
                <li key={l}>
                  <button
                    onClick={() => scrollTo(l === t.nav.features ? "features" : l === t.nav.how ? "how" : "pricing")}
                    className={`transition-colors hover:opacity-70 ${cc("text-[#555]", "text-[#b8b6b0]")}`}
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / stack */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider">{t.footer.contact}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center space-x-2">
                <MessageCircle className={`w-4 h-4 ${cc("text-[#121212]", "text-[#f2f0ec]")}`} />
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <BarChart3 className={`w-4 h-4 ${cc("text-[#121212]", "text-[#f2f0ec]")}`} />
                <span>{lang === "es" ? "Reportes PDF" : "PDF reports"}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Wallet className={`w-4 h-4 ${cc("text-[#121212]", "text-[#f2f0ec]")}`} />
                <span>{lang === "es" ? "Dólar BCV y paralelo en vivo" : "Live BCV & parallel dollar"}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t ${cc("border-[#e6e4e0]", "border-[#26262b]")}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className={cc("text-[#888]", "text-[#6f6e69]")}>{t.footer.rights}</span>
            <span className={`flex items-center space-x-1 ${cc("text-[#888]", "text-[#6f6e69]")}`}>
              <span>{t.footer.madeIn}</span>
              <span className={cc("text-[#121212]", "text-[#f2f0ec]")}>♥</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
