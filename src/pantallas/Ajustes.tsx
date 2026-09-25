// Pantalla de ajustes. Placeholder: llegará con la configuración real.
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import BarraTareas from "../componentes/BarraTareas";
import Boton from "../componentes/Boton";
import { useAppStore } from "../estado/appStore";
import { log } from "../utilidades/diagnostico";

export default function Ajustes() {
  // TODO: quitar después del diagnóstico
  log("[PANTALLA] Ajustes render");

  const {
    perfilActivo,
    proyectoActivo,
    establecePantallaActual,
  } = useAppStore();

  // TODO: quitar después del diagnóstico
  useEffect(() => {
    log("[PANTALLA] Ajustes montado");
    return () => log("[PANTALLA] Ajustes desmontado");
  }, []);

  function volver() {
    if (proyectoActivo) {
      establecePantallaActual("editor");
    } else if (perfilActivo) {
      establecePantallaActual("proyectos");
    } else {
      establecePantallaActual("inicio");
    }
  }

  return (
    // TODO: quitar bordes de debug
    <div
      className="flex h-screen flex-col"
      style={{ outline: "2px dashed lime", minHeight: "200px" }}
    >
      <BarraTareas
        izquierda={<h1 className="text-base font-semibold">Ajustes</h1>}
        derecha={
          <Boton variante="fantasma" onClick={volver}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Boton>
        }
      />
      <main className="flex min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-zinc-500 dark:text-zinc-400">
          La configuración de la aplicación aparecerá aquí.
        </p>
      </main>
    </div>
  );
}