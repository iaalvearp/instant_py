import { create } from "zustand";

interface AppStore {
  perfilActivo: string | null;
  proyectoActivo: string | null;
  archivoActivo: string | null;
  estaEjecutando: boolean;
  establecePerfilActivo: (perfil: string | null) => void;
  estableceProyectoActivo: (proyecto: string | null) => void;
  estableceArchivoActivo: (archivo: string | null) => void;
  estableceEjecutando: (ejecutando: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  perfilActivo: null,
  proyectoActivo: null,
  archivoActivo: null,
  estaEjecutando: false,
  establecePerfilActivo: (perfil) => set({ perfilActivo: perfil }),
  estableceProyectoActivo: (proyecto) => set({ proyectoActivo: proyecto }),
  estableceArchivoActivo: (archivo) => set({ archivoActivo: archivo }),
  estableceEjecutando: (ejecutando) => set({ estaEjecutando: ejecutando }),
}));