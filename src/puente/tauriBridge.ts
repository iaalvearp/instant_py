// Puente entre la interfaz (src/) y el backend de Tauri (src-tauri/).
// Toda comunicación con Rust pasa por aquí usando invoke().
// Los comandos listados son placeholders; se implementarán en pasos futuros.

import { invoke } from "@tauri-apps/api/core";

export async function ejecutarPython(codigo: string): Promise<string> {
  return invoke<string>("ejecutar_python", { codigo });
}

export function comprobarPythonInstalado(): Promise<string> {
  return invoke<string>("comprobar_python_instalado");
}

export function listarProyectos(): Promise<string[]> {
  return invoke<string[]>("listar_proyectos");
}

export function abrirProyecto(rutaProyecto: string): Promise<string> {
  return invoke<string>("abrir_proyecto", { rutaProyecto });
}

export function guardarProyecto(proyecto: unknown): Promise<string> {
  return invoke<string>("guardar_proyecto", { proyecto });
}

export function instalarPaquetes(requisitos: string[]): Promise<string> {
  return invoke<string>("instalar_paquetes", { requisitos });
}