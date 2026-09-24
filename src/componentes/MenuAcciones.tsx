// Menú desplegable de acciones por entrada (botón "···").
// Se cierra al hacer clic fuera o pulsar Escape.
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import clsx from "clsx";

export interface OpcionMenu {
  etiqueta: string;
  icono?: LucideIcon;
  destructivo?: boolean;
  onClick: () => void;
}

interface MenuAccionesProps {
  opciones: OpcionMenu[];
  ariaLabel: string;
}

export default function MenuAcciones({ opciones, ariaLabel }: MenuAccionesProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(evento) => {
          evento.stopPropagation();
          setAbierto((previo) => !previo);
        }}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 z-40 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {opciones.map((opcion) => {
            const Icono = opcion.icono;
            return (
              <button
                key={opcion.etiqueta}
                type="button"
                role="menuitem"
                onClick={(evento) => {
                  evento.stopPropagation();
                  setAbierto(false);
                  opcion.onClick();
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  opcion.destructivo
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-700 dark:text-zinc-200",
                )}
              >
                {Icono ? <Icono className="h-4 w-4" aria-hidden="true" /> : null}
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}