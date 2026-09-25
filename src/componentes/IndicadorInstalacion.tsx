// Aviso flotante que aparece mientras se instalan automáticamente los
// paquetes del requirements.txt al abrir un proyecto.
import { RefreshCw } from "lucide-react";

interface IndicadorInstalacionProps {
  paquetes: number;
}

export default function IndicadorInstalacion({ paquetes }: IndicadorInstalacionProps) {
  if (paquetes <= 0) return null;
  const texto =
    paquetes === 1
      ? "Instalando 1 paquete del proyecto…"
      : `Instalando ${paquetes} paquetes del proyecto…`;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-14 z-40 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" aria-hidden="true" />
      {texto}
    </div>
  );
}