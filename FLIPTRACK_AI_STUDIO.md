# 🏆 FLIPTRACK OS — Sistema de Flipping con IA para Venezuela

Genera una aplicación web React + TypeScript + Vite + Tailwind CSS v4. El propósito de la app es **analizar productos de múltiples plataformas con IA** (eBay, ShopGoodwill, Swappa, Amazon, MercadoLibre) para determinar si son rentables para comprar desde Venezuela vía casillero Liberty Express.

**⚠️ REGLA ABSOLUTA: NO dejes NINGUNA página como placeholder. Cada ruta debe estar COMPLETA con UI funcional y datos reales. CERO "en desarrollo" o "TODO".**

---

## 🧠 CORE DEL SISTEMA: El Motor IA (FlipMaster)

La IA NO es un módulo opcional. Es el CORAZÓN de la app. Todo empieza con un análisis de IA.

### Cómo funciona el análisis IA

1. Usuario ingresa datos de un producto (manual o pegando URL de eBay/ShopGoodwill/Swappa)
2. La app construye un prompt estructurado con el producto, la plataforma y las tarifas del usuario
3. Llama a la API de NVIDIA/OpenAI/Gemini con ese prompt
4. La IA responde SOLO JSON con: `inspeccion`, `vendedor`, `costos`, `rentabilidad`, `veredicto`
5. La app PARSEA el JSON de la IA y lo ENRIQUECE con:
   - `courierLiberty` → calculado con `calcularLibertyExpress()` (SOBREESCRIBE los valores de la IA)
   - `matematica` → calculado con `calcularMatematicas()` (SOBREESCRIBE `rentabilidad.pujaMaximaRecomendada` con el valor local más preciso)
   - `sistemaUsado` → "NVIDIA DeepSeek" o "Fallback heurístico"
   - `id` → generateUUID()
   - `fechaCreacion` → new Date().toISOString()
6. La app muestra el resultado completo usando los valores ENRIQUECIDOS (matematica.pujaMaximaRecomendada, no rentabilidad.pujaMaximaRecomendada)
7. El usuario puede guardar como oportunidad (IndexedDB store 'analisis') o convertir en compra

### El Prompt FlipMaster (EMBEBIDO en la app, NO es configuración del usuario)

Este prompt se envía a la IA en cada análisis. DEBE estar en `src/lib/ai.ts` como constante:

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
   - ¿Vende múltiples productos baratos de diferentes categorías? (patrón de scam)
   🚨 DESCARTE INMEDIATO si: cuenta < 90 días, 0 feedback, < 95% positivo, múltiples items baratos + no devoluciones
4. DETECTA defectos declarados y OCULTOS ("untested" = roto, "P/R" = enciende pero no testeado a fondo, fotos que evitan mostrar una cara, descripciones vagas)
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
| Múltiples productos baratos | ≥ 3 items a precios bajo mercado |
| No acepta devoluciones | Siendo nuevo = triple riesgo |
| Fotos de stock | No fotos reales del producto |

### Integración IA (src/lib/ai.ts)

```typescript
async function analizarProducto(datos: AnalysisData, config: FlipConfig): Promise<AnalisisResultado>
async function analisisConIA(mensaje: string, config: FlipConfig): Promise<string>
function analisisFallback(datos: AnalysisData, config: FlipConfig): AnalisisResultado
class AIError extends Error { tipo: 'auth' | 'rate_limit' | 'server' | 'timeout' | 'network' | 'unknown' }

// El analisisConIA debe tener:
// - Fetch a {baseUrl}/chat/completions con Bearer token
// - Timeout 25s con AbortController (NVIDIA puede tardar, pero no más de 25s)
// - Manejar errores: 401 (toast 'API Key inválida'), 429 ('Límite excedido'),
//   500+ ('Servidor con problemas'), 529 ('NVIDIA sobrecargado — reintentar'),
//   timeout ('Tardó demasiado'), network ('Error de conexión')
// - Reintentar 2 veces si 529 (espera 3s y 6s)
// - PARSEO DEFENSIVO: intentar choices[0].message.content, si es null usar
//   choices[0].message.reasoning_content (DeepSeek v4 a veces pone respuesta ahí)
// - Si falla, mostrar toast de error + botón "Reintentar" + opción de "Usar análisis manual"
// - NO romper la app si la IA no responde

// El analisisFallback debe:
// - Detectar categoría por keywords: laptop/thinkpad → $350, iphone/samsung → $250, ipad → $300
// - Si es "for-parts" o "untested" → precio reventa * 0.6
// - Calcular defectos según descripción (pantalla rota, batería, sin cargador, etc.)
// - Retornar estructura JSON IDÉNTICA a la que retorna la IA
```

---

## TECH STACK
- React 19, TypeScript, Vite 6
- Tailwind CSS v4, lucide-react icons
- React Router DOM v7
- idb (IndexedDB wrapper), clsx, tailwind-merge
- date-fns (formatear fechas), motion (animaciones)

## SCRIPTS package.json
```json
"scripts": {
  "dev": "vite --port=3000 --host=0.0.0.0",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "tsc --noEmit"
}
```

## VARIABLES DE ENTORNO
⚠️ **Las API keys de IA NUNCA van en variables de entorno `VITE_*`** (se exponen en el bundle).
El usuario ingresa sus API keys en `/settings` y se guardan en localStorage.

Generar archivo `.env.example` en la raíz con SOLO lo seguro para build time:
```
# Client ID público de eBay (no es secreto)
VITE_EBAY_CLIENT_ID=
```
También generar `.gitignore` con:
```
node_modules/
dist/
.env
.env.local
*.log
```

Generar también `vercel.json` para SPA routing:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## PÁGINAS — TODAS COMPLETAS (15 páginas)

### 1. Dashboard `/` — Resumen del negocio
- KPIs: capital invertido, recuperado, ROI %, inventario activo, alertas logísticas
- Últimos 10 flips con fecha, estado, monto
- Botón "🤖 Nuevo Análisis IA"
- Sidebar: tasas BCV + Paralelo del día (dolarflow.com). Si el fetch falla, mostrar última tasa cacheada con badge "desactualizado"
- **Estado vacío:** "No hay actividades aún" con botón "🤖 Analizar primer producto"

### 2. 🤖 Analizador IA `/analyze` — ★ MÓDULO PRINCIPAL

**Formulario de entrada:**
- Título del producto (requerido), Precio USD (requerido)
- **Plataforma:** eBay | ShopGoodwill | Swappa | Amazon | MercadoLibre (selector)
- Condición: usado | for parts | untested | P/R (parts & repair) | reacondicionado
- Vendedor, feedback %, ventas totales, watchers, bids
- Peso (lbs), dimensiones (largo x alto x prof en pulgadas)
- Embalaje: sobre | caja (afecta cálculo courier)
- Descripción del listing (textarea grande)
- Enlace del anuncio (opcional)

**Loading state:** Spinner animado + texto "Consultando motor IA..."

**Error handling:** Si la IA falla:
- Toast de error con el mensaje específico
- Botón "🔄 Reintentar"
- Botón "📝 Usar análisis manual" → ejecuta analisisFallback()
- NO mostrar pantalla en blanco

**Resultado (panel semáforo):**
- Header color: VERDE (PUJA) | ROJO (NO_PUJAS) | AMARILLO (ESPERA/NEGOCIA)
- ROI % grande (usar `matematica.roi`)
- Puja máxima recomendada (usar `matematica.pujaMaximaRecomendada`)
- Desglose completo: precio, courier Liberty, reparación, comisiones, total, ganancia neta
- **Sección Vendedor:** feedback, antigüedad, veredicto de confianza
- Inspección forense: defectos, red flags, faltantes
- Preguntas sugeridas al vendedor
- Botón "💾 Guardar Oportunidad"
- Botón "🔗 Abrir anuncio" → link al listing
- Sistema usado

### 3. Oportunidades `/opportunities`
- Grid de tarjetas con análisis guardados
- Cada card: título, ROI % grande, precio, ganancia neta, riesgo
- Barra de color según ROI: verde ≥40%, azul ≥20%, ámbar <20%
- Botón "Comprar" → crea Flip en 'flips' + redirige a /purchases
- Botón "Descartar" → confirmación + elimina
- **Estado vacío:** "No hay oportunidades guardadas"

### 4. Compras `/purchases`
- Lista de todos los flips (más reciente primero)
- Cada compra: título, vendedor, condición, estado tracking, fecha
- Desglose inversión: puja $, courier $, repuestos $, total $
- Input fecha de compra
- Link rápido a /logistics
- **Estado vacío:** "No hay compras registradas"

### 5. Tránsito y Logística `/logistics`
- Solo flips activos (no recibidos ni vendidos)
- **Vista de tabla** (columnas: Producto, Etapa Actual, Tracking US, Tracking Int'l, Acciones)
- Selector de vista: Lista 📋 / Cuadrícula 🔲 (parte superior derecha)
- Botones de estado: Pendiente → Envió → Tránsito USA → 📦 En Casillero → Courier → Tránsito Vzla → Aduana → Recibido
- Al cambiar a "En Casillero": toast "📦 Calcula envío Venezuela"
- Al cambiar a "Recibido": toast "✅ Muévelo a inventario"
- **Estado vacío:** "No hay envíos activos"

### 6. Inventario `/inventory`
- Grid: solo flips RECIBIDOS y no vendidos
- Botón "🔧 Reparar" → EN_REPARACION
- Botón "💰 Vender" → LISTO_PARA_VENTA
- **Estado vacío:** "Inventario vacío"

### 7. Reparaciones `/repairs`
- Lista flips EN_REPARACION
- Input editable: costo real reparación $
- Botón "✅ Completar" → REPARADO
- **Estado vacío:** "No hay productos en reparación"

### 8. Ventas `/sales`
- Sección "Listos para vender" con botón "💰 Registrar Venta"
- Modal: precio vendido USD, nombre comprador
- Sección "Vendidos": lista de ventas cerradas con ganancia vs estimado
- **Estado vacío:** "No hay ventas registradas"

### 9. Clientes `/clients`
- Lista de compradores con total comprado, cantidad, última compra
- **Estado vacío:** "No hay clientes registrados"

### 10. Historial `/history`
- Timeline vertical con icono, fecha, descripción
- **Estado vacío:** "No hay eventos registrados"

### 11. eBay Sync `/ebay`
- Input eBay Client ID → localStorage
- Botón "🔗 Conectar eBay" → OAuth PKCE
- Botón "📥 Importar Compras" → eBay Buy API
- **Estado vacío:** "Configura tu eBay App ID"

### 12. Exportaciones `/exports`
- Botones CSV y JSON
- Historial de exportaciones
- **Estado vacío:** "No hay exportaciones previas"

### 13. Configuración `/settings`
- Sección IA: selector proveedor (NVIDIA NIM / OpenAI / Gemini / Custom), input API key, modelo, temperatura
- Botón "🔄 Probar conexión" al lado del API key
- Sección Liberty: $3.10/lb, comb $0.75, G.Op $0.75, G.A $1, seguro 5%, IVA 16%
- Sección Reglas: ROI min 40%, ganancia min $30
- Sección eBay: App ID input
- ⚠️ Nota de seguridad: "API keys en localStorage, no las compartas"
- Botón "💾 Guardar"

### 14. Calculadora Courier `/courier`
- Inputs: peso lbs, dimensiones, valor FOB, embalaje (sobre/caja)
- Cálculo instantáneo con todos los conceptos
- Si embalaje = sobre → mínimo $17-20; si caja → mayor entre real y volumétrico

### 15. Reportes `/reports`
- KPIs globales, top flips, tabla vendidos vs no vendidos
- **Estado vacío:** "No hay datos suficientes"

---

## FLUJO DE ESTADOS DEL FLIP (state machine)
```
OPORTUNIDAD → COMPRA (PENDIENTE) → VENDEDOR_ENVIO → TRANSITO_USA → EN_CASILLERO
→ COURIER_ENVIADO → TRANSITO_VZLA → ADUANA → RECIBIDO → [REPARACION → REPARADO]
→ LISTO_PARA_VENTA → VENDIDO
```

---

## BIBLIOTECA /src/lib/

### db.ts — IndexedDB
Stores: analisis, flips, transacciones, clientes, eventos, exportaciones
Funciones: getDB(), saveItem(), getItem(), getAllItems(), deleteItem(), generateUUID(), registerEvent()

### config.ts — Configuración
getConfig(): FlipConfig, saveConfig(partial): void

### ai.ts — Motor IA
FLIPMASTER_PROMPT constante, analizarProducto(), analisisConIA(), analisisFallback(), AIError

### liberty.ts — Courier
calcularLibertyExpress(peso, dims, fob, config, embalaje): CourierResult
calcularMatematicas(parcial, puja, courier, config): MathResult

### dolar.ts — Tasas
obtenerTasasDolar(): Promise<TasasResult> — fetch a dolarflow.com con cache 24h

### ebay.ts — eBay
generarPKCE(), conectarEbay(), sincronizarComprasEbay()

---

## COMPONENTES COMPARTIDOS

### Layout.tsx
- Al montar (useEffect), llamar a `obtenerTasasDolar()` para cargar BCV + Paralelo
- Sidebar con 15 rutas, activo en AZUL
- Topbar: logo "FlipTrack OS", mostrar tasas, toggle dark/light
- Mobile: sidebar oculto con hamburguesa + bottom nav con 5 iconos
- Scroll suave, transiciones

### Toast.tsx — Provider + useToast()
- 4 tipos: success (verde), error (rojo), warning (ámbar), info (azul)
- Auto-dismiss: success/info 3s, error 5s, warning 4s

### Modal.tsx — Confirmaciones y formularios
- Overlay oscuro, centrado
- Props: isOpen, onClose, title, children

---

## TYPESCRIPT (src/types.ts)

```typescript
// INPUT del formulario de análisis
export interface AnalysisData {
  titulo: string;
  precioSubasta: number;
  plataforma: 'eBay' | 'ShopGoodwill' | 'Swappa' | 'Amazon' | 'MercadoLibre';
  condicion: string;
  vendedor: string;
  feedback: number;
  ventas: number;
  watchers: number;
  bids: number;
  descripcion: string;
  pesoEstimado: number;
  dimensiones: string;
  embalaje: 'sobre' | 'caja';
  enlaceEbay?: string;
  categoria?: string;
}

// Configuración
export interface FlipConfig {
  provider: 'nvidia' | 'openai' | 'gemini' | 'custom';
  providerConfig: { name: string; baseUrl: string; apiKey: string; model: string };
  temperatura: number;
  maxTokens: number;
  dolar: { oficialUrl: string; paraleloUrl: string };
  liberty: LibertyTarifas;
  ebay: { comisionPorcentaje: number; comisionFija: number };
  reglas: { roiMinimo: number; gananciaMinimaUSD: number; inversionMaxPorcentaje: number };
}

export interface LibertyTarifas {
  fletePorLb: number;
  combustiblePorLb: number;
  gastosOperacionalesPorLb: number;
  gestionAduanal: number;
  seguroPorcentaje: number;
  ivaPorcentaje: number;
  divisorVolumetrico: number;
}

// Resultado de dolarflow.com
export interface TasasResult {
  oficial: number;
  paralelo: number;
  compraParalelo: number;
  ventaParalelo: number;
  fuenteOficial: string;
  fuenteParalelo: string;
  fechaActualizacion: string;
}

// Resultado del courier
export interface CourierResult {
  pesoRealLbs: number;
  pesoVolumetricoLbs: number;
  pesoCobrableLbs: number;
  flete: number;
  combustible: number;
  gastosOperacionales: number;
  gestionAduanal: number;
  iva: number;
  seguro: number;
  totalCourier: number;
}

// Resultado matemático del flip
export interface MathResult {
  precioReventa: number;
  comisiones: number;
  envioComprador: number;
  logisticaVenezuela: number;
  restauracion: number;
  pujaEstimada: number;
  gananciaNeta: number;
  inversionTotal: number;
  roi: number;
  margen: number;
  pujaMaximaRecomendada: number;
  pujaMaximaReal: number;
  cumpleROI: boolean;
  cumpleGananciaMinima: boolean;
}

// Resultado COMPLETO del análisis (IA o fallback)
export interface AnalisisResultado {
  id: string;
  fechaCreacion: string;
  tituloAnuncio: string;
  precioSubasta: number;
  plataforma: string;
  condicionListado: string;
  pesoEstimado: number;
  dimensiones: string;
  sistemaUsado: string;
  inspeccion: {
    producto: string;
    condicionReal: string;
    defectos: string[];
    faltantes: string[];
    redFlags: string[];
  };
  vendedor?: {
    nombre: string;
    feedbackPorcentaje: number;
    totalCalificaciones: number;
    miembroDesde: string;
    aceptaDevoluciones: boolean;
    esConfiworthy: boolean;
    notas: string;
  };
  costos: {
    plataforma: string;
    comisionPlataforma: number;
    buyerPremium: number;
    handlingFee: number;
    precioReventaUSD: number;
    costoRestauracionMin: number;
    costoRestauracionMax: number;
    costoRestauracionUsado: number;
  };
  rentabilidad: {
    pujaMaximaRecomendada: number;
    inversionTotal: number;
    gananciaNeta: number;
    roiPorcentaje: number;
    esRentable: boolean;
  };
  veredicto: {
    decision: 'PUJA' | 'NO_PUJAS' | 'NEGOCIA' | 'ESPERA' | 'NO_VALE_LA_PENA';
    confianza: 'alta' | 'media' | 'baja';
    explicacion: string;
    preguntasVendedor: string[];
  };
  courierLiberty: CourierResult;
  matematica: MathResult;
}

// Flip (compra/producto en seguimiento)
export interface FlipItem {
  id: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  titulo: string;
  condicionCompra: string;
  vendedor: string;
  pujaGanadora: number;
  costoLiberty: number;
  costoReparacion: number;
  costoAccesorios: number;
  costoTotal: number;
  trackingVendedor?: string;
  transportistaVendedor?: string;
  fechaCompra?: string;
  estado: string;
  estadoTracking?: string;
  fechasTracking?: Record<string, string>;
  vendido: boolean;
  precioVentaUSD?: number;
}

// Evento de historial
export interface Evento {
  id: string;
  tipo: string;
  fecha: string;
  detalle: string;
}
```

---

## ESTILOS
- Tailwind CSS v4, modo oscuro por defecto (clase 'dark' en `<html>`)
- Colores: slate neutro, blue primary (#3b82f6), emerald success (#10b981), red danger (#ef4444), amber warning (#f59e0b)
- Responsive: 1 col móvil, 2 col tablet, 3 col desktop
- Cards con border + shadow-sm + hover:shadow-md
- Transiciones suaves en hover y cambio de estado

## PWA
- manifest.json: name "FlipTrack OS", short_name "FlipTrack", theme #0f1117, display standalone
- sw.js: cache-first assets, network-first APIs (dolarflow, nvidia)
- Notificaciones locales cada hora: flips detenidos >7 días
- Meta tags en index.html

## INSTRUCCIONES DE USO (incluir en README.md generado)
```markdown
# FlipTrack OS

1. Instalar: `npm install`
2. Copiar `.env.example` a `.env` (solo contiene el Client ID público de eBay)
3. Desarrollar: `npm run dev`
4. Ir a Configuración (`/settings`) y pegar tu API key de NVIDIA NIM
5. Build producción: `npm run build`
6. Deploy a Vercel: conectar repo de GitHub
```

## ⚠️ RECORDATORIO FINAL
CERO placeholders. CERO "en desarrollo". CERO "TODO". Cada una de las 15 páginas debe tener UI funcional con datos reales de IndexedDB. La IA es el motor principal — si no hay API key, usar fallback heurístico (no romper). Si la IA falla, mostrar error + botón reintentar + opción de análisis manual. **Siempre verificar al vendedor ANTES de calcular números.** Para teléfonos, SIEMPRE verificar desbloqueo de red + iCloud.
