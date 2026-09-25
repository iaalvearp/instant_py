// Enrutador por Zustand: muestra la pantalla activa con una transición suave.
import { useEffect, type ComponentType } from "react";
import Inicio from "./pantallas/Inicio";
import Proyectos from "./pantallas/Proyectos";
import Editor from "./pantallas/Editor";
import Ajustes from "./pantallas/Ajustes";
import { useAppStore, type Pantalla } from "./estado/appStore";
import "./monaco";

const pantallas: Record<Pantalla, ComponentType> = {
  inicio: Inicio,
  proyectos: Proyectos,
  editor: Editor,
  ajustes: Ajustes,
};

function App() {
  const pantallaActual = useAppStore((s) => s.pantallaActual);
  const Pantalla = pantallas[pantallaActual];

  // TODO: quitar después del diagnóstico
  console.log("[APP] render", pantallaActual);

  // TODO: quitar después del diagnóstico
  useEffect(() => {
    console.log("[APP] montado");
  }, []);

  return (
    <div
      key={pantallaActual}
      className="animar-entrada h-screen overflow-hidden bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
    >
      {/* TODO: quitar después del diagnóstico */}
      <div
        style={{
          background: "red",
          color: "white",
          padding: "20px",
          fontSize: "24px",
        }}
      >
        DEBUG: la app montó
      </div>
      <Pantalla />
    </div>
  );
}

export default App;