// Puente entre la interfaz (src/) y el backend de Tauri (src-tauri/).
// Toda comunicación con Rust pasa por aquí usando invoke(). Los argumentos
// snake_case de Rust se envían aquí en camelCase.

import { invoke } from "@tauri-apps/api/core";
import type {
  EntradaArbol,
  Perfil,
  Preferencias,
  Proyecto,
  ResultadoEjecucion,
} from "../tipos/modelos";

export function ejecutarPython(codigo: string): Promise<ResultadoEjecucion> {
  return invoke<ResultadoEjecucion>("ejecutar_python", { codigo });
}

export function detenerEjecucion(): Promise<void> {
  return invoke<void>("detener_ejecucion");
}

export function obtenerPreferencias(): Promise<Preferencias> {
  return invoke<Preferencias>("obtener_preferencias");
}

export function guardarPreferencias(
  preferencias: Preferencias,
): Promise<Preferencias> {
  return invoke<Preferencias>("guardar_preferencias", { preferencias });
}

export function listarPerfiles(): Promise<Perfil[]> {
  return invoke<Perfil[]>("listar_perfiles");
}

export function crearPerfil(nombre: string): Promise<Perfil> {
  return invoke<Perfil>("crear_perfil", { nombre });
}

export function listarProyectos(perfilSlug: string): Promise<Proyecto[]> {
  return invoke<Proyecto[]>("listar_proyectos", { perfilSlug });
}

export function crearProyecto(
  perfilSlug: string,
  nombre: string,
): Promise<Proyecto> {
  return invoke<Proyecto>("crear_proyecto", { perfilSlug, nombre });
}

export function eliminarProyecto(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<void> {
  return invoke<void>("eliminar_proyecto", { perfilSlug, proyectoSlug });
}

export function listarArchivos(
  perfilSlug: string,
  proyectoSlug: string,
): Promise<EntradaArbol[]> {
  return invoke<EntradaArbol[]>("listar_archivos", {
    perfilSlug,
    proyectoSlug,
  });
}

export function leerArchivo(
  perfilSlug: string,
  proyectoSlug: string,
  rutaRelativa: string,
): Promise<string> {
  return invoke<string>("leer_archivo", {
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
  return invoke<void>("escribir_archivo", {
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
  return invoke<void>("crear_archivo", {
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
  return invoke<void>("crear_carpeta", {
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
  return invoke<void>("eliminar_entrada", {
    perfilSlug,
    proyectoSlug,
    rutaRelativa,
  });
}