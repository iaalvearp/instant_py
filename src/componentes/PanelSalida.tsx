// Panel que muestra la salida (stdout/stderr) de la ejecución. Las líneas que
// empiezan por "────" son separadores entre ejecuciones y se muestran atenuadas.
interface PanelSalidaProps {
  salida: string;
}

export default function PanelSalida({ salida }: PanelSalidaProps) {
  const lineas = salida.split("\n");
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
            <span
              key={indice}
              className={
                linea.startsWith("────")
                  ? "text-zinc-400 dark:text-zinc-600"
                  : undefined
              }
            >
              {linea}
              {"\n"}
            </span>
          ))
        )}
      </pre>
    </section>
  );
}