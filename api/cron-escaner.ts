/**
 * FlipTrack — Endpoint de Vercel Cron
 * ===================================
 * Ejecuta el escáner automático de tiendas (Firecrawl + NVIDIA NIM + Telegram).
 *
 * Vercel Cron envía un GET a esta ruta con header `Authorization: Bearer <CRON_SECRET>`.
 * Configura en Vercel:
 *   - CRON_SECRET      (token que Vercel usa para autenticar el cron)
 *   - FIRECRAWL_API_KEY
 *   - NVIDIA_API_KEY
 *   - TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (opcional)
 *
 * El schedule se define en vercel.json → "crons".
 */
import { escanearTodas } from "../scripts/escaner.mjs";
import tiendas from "../scripts/tiendas.json" with { type: "json" };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Usa GET (Vercel Cron)." });
  }

  // Protección: el cron de Vercel firma con Authorization: Bearer CRON_SECRET.
  // Si no hay CRON_SECRET configurado, el endpoint queda bloqueado (503) para
  // evitar que cualquiera dispare escaneos pagados (créditos Firecrawl/NVIDIA).
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || "");
  if (!secret) {
    return res.status(503).json({ success: false, error: "CRON_SECRET no configurado. Agrégalo en Vercel → Settings → Environment Variables." });
  }
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, error: "CRON_SECRET inválido. Revisa la env var en Vercel." });
  }

  try {
    // Default 1 item/tienda: en Hobby el cron maxDuration es 60s y Firecrawl tarda
    // ~15-20s por tienda. Para escaneos profundos usa GitHub Actions (cada 6h).
    const maxItems = parseInt(process.env.CRON_MAX_ITEMS || "1", 10);
    const reporte = await escanearTodas({
      tiendas: tiendas as any[],
      maxItems,
      onLog: (msg) => console.log(msg),
    });
    return res.status(200).json({ success: true, fecha: reporte.fecha, ...reporte });
  } catch (err: any) {
    console.error("Cron escáner error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Error ejecutando el escáner." });
  }
}
