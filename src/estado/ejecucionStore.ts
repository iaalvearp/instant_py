// Estado del interruptor de ejecución automática y del indicador visual.
import { create } from "zustand";

export type IndicadorEjecucion = "inactivo" | "corriendo" | "exito" | "error";

interface EjecucionStore {
  automatica: boolean;
  indicador: IndicadorEjecucion;
  estableceAutomatica: (automatica: boolean) => void;
  estableceIndicador: (indicador: IndicadorEjecucion) => void;
}

export const useEjecucionStore = create<EjecucionStore>((set) => ({
  automatica: true,
  indicador: "inactivo",
  estableceAutomatica: (automatica) => set({ automatica }),
  estableceIndicador: (indicador) => set({ indicador }),
}));