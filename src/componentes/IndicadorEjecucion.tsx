// Punto de estado de la ejecución que acompaña al interruptor de
// ejecución automática.
import clsx from "clsx";
import type { IndicadorEjecucion } from "../estado/ejecucionStore";

const clases: Record<IndicadorEjecucion, string> = {
  inactivo: "bg-zinc-300 dark:bg-zinc-600",
  corriendo: "animate-pulse bg-amber-500",
  exito: "bg-emerald-500",
  error: "bg-red-500",
};

const etiquetas: Record<IndicadorEjecucion, string> = {
  inactivo: "Sin ejecución",
  corriendo: "Ejecutando",
  exito: "Ejecución correcta",
  error: "Error en la ejecución",
};

interface IndicadorEjecucionProps {
  indicador: IndicadorEjecucion;
}

export default function IndicadorEjecucion({
  indicador,
}: IndicadorEjecucionProps) {
  return (
    <span
      role="status"
      aria-label={etiquetas[indicador]}
      title={etiquetas[indicador]}
      className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", clases[indicador])}
    />
  );
}