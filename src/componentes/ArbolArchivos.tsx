// Árbol de archivos del proyecto activo. Se carga del disco con
// listar_archivos y permite abrir, crear y eliminar entradas.
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  File,
  FileCode2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import Dialogo from "./Dialogo";
import MenuAcciones from "./MenuAcciones";
import { useAppStore } from "../estado/appStore";
import {
  crearArchivo,
  crearCarpeta,
  eliminarEntrada,
  listarArchivos,
} from "../puente/tauriBridge";
import type { EntradaArbol } from "../tipos/modelos";

interface ArbolArchivosProps {
  onAlterna: () => void;
  onAbrirArchivo: (ruta: string) => void;
  onEntradaEliminada?: (ruta: string) => void;
  archivoActivo: string | null;
}

interface FilaProps {
  entrada: EntradaArbol;
  profundidad: number;
  colapsadas: ReadonlySet<string>;
  archivoActivo: string | null;
  onAlternaCarpeta: (ruta: string) => void;
  onAbrirArchivo: (ruta: string) => void;
  onEliminar: (entrada: EntradaArbol) => void;
}

function IconoDe(entrada: EntradaArbol, esCarpetaAbierta: boolean) {
  if (!entrada.esCarpeta) {
    if (entrada.nombre.endsWith(".py")) return FileCode2;
    if (entrada.nombre.endsWith(".txt") || entrada.nombre === "requirements.txt") {
      return FileText;
    }
    return File;
  }
  return esCarpetaAbierta ? FolderOpen : Folder;
}

function Fila({
  entrada,
  profundidad,
  colapsadas,
  archivoActivo,
  onAlternaCarpeta,
  onAbrirArchivo,
  onEliminar,
}: FilaProps) {
  const colapsada = colapsadas.has(entrada.ruta);
  const Icono = IconoDe(entrada, !colapsada);
  const activa = !entrada.esCarpeta && archivoActivo === entrada.ruta;

  return (
    <li>
      <div
        className={clsx(
          "group flex items-center gap-1 rounded-md py-1 pr-1 font-mono text-[13px]",
          activa
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800",
        )}
        style={{ paddingLeft: `${8 + profundidad * 14}px` }}
        role={entrada.esCarpeta ? "treeitem" : "button"}
        aria-expanded={entrada.esCarpeta ? !colapsada : undefined}
        onClick={() => {
          if (entrada.esCarpeta) {
            onAlternaCarpeta(entrada.ruta);
          } else {
            onAbrirArchivo(entrada.ruta);
          }
        }}
      >
        {entrada.esCarpeta ? (
          <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
            {colapsada ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" aria-hidden="true" />
        )}

        <Icono
          className={clsx(
            "h-4 w-4 shrink-0",
            entrada.esCarpeta
              ? "text-amber-500/80 dark:text-amber-400/80"
              : "text-zinc-400 dark:text-zinc-500",
          )}
          aria-hidden="true"
        />
        <span className="truncate">{entrada.nombre}</span>

        <span className="ml-auto shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <MenuAcciones
            ariaLabel={`Opciones de ${entrada.nombre}`}
            opciones={[
              {
                etiqueta: "Eliminar",
                icono: Trash2,
                destructivo: true,
                onClick: () => onEliminar(entrada),
              },
            ]}
          />
        </span>
      </div>

      {entrada.esCarpeta && !colapsada && entrada.hijos.length > 0 ? (
        <ul>
          {entrada.hijos.map((hijo) => (
            <Fila
              key={hijo.ruta}
              entrada={hijo}
              profundidad={profundidad + 1}
              colapsadas={colapsadas}
              archivoActivo={archivoActivo}
              onAlternaCarpeta={onAlternaCarpeta}
              onAbrirArchivo={onAbrirArchivo}
              onEliminar={onEliminar}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function ArbolArchivos({
  onAlterna,
  onAbrirArchivo,
  onEntradaEliminada,
  archivoActivo,
}: ArbolArchivosProps) {
  const perfilActivo = useAppStore((s) => s.perfilActivo);
  const proyectoActivo = useAppStore((s) => s.proyectoActivo);

  const [entradas, setEntradas] = useState<EntradaArbol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<ReadonlySet<string>>(new Set());
  const [dialogoCrear, setDialogoCrear] = useState<"archivo" | "carpeta" | null>(
    null,
  );
  const [entradaAEliminar, setEntradaAEliminar] =
    useState<EntradaArbol | null>(null);

  const refrescar = useCallback(async () => {
    if (!perfilActivo || !proyectoActivo) return;
    setCargando(true);
    setError(null);
    try {
      setEntradas(await listarArchivos(perfilActivo, proyectoActivo));
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }, [perfilActivo, proyectoActivo]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  function alternaCarpeta(ruta: string) {
    setColapsadas((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(ruta)) {
        siguiente.delete(ruta);
      } else {
        siguiente.add(ruta);
      }
      return siguiente;
    });
  }

  async function creaEntrada(nombre: string) {
    if (!perfilActivo || !proyectoActivo || !dialogoCrear) return;
    const ruta = nombre.trim();
    if (dialogoCrear === "archivo") {
      await crearArchivo(perfilActivo, proyectoActivo, ruta);
      await refrescar();
      onAbrirArchivo(ruta);
    } else {
      await crearCarpeta(perfilActivo, proyectoActivo, ruta);
      await refrescar();
    }
    setDialogoCrear(null);
  }

  async function confirmaEliminar() {
    if (!perfilActivo || !proyectoActivo || !entradaAEliminar) return;
    await eliminarEntrada(
      perfilActivo,
      proyectoActivo,
      entradaAEliminar.ruta,
    );
    onEntradaEliminada?.(entradaAEliminar.ruta);
    setEntradaAEliminar(null);
    await refrescar();
  }

  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40"
      aria-label="Árbol de archivos"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          <Folder className="h-3.5 w-3.5" aria-hidden="true" />
          Proyecto
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setDialogoCrear("archivo")}
            aria-label="Crear archivo"
            title="Crear archivo"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDialogoCrear("carpeta")}
            aria-label="Crear carpeta"
            title="Crear carpeta"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onAlterna}
            aria-label="Ocultar árbol de archivos"
            title="Ocultar árbol de archivos"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-auto p-2">
        {cargando ? (
          <p className="px-2 py-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            Cargando…
          </p>
        ) : error ? (
          <p className="px-2 py-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : entradas.length === 0 ? (
          <p className="px-2 py-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            Sin archivos
          </p>
        ) : (
          <ul role="tree">
            {entradas.map((entrada) => (
              <Fila
                key={entrada.ruta}
                entrada={entrada}
                profundidad={0}
                colapsadas={colapsadas}
                archivoActivo={archivoActivo}
                onAlternaCarpeta={alternaCarpeta}
                onAbrirArchivo={onAbrirArchivo}
                onEliminar={setEntradaAEliminar}
              />
            ))}
          </ul>
        )}
      </nav>

      <Dialogo
        abierto={dialogoCrear !== null}
        titulo={dialogoCrear === "carpeta" ? "Nueva carpeta" : "Nuevo archivo"}
        campoLabel={dialogoCrear === "carpeta" ? "Nombre de la carpeta" : "Nombre del archivo"}
        campoPlaceholder={
          dialogoCrear === "carpeta"
            ? "P. ej. imagenes"
            : 'P. ej. utils.py o modulo/ayuda.py'
        }
        textoAceptar="Crear"
        onSubmit={creaEntrada}
        onCerrar={() => setDialogoCrear(null)}
      />

      <Dialogo
        abierto={entradaAEliminar !== null}
        titulo="Eliminar"
        mensaje={`¿Seguro que quieres eliminar "${entradaAEliminar?.nombre}"? Se moverá a la papelera del sistema.`}
        textoAceptar="Eliminar"
        destructivo
        onSubmit={confirmaEliminar}
        onCerrar={() => setEntradaAEliminar(null)}
      />
    </aside>
  );
}