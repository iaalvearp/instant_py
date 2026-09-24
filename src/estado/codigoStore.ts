import { create } from "zustand";

interface CodigoStore {
  codigo: string;
  salida: string;
  estableceCodigo: (codigo: string) => void;
  estableceSalida: (salida: string) => void;
  agregaSalida: (texto: string) => void;
}

export const useCodigoStore = create<CodigoStore>((set) => ({
  codigo: `print("Hola desde instant_py")`,
  salida: "",
  estableceCodigo: (codigo) => set({ codigo }),
  estableceSalida: (salida) => set({ salida }),
  agregaSalida: (texto) => set((estado) => ({ salida: estado.salida + texto })),
}));