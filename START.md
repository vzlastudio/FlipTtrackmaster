# FlipTrack OS — Start Here

## Variable de Entorno Obligatoria

La **única** variable que necesitas configurar para que la webapp funcione completa:

```
NVIDIA_API_KEY=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
```

> **Copia y pega esa línea exacta como Environment Variable en Vercel.**

## Variables Opcionales (mejoran funcionalidad)

| Variable | Descripción | Cómo obtener |
|---|---|---|
| `FIRECRAWL_API_KEY` | Escaneo profundo de tiendas | firecrawl.dev (gratis 500 créditos) |
| `BROWSERBASE_API_KEY` | Navegador headless para sitios con Cloudflare | browserbase.com (gratis 100 hrs) |

## Qué hace cada módulo

| Módulo | Función | Usa NVIDIA? |
|---|---|---|
| Dashboard | Resumen de métricas, ganancias, inventario | No |
| Análisis IA | Analiza URLs de eBay/ShopGoodwill/Swappa | ✅ Sí |
| Inventario | Control de artículos comprados/vendidos | No |
| Tránsito | Seguimiento de envíos (US → Miami → VE) | No |
| Tiendas | Escaneo automático de tiendas | ✅ Sí (Firecrawl + NVIDIA) |
| Configuración | API keys, modelo, comisiones, casillero | No |
| Calculator | Calculadora de envío Liberty Express | No |
| Reportes | PDFs profesionales de análisis | No |

## URLs de la App

- **Producción:** https://fliptrackmaster.vercel.app/
- **API Health:** https://fliptrackmaster.vercel.app/api/health
- **Test AI:** `POST /api/test-ai` (prueba la conexión NVIDIA)
- **Analyze:** `POST /api/analyze` (analiza un producto)
- **Scrape Smart:** `POST /api/scrape-smart` (Firecrawl/Stagehand)

## Desarrollo Local

```bash
git clone https://github.com/vzlastudio/FlipTtrackmaster.git
cd FlipTtrackmaster
cp .env.example .env   # Edita y pon tu NVIDIA_API_KEY
npm install
npm run dev             # http://localhost:5173
```

## Modelo de IA

- **Default:** `deepseek-ai/deepseek-v4-flash-0731` (NVIDIA NIM)
- **Premium:** `deepseek-ai/deepseek-v4-pro-0813`
- **API Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`

## Flujos principales

### Analizar un producto
1. Pegar URL → `/api/analyze`
2. Backend extrae datos con Puppeteer/Firecrawl
3. NVIDIA DeepSeek analiza rentabilidad
4. Devuelve veredicto: PUJA / NO PUJAS / NEGOCIA

### Escanear una tienda
1. URL de tienda → `/api/scrape-store` o `/api/scrape-smart`
2. Firecrawl/Stagehand extrae listings
3. NVIDIA analiza cada uno
4. Genera ranking de oportunidades

### Calcular envío Liberty
1. Dimensions + peso → Calculator
2. Calcula: flete ($3.10/lb, mín $25) + combustible + IVA + seguro
3. Devuelve costo total en USD y BS

---

*FlipTrack OS v7 — Built for Venezuela flippers*
