// Pantalla principal de trabajo: árbol de archivos, editor Monaco y panel
// de resultados. Todo archivo vive en disco: se carga al abrirlo y se guarda
// de forma automática 500 ms después de la última pulsación.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  PanelLeftOpen,
  Play,
  Settings,
  Square,
} from "lucide-react";
import ArbolArchivos from "../componentes/ArbolArchivos";
import BarraEstado, { type EstadoGuardado } from "../componentes/BarraEstado";
import BarraTareas from "../componentes/BarraTareas";
import Boton from "../componentes/Boton";
import EditorPython from "../componentes/EditorPython";
import PanelSalida from "../componentes/PanelSalida";
import { useAppStore } from "../estado/appStore";
import { useCodigoStore } from "../estado/codigoStore";
import { ejecutarPython, leerArchivo, escribirArchivo } from "../puente/tauriBridge";

const TIEMPO_AUTOGUARDADO_MS = 500;

export default function Editor() {
  const { codigo, salida, estableceCodigo, estableceSalida } = useCodigoStore();
  const {
    perfilActivo,
    proyectoActivo,
    proyectoActivoNombre,
    archivoActivo,
    estaEjecutando,
    estableceArchivoActivo,
    estableceEjecutando,
    establecePantallaActual,
  } = useAppStore();
  const [arbolAbierto, setArbolAbierto] = useState(true);
  const [linea, setLinea] = useState(1);
  const [columna, setColumna] = useState(1);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>(null);

  // Refs con el valor vivo para poder guardar desde fuera del render.
  const codigoRef = useRef(codigo);
  const archivoRef = useRef(archivoActivo);
  const contenidoGuardadoRef = useRef(codigo);
  codigoRef.current = codigo;
  archivoRef.current = archivoActivo;

  const guardarEnDisco = useCallback(
    async (contenido: string) => {
      if (!perfilActivo || !proyectoActivo || !archivoRef.current) return;
      const ruta = archivoRef.current;
      try {
        await escribirArchivo(perfilActivo, proyectoActivo, ruta, contenido);
        contenidoGuardadoRef.current = contenido;
        setEstadoGuardado((previo) => (previo === "error" ? previo : "guardado"));
        window.setTimeout(() => {
          setEstadoGuardado((previo) => (previo === "guardado" ? null : previo));
        }, 1800);
      } catch {
        setEstadoGuardado("error");
      }
    },
    [perfilActivo, proyectoActivo],
  );

  const cargarArchivo = useCallback(
    async (ruta: string) => {
      if (!perfilActivo || !proyectoActivo) return;
      try {
        const contenido = await leerArchivo(perfilActivo, proyectoActivo, ruta);
        contenidoGuardadoRef.current = contenido;
        estableceArchivoActivo(ruta);
        estableceCodigo(contenido);
        setEstadoGuardado(null);
      } catch {
        setEstadoGuardado("error");
      }
    },
    [perfilActivo, proyectoActivo, estableceArchivoActivo, estableceCodigo],
  );

  // Al abrir un archivo guardamos primero el archivo actual si hay cambios.
  const abrirArchivo = useCallback(
    async (ruta: string) => {
      if (ruta === archivoRef.current) return;
      if (
        archivoRef.current &&
        codigoRef.current !== contenidoGuardadoRef.current
      ) {
        await guardarEnDisco(codigoRef.current);
      }
      await cargarArchivo(ruta);
    },
    [cargarArchivo, guardarEnDisco],
  );

  // Carga el archivo activo al montar la pantalla.
  useEffect(() => {
    if (archivoActivo) void cargarArchivo(archivoActivo);
    // Solo al montar: cargarArchivo ya gestiona el archivo activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoguardado diferido (500 ms) tras la última pulsación.
  useEffect(() => {
    if (codigo === contenidoGuardadoRef.current) return;
    setEstadoGuardado("guardando");
    const temporizador = window.setTimeout(() => {
      void guardarEnDisco(codigo);
    }, TIEMPO_AUTOGUARDADO_MS);
    return () => window.clearTimeout(temporizador);
  }, [codigo, guardarEnDisco]);

  // Al salir del editor, guarda los cambios pendientes.
  useEffect(() => {
    return () => {
      if (
        archivoRef.current &&
        codigoRef.current !== contenidoGuardadoRef.current
      ) {
        void escribirArchivo(
          perfilActivo ?? "",
          proyectoActivo ?? "",
          archivoRef.current,
          codigoRef.current,
        ).catch(() => {});
      }
    };
  }, [perfilActivo, proyectoActivo]);

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

  function alEntradaEliminada(ruta: string) {
    if (ruta === archivoRef.current) {
      estableceArchivoActivo(null);
      estableceCodigo("");
      contenidoGuardadoRef.current = "";
      setEstadoGuardado(null);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <BarraTareas
        izquierda={
          <>
            <FolderOpen className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <span className="truncate font-medium">
              {proyectoActivoNombre ?? "Proyecto"}
            </span>
          </>
        }
        derecha={
          <>
            <Boton
              variante="fantasma"
              onClick={() => establecePantallaActual("proyectos")}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a proyectos
            </Boton>
            <Boton
              variante="fantasma"
              onClick={() => establecePantallaActual("ajustes")}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Ajustes
            </Boton>
            <Boton
              variante="primaria"
              onClick={ejecutar}
              disabled={estaEjecutando}
            >
              {estaEjecutando ? (
                <Square className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {estaEjecutando ? "Ejecutando…" : "Ejecutar"}
            </Boton>
          </>
        }
      />

      <main className="flex min-h-0 flex-1">
        {arbolAbierto ? (
          <ArbolArchivos
            onAlterna={() => setArbolAbierto(false)}
            onAbrirArchivo={(ruta) => void abrirArchivo(ruta)}
            onEntradaEliminada={alEntradaEliminada}
            archivoActivo={archivoActivo}
          />
        ) : (
          <button
            type="button"
            onClick={() => setArbolAbierto(true)}
            aria-label="Mostrar árbol de archivos"
            title="Mostrar árbol de archivos"
            className="flex w-8 items-center justify-center border-r border-zinc-200 text-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <section className="min-w-0 flex-1" aria-label="Editor de código">
          <EditorPython
            codigo={codigo}
            onCambio={estableceCodigo}
            alCambiarCursor={(nuevaLinea, nuevaColumna) => {
              setLinea(nuevaLinea);
              setColumna(nuevaColumna);
            }}
          />
        </section>

        <div className="w-72 min-w-72 border-l border-zinc-200 bg-white/40 dark:border-zinc-800 dark:bg-zinc-950/30 lg:w-80">
          <PanelSalida salida={salida} />
        </div>
      </main>

      <BarraEstado
        archivoActivo={archivoActivo}
        estadoGuardado={estadoGuardado}
        linea={linea}
        columna={columna}
        estaEjecutando={estaEjecutando}
      />
    </div>
  );
}