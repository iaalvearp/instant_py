// Pantalla principal de trabajo: árbol de archivos, editor Monaco y panel
// de resultados. Todo archivo vive en disco: se carga al abrirlo y se guarda
// de forma automática 500 ms después de la última pulsación.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  Package,
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
import IndicadorEjecucion from "../componentes/IndicadorEjecucion";
import IndicadorInstalacion from "../componentes/IndicadorInstalacion";
import Interruptor from "../componentes/Interruptor";
import PanelPaquetes from "../componentes/PanelPaquetes";
import PanelSalida from "../componentes/PanelSalida";
import { useAppStore } from "../estado/appStore";
import { useCodigoStore } from "../estado/codigoStore";
import { usarEjecucion } from "../estado/usarEjecucion";
import {
  escribirArchivo,
  leerArchivo,
  leerRequirements,
  listarPaquetesInstalados,
  sincronizarRequirements,
} from "../puente/tauriBridge";
import { nombreBaseDeRequisito } from "../utilidades/paquetes";

const TIEMPO_AUTOGUARDADO_MS = 500;

export default function Editor() {
  // TODO: quitar después del diagnóstico
  console.log("[PANTALLA] Editor render");

  const { codigo, salida, estableceCodigo } = useCodigoStore();
  const {
    perfilActivo,
    proyectoActivo,
    proyectoActivoNombre,
    archivoActivo,
    estaEjecutando,
    estableceArchivoActivo,
    establecePantallaActual,
  } = useAppStore();
  const {
    automatica,
    indicador,
    alternarAutomatica,
    armarParaEdicion,
    ejecutarManualmente,
    detener,
    reiniciarUltimaEjecucion,
  } = usarEjecucion();
  const [arbolAbierto, setArbolAbierto] = useState(true);
  const [linea, setLinea] = useState(1);
  const [columna, setColumna] = useState(1);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>(null);
  const [paquetesAbierto, setPaquetesAbierto] = useState(false);
  // Número de paquetes que faltan por instalar del requirements.txt (0 = sin aviso).
  const [sincronizacionPaquetes, setSincronizacionPaquetes] = useState(0);

  // TODO: quitar después del diagnóstico
  useEffect(() => {
    console.log("[PANTALLA] Editor montado");
    return () => console.log("[PANTALLA] Editor desmontado");
  }, []);

  // Refs con el valor vivo para poder guardar desde fuera del render.
  const codigoRef = useRef(codigo);
  const archivoRef = useRef(archivoActivo);
  const contenidoGuardadoRef = useRef(codigo);
  // Contenido con el que se cargó el archivo actual: los cambios programáticos
  // de Monaco (abrir archivo) no deben programar la auto-ejecución.
  const codigoCargadoRef = useRef<string | null>(null);
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
        codigoCargadoRef.current = contenido;
        estableceArchivoActivo(ruta);
        estableceCodigo(contenido);
        reiniciarUltimaEjecucion();
        setEstadoGuardado(null);
      } catch {
        setEstadoGuardado("error");
      }
    },
    [
      perfilActivo,
      proyectoActivo,
      estableceArchivoActivo,
      estableceCodigo,
      reiniciarUltimaEjecucion,
    ],
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

  // Al abrir un proyecto se instalan automáticamente los paquetes del
  // requirements.txt que falten en el entorno virtual compartido.
  useEffect(() => {
    if (!perfilActivo || !proyectoActivo) return;
    let cancelado = false;
    void (async () => {
      try {
        const [instalados, requisitos] = await Promise.all([
          listarPaquetesInstalados(),
          leerRequirements(perfilActivo, proyectoActivo),
        ]);
        const presentes = new Set(
          instalados.map((p) => p.nombre.toLowerCase()),
        );
        const faltan = requisitos.filter(
          (r) => !presentes.has(nombreBaseDeRequisito(r).toLowerCase()),
        );
        if (cancelado) return;
        if (faltan.length > 0) {
          setSincronizacionPaquetes(faltan.length);
          await sincronizarRequirements(perfilActivo, proyectoActivo);
        }
      } catch {
        // Sin entorno virtual o sin requisitos: se ignora en silencio.
      } finally {
        if (!cancelado) setSincronizacionPaquetes(0);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [perfilActivo, proyectoActivo]);

  // Cambio real en el editor: se guarda en el store y se programa la
  // auto-ejecución si no es la carga programática de un archivo.
  function alCambiarCodigo(nuevo: string) {
    estableceCodigo(nuevo);
    if (codigoCargadoRef.current !== null && nuevo === codigoCargadoRef.current) {
      return;
    }
    armarParaEdicion(nuevo);
  }

  function alEntradaEliminada(ruta: string) {
    if (ruta === archivoRef.current) {
      codigoCargadoRef.current = null;
      estableceArchivoActivo(null);
      estableceCodigo("");
      reiniciarUltimaEjecucion();
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
            <span
              className="h-4 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800"
              aria-hidden="true"
            />
            <IndicadorEjecucion indicador={indicador} />
            <Interruptor
              activo={automatica}
              etiqueta="Ejecución automática"
              onCambio={alternarAutomatica}
            />
          </>
        }
        derecha={
          <>
            <Boton
              variante="fantasma"
              onClick={() => setPaquetesAbierto(true)}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Paquetes
            </Boton>
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
              onClick={() => (estaEjecutando ? detener() : ejecutarManualmente(codigo))}
            >
              {estaEjecutando ? (
                <Square className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {estaEjecutando ? "Detener" : "Ejecutar"}
            </Boton>
          </>
        }
      />

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
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
            onCambio={alCambiarCodigo}
            alCambiarCursor={(nuevaLinea, nuevaColumna) => {
              setLinea(nuevaLinea);
              setColumna(nuevaColumna);
            }}
          />
        </section>

        <div className="w-72 min-w-72 border-l border-zinc-200 bg-white/40 dark:border-zinc-800 dark:bg-zinc-950/30 lg:w-80">
          <PanelSalida salida={salida} />
        </div>

        <PanelPaquetes
          abierto={paquetesAbierto}
          perfilSlug={perfilActivo}
          proyectoSlug={proyectoActivo}
          onCerrar={() => setPaquetesAbierto(false)}
        />
      </main>

      <BarraEstado
        archivoActivo={archivoActivo}
        estadoGuardado={estadoGuardado}
        linea={linea}
        columna={columna}
        estaEjecutando={estaEjecutando}
      />

      <IndicadorInstalacion paquetes={sincronizacionPaquetes} />
    </div>
  );
}