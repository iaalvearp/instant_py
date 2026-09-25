// Modelos compartidos con el backend de Tauri (src-tauri/src/modelos.rs).
// El serializado Rust llega en camelCase.

export interface Perfil {
  nombre: string;
  slug: string;
  creadoEn: string;
  pin: string | null;
}

export interface Proyecto {
  nombre: string;
  slug: string;
  creadoEn: string;
  modificadoEn: string;
  entrada: string;
}

export interface EntradaArbol {
  nombre: string;
  ruta: string;
  esCarpeta: boolean;
  hijos: EntradaArbol[];
}

export interface ResultadoEjecucion {
  salida: string;
  codigoSalida: number | null;
  tiempoExcedido: boolean;
  detenido: boolean;
}

export interface Preferencias {
  ejecucionAutomatica: boolean;
}

export interface PaqueteInfo {
  nombre: string;
  version: string;
}