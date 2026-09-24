import { create } from "zustand";

export type Pantalla = "inicio" | "proyectos" | "editor" | "ajustes";

interface AppStore {
  pantallaActual: Pantalla;
  perfilActivo: string | null;
  perfilActivoNombre: string | null;
  proyectoActivo: string | null;
  proyectoActivoNombre: string | null;
  archivoActivo: string | null;
  estaEjecutando: boolean;
  establecePantallaActual: (pantalla: Pantalla) => void;
  establecePerfilActivo: (perfil: string | null) => void;
  establecePerfilActivoNombre: (nombre: string | null) => void;
  estableceProyectoActivo: (proyecto: string | null) => void;
  estableceProyectoActivoNombre: (nombre: string | null) => void;
  estableceArchivoActivo: (archivo: string | null) => void;
  estableceEjecutando: (ejecutando: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  pantallaActual: "inicio",
  perfilActivo: null,
  perfilActivoNombre: null,
  proyectoActivo: null,
  proyectoActivoNombre: null,
  archivoActivo: null,
  estaEjecutando: false,
  establecePantallaActual: (pantalla) => set({ pantallaActual: pantalla }),
  establecePerfilActivo: (perfil) => set({ perfilActivo: perfil }),
  establecePerfilActivoNombre: (nombre) => set({ perfilActivoNombre: nombre }),
  estableceProyectoActivo: (proyecto) => set({ proyectoActivo: proyecto }),
  estableceProyectoActivoNombre: (nombre) =>
    set({ proyectoActivoNombre: nombre }),
  estableceArchivoActivo: (archivo) => set({ archivoActivo: archivo }),
  estableceEjecutando: (ejecutando) => set({ estaEjecutando: ejecutando }),
}));