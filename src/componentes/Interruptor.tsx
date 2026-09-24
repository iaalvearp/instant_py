// Interruptor accesible (role="switch") con etiqueta para preferencias binarias.
import clsx from "clsx";

interface InterruptorProps {
  activo: boolean;
  etiqueta: string;
  onCambio: (activo: boolean) => void;
}

export default function Interruptor({
  activo,
  etiqueta,
  onCambio,
}: InterruptorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={() => onCambio(!activo)}
      className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span
        aria-hidden="true"
        className={clsx(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
          activo ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600",
        )}
      >
        <span
          className={clsx(
            "inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
            activo ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
      {etiqueta}
    </button>
  );
}