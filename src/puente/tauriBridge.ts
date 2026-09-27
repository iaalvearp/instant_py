// Puente entre la interfaz (src/) y el backend de Tauri (src-tauri/).
// Toda comunicación con Rust pasa por aquí usando invoke(). Los argumentos
// snake_case de Rust se envían aquí en camelCase.

import { invoke } from "@tauri-apps/api/core";
import type {
  EntradaArbol,
  PaqueteInfo,
  Perfil,
  Preferencias,
  Proyecto,
  ResultadoEjecucion,
} from "../tipos/modelos";

// En desarrollo se loguea en consola solo cuando una llamada falla.
async function invocar<T>(
  nombreComando: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(nombreComando, args);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[INVOKE] FALLO en", nombreComando, e);
    }
    throw e;
  }
}

export function ejecutarPython(codigo: string): Promise<ResultadoEjecucion> {
  return invocar<ResultadoEjecucion>("ejecutar_python", { codigo });
}

export function detenerEjecucion(): Promise<void> {
  return invocar<void>("detener_ejecucion");
}

export function obtenerPreferencias(): Promise<Preferencias> {
  return invocar<Preferencias>("obtener_preferencias");
}

export function guardarPreferencias(
  preferencias: Preferencias,
): Promise<Preferencias> {
  return invocar<Preferencias>("guardar_preferencias", { preferencias });
}

export function listarPerfiles(): Promise<Perfil[]> {
  return invocar<Perfil[]>("listar_perfiles");
}

export function crearPerfil(nombre: string): Promise<Perfil> {
  return invocar<Perfil>("crear_perfil", { nombre });
}

export function listarProyectos(perfilSlug: string): Promise<Proyecto[]> {
  return invocar<Proyecto[]>("listar_proyectos", { perfilSlug });
}

export function crearProyecto(
  perfilSlug: string,
  nombre: string,
): Promise<Proyecto> {
  return invocar<Proyecto>("crear_proyecto", { perfilSlug, nombre });
}

export function eliminarProyecto(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<void> {
  return invocar<void>("eliminar_proyecto", { perfilSlug, proyectoSlug });
}

export function listarArchivos(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<EntradaArbol[]> {
  return invocar<EntradaArbol[]>("listar_archivos", {
    perfilSlug,
    proyectoSlug,
  });
}

export function leerArchivo(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
): Promise<string> {
  return invocar<string>("leer_archivo", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
  });
}

export function escribirArchivo(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
  contenido: string,
): Promise<void> {
  return invocar<void>("escribir_archivo", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
    contenido,
  });
}

export function crearArchivo(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
): Promise<void> {
  return invocar<void>("crear_archivo", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
  });
}

export function crearCarpeta(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
): Promise<void> {
  return invocar<void>("crear_carpeta", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
  });
}

export function eliminarEntrada(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
): Promise<void> {
  return invocar<void>("eliminar_entrada", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
  });
}

export function listarPaquetesInstalados(): Promise<PaqueteInfo[]> {
  return invocar<PaqueteInfo[]>("listar_paquetes_instalados");
}

export function instalarPaquete(nombre: string): Promise<string> {
  return invocar<string>("instalar_paquete", { nombre });
}

export function desinstalarPaquete(nombre: string): Promise<string> {
  return invocar<string>("desinstalar_paquete", { nombre });
}

export function leerRequirements(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<string[]> {
  return invocar<string[]>("leer_requirements", { perfilSlug, proyectoSlug });
}

export function escribirRequirements(
  perfilSlug: string,
  proyectoSlug: string,
  paquetes: string[],
): Promise<void> {
  return invocar<void>("escribir_requirements", {
    perfilSlug,
    proyectoSlug,
    paquetes,
  });
}

export function sincronizarRequirements(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<void> {
  return invocar<void>("sincronizar_requirements", { perfilSlug, proyectoSlug });
}