# 🏆 FlipTrack Vzla — Sistema Operativo de Flipping con IA

Sistema para **analizar productos de eBay con IA (FlipMaster)**, importarlos vía casillero
Liberty Express (Miami → Venezuela) y revenderlos con ganancia. Construido con
React 19 + TypeScript + Vite 6 + Tailwind v4 + Express.

- **Motor IA:** NVIDIA NIM (DeepSeek-V4) con fallback a Gemini — `/api/analyze`
- **Scraper:** Firecrawl (esquiva CAPTCHA de eBay) + oEmbed + cheerio
- **Tasas:** DolarFlow (oficial + paralelo) — `/api/exchange-rate`
- **Persistencia:** IndexedDB (offline-first, los datos sobreviven al recargar)
- **PWA:** instalable, service worker con cache-first

## Módulos principales

`Dashboard · AI Analyzer (FlipMaster) · Oportunidades · Compras · Tránsito & Logística ·
Reparaciones · Inventario · Ventas · Transacciones · Clientes · Inbox Documental ·
Auditoría · Reportes ROI · Exportaciones · eBay Sync · Tiendas eBay · Calculadoras · Ajustes`

## Quick start

```bash
npm install
cp .env.example .env   # agrega tus API keys
npm run dev            # http://localhost:3000
```

### Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `NVIDIA_API_KEY` | **Principal** — análisis con DeepSeek vía NVIDIA NIM |
| `GEMINI_API_KEY` | Fallback de análisis (opcional) |
| `FIRECRAWL_API_KEY` | Scraper de tiendas eBay (esquiva CAPTCHA) — opcional |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Alertas de escaneo — opcional |
| `CRON_SECRET` | **Requerido** para Vercel Cron — sin él el endpoint devuelve 503 |

## 🤖 Automatización — Escáner Automático de Tiendas

`scripts/escaner.mjs` lee las tiendas de `scripts/tiendas.json`, escanea cada una con
Firecrawl, analiza los candidatos con NVIDIA NIM (DeepSeek) y envía un resumen por
Telegram. **Es 100% standalone** (usa `fetch` nativo de Node 18+, sin dependencias).

```bash
node scripts/escaner.mjs              # escaneo completo
node scripts/escaner.mjs --dry-run    # solo scrape, sin IA ni Telegram
node scripts/escaner.mjs --max-items 5
node scripts/escaner.mjs --no-telegram
```

Los resultados se guardan en `escaneos/escaneo-YYYY-MM-DD.json`. Exit code `1` si todo falla.

### Opción A — HERMES Agent local (cron de macOS/Linux)

Ejecuta el escáner cada 6 horas con `cron`:

```bash
# 1. Da permisos de ejecución
chmod +x scripts/escaner.mjs

# 2. Edita el crontab
crontab -e
```

```cron
# m h  dom mon dow   command
0 */6 * * *  cd /ruta/a/FlipMaster- && /usr/local/bin/node scripts/escaner.mjs >> escaneos/cron.log 2>&1
```

Verifica el log con `tail -f escaneos/cron.log`. También puedes usar `launchd` (macOS) o
systemd timers (Linux) con la misma idea.

### Opción B — Vercel Cron (endpoint en producción)

1. El endpoint `api/cron-escaner.ts` ejecuta el mismo motor cuando Vercel Cron lo invoca.
2. El schedule ya está en `vercel.json` → `crons` (**1 vez al día** a las 06:00 UTC — el plan Hobby solo permite crons diarios; en Pro puedes usar `0 */6 * * *` para cada 6 horas).
3. Configura en **Vercel → Project → Settings → Environment Variables**: `CRON_SECRET`,
   `FIRECRAWL_API_KEY`, `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
4. Vercel firma el request con `Authorization: Bearer $CRON_SECRET` — el endpoint lo valida.

> ⚠️ El cron de Vercel tiene límite de duración (~60s máx en planes básicos). El endpoint usa
> `CRON_MAX_ITEMS=1` por defecto para caber en el tiempo (escaneo superficial). Para escaneos más profundos usa
> la **Opción A** (local) o la **Opción C** (GitHub Actions).

### Opción C — GitHub Actions (schedule + secrets)

El workflow `.github/workflows/escaner.yml` ejecuta el escáner cada 6 horas en un runner
gratuito (30 min de timeout, sin límite práctico de items).

1. Sube el repo a GitHub.
2. Agrega los **secrets** en **Settings → Secrets and variables → Actions**:
   `FIRECRAWL_API_KEY`, `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
3. La pestaña **Actions** mostrará el workflow; también tiene botón **Run workflow** manual.

## Deploy en Vercel

El repo incluye `vercel.json` + `api/index.ts` (función serverless con la app Express).
El SPA se sirve desde `dist` y todas las rutas `/api/*` van a la función.

1. Sube el proyecto a GitHub.
2. En Vercel: **Add New → Project** → importa el repo → **Deploy**.
3. Agrega las env vars (NVIDIA, Firecrawl, Telegram, CRON_SECRET) en Settings.
4. Listo: el análisis IA, el escáner y las tasas funcionan en producción.

## Desglose courier Liberty (calculado en `src/lib/liberty.ts`)

Tarifa real verificada: **$3.10/lb** (mínimo $25 por paquete < 3 lb; sobre = tarifa plana).
Se cobra el **mayor entre peso real y peso volumétrico** (`(L×A×P)/166` para cajas).
Recargos: combustible $0.75/lb + gastos operacionales $0.75/lb + gestión aduanal $1 +
seguro 5% FOB + IVA 16% sobre (flete+combustible+G.Op+G.A).
