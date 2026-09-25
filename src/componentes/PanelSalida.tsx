// Panel que muestra la salida (stdout/stderr) de la última ejecución. Las
// líneas de auto-log de expresiones y los errores de sintaxis se distinguen
// visualmente del print normal.
import { parsearSalida, type EstiloSalida } from "../utilidades/salidaPython";

interface PanelSalidaProps {
  salida: string;
}

const estilosLinea: Record<EstiloSalida, string> = {
  normal: "",
  autolog: "italic text-zinc-500 dark:text-zinc-600",
  sintaxis: "font-medium text-amber-700 dark:text-amber-400",
};

export default function PanelSalida({ salida }: PanelSalidaProps) {
  const lineas = parsearSalida(salida);
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Panel de resultados">
      <div className="border-b border-zinc-200 px-4 py-2 text-xs font-medium tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
        Salida
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">
        {salida.trim() === "" ? (
          "La salida aparecerá aquí al ejecutar tu código."
        ) : (
          lineas.map((linea, indice) => (
            <span key={indice} className={estilosLinea[linea.estilo]}>
              {linea.texto}
              {"\n"}
            </span>
          ))
        )}
      </pre>
    </section>
  );
}