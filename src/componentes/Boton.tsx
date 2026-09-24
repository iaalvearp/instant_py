// Botón reutilizable con variantes para todas las pantallas.
import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export type VarianteBoton = "primaria" | "secundaria" | "fantasma";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
}

const estilos: Record<VarianteBoton, string> = {
  primaria:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-emerald-600",
  secundaria:
    "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 focus-visible:outline-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800",
  fantasma:
    "text-zinc-600 hover:bg-zinc-100 focus-visible:outline-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800",
};

export default function Boton({
  variante = "primaria",
  className,
  children,
  ...rest
}: BotonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        estilos[variante],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}