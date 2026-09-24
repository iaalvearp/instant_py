// Barra de estado inferior del editor: archivo activo, estado de guardado,
// posición del cursor y estado de la ejecución.
import clsx from "clsx";

export type EstadoGuardado = "guardando" | "guardado" | "error" | null;

interface BarraEstadoProps {
  archivoActivo: string | null;
  estadoGuardado: EstadoGuardado;
  linea: number;
  columna: number;
  estaEjecutando: boolean;
}

export default function BarraEstado({
  archivoActivo,
  estadoGuardado,
  linea,
  columna,
  estaEjecutando,
}: BarraEstadoProps) {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-zinc-200 bg-white/80 px-4 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
      <span className="truncate font-mono">
        {archivoActivo ?? "Sin archivo abierto"}
      </span>
      <div className="flex shrink-0 items-center gap-4">
        <span
          className={clsx(
            "flex items-center gap-1.5",
            estadoGuardado === "error" && "text-red-600 dark:text-red-400",
            estadoGuardado === "guardado" &&
              "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {estadoGuardado === "guardando" ? (
            <>
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"
                aria-hidden="true"
              />
              Guardando…
            </>
          ) : estadoGuardado === "guardado" ? (
            <>
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              Guardado
            </>
          ) : estadoGuardado === "error" ? (
            "Error al guardar"
          ) : null}
        </span>
        <span>
          Línea {linea}, Columna {columna}
        </span>
        <span
          className={clsx(
            "flex items-center gap-1.5",
            estaEjecutando && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          <span
            className={clsx(
              "h-1.5 w-1.5 rounded-full",
              estaEjecutando
                ? "animate-pulse bg-emerald-500"
                : "bg-zinc-300 dark:bg-zinc-700",
            )}
            aria-hidden="true"
          />
          {estaEjecutando ? "Ejecutando…" : "En espera"}
        </span>
      </div>
    </footer>
  );
}