// Barra superior reutilizable: contenido a la izquierda y acciones a la derecha.
import { ReactNode } from "react";

interface BarraTareasProps {
  izquierda: ReactNode;
  derecha?: ReactNode;
}

export default function BarraTareas({ izquierda, derecha }: BarraTareasProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex min-w-0 items-center gap-3">{izquierda}</div>
      {derecha ? (
        <div className="flex shrink-0 items-center gap-2">{derecha}</div>
      ) : null}
    </header>
  );
}