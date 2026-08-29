# FlipTrack V7 — Prompt Actualizado con Lecciones de Análisis Reales

> Este archivo contiene SOLO las secciones actualizadas del FLIPTRACK_PROMPT_V7.md.
> Reemplaza las secciones correspondientes en el archivo original.

---

## 🧠 CORE DEL SISTEMA: El Motor IA (FlipMaster) — ACTUALIZADO

### El Prompt FlipMaster (EMBEBIDO en la app, NO es configuración del usuario)

Este prompt se envía a la IA en cada análisis. DEBE estar en `src/lib/ai.ts` como constante. Es el mismo que usa el escáner de tiendas (Fase 4) y el generador de PDF (Fase 5):

```
Actúa como FlipMaster, experto con 15 años en flipping de electrónica usada/defectuosa en múltiples plataformas (eBay, ShopGoodwill, Swappa, Amazon, MercadoLibre).

COMPRAS DESDE VENEZUELA: Usas casillero Liberty Express en Miami. El envío a Venezuela cuesta ~$3.10/lb (mínimo $25 para < 3 lbs) + combustible $0.75/lb + gastos operacionales $0.75/lb + gestión aduanal $1 + seguro 5% del FOB + IVA 16%. El precio de reventa en Venezuela es 50-80% más alto que en EE.UU. para electrónica Apple y premium. Si el envío va en SOBRE (teléfonos pequeños) el costo es ~$17-20; en caja se cobra el mayor entre peso real y volumétrico.

REGLA DE ORO: Evalúas COSTO TOTAL DEL PROYECTO (puja + envío USA + courier Venezuela + repuestos + comisiones de plataforma + buyer premium si aplica), no solo el precio del anuncio.

INSTRUCCIONES OBLIGATORIAS:

1. IDENTIFICA el producto exacto (marca, modelo, año, specs)
2. IDENTIFICA la plataforma (eBay / ShopGoodwill / Swappa / Amazon / MercadoLibre) — cada una tiene comisiones diferentes:
   - eBay: 13.25% + PayPal
   - ShopGoodwill: ~18% buyer premium + handling $3-5 (se añade al precio de ganadora)
   - Swappa: ~3-5% fee
   - Amazon: 15% + $0.99
   - MercadoLibre: 16% + $4
3. VERIFICA AL VENDEDOR — antes de calcular números:
   - Feedback % y número de calificaciones
   - Miembro desde (antigüedad de cuenta)
   - ¿Tiene tienda establecida?
   - ¿Acepta devoluciones?
   - ¿Vende múltiples电子产品 baratos? (patrón de scam)
   🚨 DESCARTE INMEDIATO si: cuenta < 90 días, 0 feedback, < 95% positivo, múltiples items baratos + no devoluciones
4. DETECTA defectos declarados y OCULTOS ("untested" = roto, "P/R" = enciende pero no testeado, fotos que evitan mostrar una cara, descripciones vagas)
5. LISTA accesorios faltantes (cargador, cable, caja, batería — cada faltante es un costo)
6. ESTIMA costo de reparación por cada defecto (escenario optimista Y pesimista)
7. CALCULA precio de reventa en Venezuela basado en el mercado local
8. DETERMINA si el costo total es ≤ 55% del precio de reventa y el ROI ≥ 40%
9. Si el vendedor bloquea freight-forwarders/casilleros (política en la descripción), indícalo como red flag crítico

PARA TELÉFONOS — REGLAS DE BLOQUEO (descarte inmediato):
- Si NO dice explícitamente "Factory Unlocked" / "Network Unlocked" / "Unlocked" → NO APTO
- Si dice carrier lock o compatibilidad con UNA sola red → NO APTO
- Si NO dice "iCloud Unlocked" / "Find My OFF" → NO APTO
- Si el vendedor no confirma desbloqueo de red + iCloud → NO APTO
- En TODOS estos casos: veredicto = "NO VALE LA PENA" sin calcular números

NO CONFUNDAS la sección "Find similar items from..." con el vendedor real — esa sección son ANUNCIOS PATROCINADOS de eBay.

RESPONDE EXACTAMENTE ESTE JSON SIN MARKDOWN NI TEXTOS ADICIONALES:

{
  "inspeccion": {
    "producto": "marca modelo año specs",
    "condicionReal": "buena|regular|mala|indeterminada",
    "defectos": ["defecto 1", "defecto 2"],
    "faltantes": ["cargador", "cable"],
    "redFlags": ["untested", "fotos insuficientes", "vendedor nuevo", "bloquea courier", "cuenta nueva <90 días"]
  },
  "vendedor": {
    "nombre": "nombre del vendedor",
    "feedbackPorcentaje": 99.5,
    "totalCalificaciones": 243,
    "miembroDesde": "2013",
    "aceptaDevoluciones": true,
    "esConfiworthy": true,
    "notas": "13 años en eBay, tienda establecida"
  },
  "costos": {
    "plataforma": "eBay|ShopGoodwill|Swappa|Amazon|MercadoLibre",
    "comisionPlataforma": 13.25,
    "buyerPremium": 0,
    "handlingFee": 0,
    "precioReventaUSD": 250,
    "costoRestauracionMin": 20,
    "costoRestauracionMax": 60,
    "costoRestauracionUsado": 40
  },
  "rentabilidad": {
    "pujaMaximaRecomendada": 85.50,
    "inversionTotal": 145,
    "gananciaNeta": 55,
    "roiPorcentaje": 37.9,
    "esRentable": true
  },
  "veredicto": {
    "decision": "PUJA|NO_PUJAS|NEGOCIA|ESPERA|NO_VALE_LA_PENA",
    "confianza": "alta|media|baja",
    "explicacion": "Razón breve del veredicto",
    "preguntasVendedor": ["pregunta 1", "pregunta 2"]
  }
}
```

### Tabla de comisiones por plataforma (referencia para la app)

| Plataforma    | Comisión     | Extras                  | Notas                      |
|---------------|-------------|-------------------------|----------------------------|
| eBay          | 13.25%      | PayPal/procesamiento    | + envío al comprador $8-15 |
| ShopGoodwill  | ~18% buyer premium | handling $3-5     | Se añade al precio ganador |
| Swappa        | 3-5% fee    | Solo entre personas     | Más barato que eBay        |
| Amazon        | 15% + $0.99 | Variable                | Más estricto en devoluciones |
| MercadoLibre  | 16% + $4    | Free shipping           | Bueno para reventa local VE |

### Patron de scam — Referencia rápida

| Señal | Umbral de descarte |
|-------|-------------------|
| Cuenta nueva | < 90 días |
| Feedback cero | 0 calificaciones |
| Feedback bajo | < 95% con > 20 ventas |
| Múltiples电子产品 baratos | ≥ 3 items a precios bajo mercado |
| No acepta devoluciones | Siendo nuevo = triple riesgo |
| Fotos de stock | No fotos reales del producto |

---

## Sección 6 — Tránsito y Logística: ACTUALIZACIÓN

### Disposición de la tabla de tracking (vista lista por defecto)

La sección de Tránsito y Logística ahora tiene:

**Vista por defecto:** Tabla de datos (NO tarjetas)
- Columnas: Producto (miniatura + título), Etapa Actual (con mini-indicador visual de los 4 pasos), Tracking US, Tracking Internacional (Liberty), Acciones
- Permite escanear decenas de paquetes rápidamente
- Filtros futuros: "Mostrar solo los que están en Doral"

**Selector de vista** (parte superior derecha, debajo de la dirección del casillero):
- 2 botones: Lista 📋 / Cuadrícula 🔲
- Cambio sin recargar página
- Alineado a la derecha

**Secuencia lógica de tracking:**
- Tramo 1-2 (US Freight + Tránsito USA): Tracking internacional = "Pendiente"
- Tramo 3+ (Vuelo Int + Courier): Se habilita/pide guía de Liberty Express
- La guía internacional NO existe al principio

**Actualización integrada por producto:**
- Sin formulario global al final de la página
- Cada fila tiene botón "Actualizar" → abre modal/panel lateral para ESE producto
- Si clic en "3. Vuelo Int" → pide Guía de Liberty
- Si clic en "1. US Freight" → pide Tracking de EE.UU.

---

## Sección de Configuración: ACTUALIZACIÓN

### Prueba de conexión IA (NUEVO)

Al lado del input de API key, agregar botón "🔄 Probar conexión":
1. Envía un mensaje de prueba ("ping") al proveedor configurado
2. Muestra "✅ Conexión OK (Xms)" o el error específico
3. Si el proveedor expone `/v1/models`, muestra la lista de modelos disponibles para elegir (selector)
4. Si es NVIDIA NIM: verificar que el modelo `deepseek-ai/deepseek-v4-flash` esté activo
5. **Fallback automático:** si DeepSeek falla, intentar con `meta/llama-3.2-3b-instruct` (más rápido, 1s de respuesta)

### Nota de modelos NVIDIA NIM

| Modelo | ID | Velocidad | Notas |
|--------|-----|-----------|-------|
| DeepSeek V4 Flash | `deepseek-ai/deepseek-v4-flash` | ~15-30s | Principal, MoE, contexto 1M |
| DeepSeek V4 Flash (0731) | `deepseek-ai/deepseek-v4-flash-0731` | ~15-30s | Versión específica, verificar disponibilidad |
| Llama 3.2 3B | `meta/llama-3.2-3b-instruct` | ~1-3s | Fallback rápido, menos preciso |

⚠️ **Problema conocido:** DeepSeek V4 Flash a veces pone la respuesta en `reasoning_content` en vez de `content`. El código debe:
1. Intentar `choices[0].message.content` primero
2. Si es `null` o vacío, usar `choices[0].message.reasoning_content`
3. Si ambos son null → error "respuesta vacía"

⚠️ **Problema conocido:** NVIDIA NIM puede devolver HTTP 529 (sobrecarga). El código debe:
1. Reintentar 2 veces con espera de 3s y 6s
2. Si sigue fallando → mostrar error claro y ofrecer "Usar fallback heurístico"
3. NUNCA esperar más de 25 segundos total por llamada

---

## AUTOMATIZACIÓN: Script escaner.mjs — ACTUALIZACIÓN

### Variables de entorno necesarias (para modo server/Vercel Cron)

```
NVIDIA_API_KEY=nvapi-...
FIRECRAWL_API_KEY=fc-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Vercel.json — NOTA IMPORTANTE

El plan **Hobby** de Vercel **NO permite cron jobs**. El error es:
```
Hobby accounts are limited to daily cron jobs. This cron expression
(0 */6 * * *) would run more than once per day. Upgrade to Pro.
```

**Soluciones:**
1. Usar `0 0 * * *` (una vez al día) en plan Hobby
2. Usar GitHub Actions con `schedule` (gratis)
3. Usar HERMES Agent local con `cron` del sistema
4. Upgrade a Vercel Pro ($20/mes) para cron ilimitado
