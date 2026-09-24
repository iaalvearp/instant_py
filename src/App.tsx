import Editor from "@monaco-editor/react";
import { Play, Square } from "lucide-react";
import clsx from "clsx";
import "./monaco";
import { useCodigoStore } from "./estado/codigoStore";
import { useAppStore } from "./estado/appStore";
import { ejecutarPython } from "./puente/tauriBridge";

function App() {
  const { codigo, salida, estableceCodigo, estableceSalida } = useCodigoStore();
  const { estaEjecutando, estableceEjecutando } = useAppStore();

  async function ejecutar() {
    estableceSalida("");
    estableceEjecutando(true);
    try {
      const resultado = await ejecutarPython(codigo);
      estableceSalida(resultado);
    } catch (error) {
      estableceSalida(String(error));
    } finally {
      estableceEjecutando(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full bg-emerald-400"
            aria-hidden="true"
          />
          <h1 className="text-sm font-semibold tracking-tight">instant_py</h1>
        </div>
        <button
          onClick={ejecutar}
          disabled={estaEjecutando}
          className={clsx(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
            estaEjecutando
              ? "bg-zinc-800 text-zinc-400"
              : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
          )}
        >
          {estaEjecutando ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {estaEjecutando ? "Ejecutando…" : "Ejecutar"}
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="min-h-0" aria-label="Editor de código">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={codigo}
            onChange={(valor) => estableceCodigo(valor ?? "")}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </section>

        <section className="flex min-h-0 flex-col border-t border-zinc-800 lg:border-l lg:border-t-0">
          <div className="border-b border-zinc-800 px-4 py-2 text-xs font-medium tracking-wider text-zinc-400 uppercase">
            Salida
          </div>
          <pre className="flex-1 overflow-auto p-4 font-mono text-sm text-zinc-200 whitespace-pre-wrap">
            {salida || "La salida aparecerá aquí al ejecutar tu código."}
          </pre>
        </section>
      </main>
    </div>
  );
}

export default App;