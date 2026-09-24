// Editor de código (Monaco) preparado para Python, con tema según el sistema
// y subida de la posición del cursor a la pantalla.
import { useEffect, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

function useTemaOscuroDelSistema(): boolean {
  const [oscuro, setOscuro] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = (evento: MediaQueryListEvent) => setOscuro(evento.matches);
    media.addEventListener("change", alCambiar);
    return () => media.removeEventListener("change", alCambiar);
  }, []);
  return oscuro;
}

interface EditorPythonProps {
  codigo: string;
  onCambio: (codigo: string) => void;
  alCambiarCursor?: (linea: number, columna: number) => void;
}

export default function EditorPython({
  codigo,
  onCambio,
  alCambiarCursor,
}: EditorPythonProps) {
  const temaOscuro = useTemaOscuroDelSistema();

  const alMontar: OnMount = (editor) => {
    const posicion = editor.getPosition();
    if (posicion) {
      alCambiarCursor?.(posicion.lineNumber, posicion.column);
    }
    editor.onDidChangeCursorPosition((evento) => {
      alCambiarCursor?.(evento.position.lineNumber, evento.position.column);
    });
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      value={codigo}
      onChange={(valor) => onCambio(valor ?? "")}
      theme={temaOscuro ? "vs-dark" : "vs-light"}
      onMount={alMontar}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 16 },
      }}
    />
  );
}