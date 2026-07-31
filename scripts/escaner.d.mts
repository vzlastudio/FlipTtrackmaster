export interface OportunidadAutomatica {
  tienda: string;
  tier: string;
  titulo: string;
  precio: number;
  enlace: string;
  roi: number;
  ganancia: number;
  pujaMax: number;
  reventaVzla: number;
  resumen: string;
  preguntas: string[];
}

export interface ReporteEscaneoAutomatico {
  fecha: string;
  tiendas: number;
  itemsVistos: number;
  itemsAnalizados: number;
  oportunidades: OportunidadAutomatica[];
  errores: string[];
}

export interface OpcionesEscaneo {
  dryRun?: boolean;
  noTelegram?: boolean;
  maxItems?: number;
  tiendasPath?: string | null;
  tiendas?: Array<{
    id?: string;
    nombre: string;
    url: string;
    tier?: string;
    precioMaximoUSD: number;
    categoria?: string;
    activa?: boolean;
    frecuenciaHoras?: number;
    bloqueaCourier?: boolean;
  }>;
  onLog?: (msg: string) => void;
}

export function escanearTodas(opts?: OpcionesEscaneo): Promise<ReporteEscaneoAutomatico>;
