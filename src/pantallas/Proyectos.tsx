// Pantalla de proyectos del perfil activo. Los proyectos viven en disco y se
// cargan con listar_proyectos cada vez que se entra a esta pantalla.
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  FileCode2,
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import BarraTareas from "../componentes/BarraTareas";
import Boton from "../componentes/Boton";
import Dialogo from "../componentes/Dialogo";
import MenuAcciones from "../componentes/MenuAcciones";
import { useAppStore } from "../estado/appStore";
import {
  crearProyecto,
  eliminarProyecto,
  listarProyectos,
} from "../puente/tauriBridge";
import type { Proyecto } from "../tipos/modelos";
import { fechaRelativa } from "../utilidades/formato";
import { log } from "../utilidades/diagnostico";

export default function Proyectos() {
  // TODO: quitar después del diagnóstico
  log("[PANTALLA] Proyectos render");

  const perfilActivo = useAppStore((s) => s.perfilActivo);
  const perfilActivoNombre = useAppStore((s) => s.perfilActivoNombre);
  const estableceProyectoActivo = useAppStore((s) => s.estableceProyectoActivo);
  const estableceProyectoActivoNombre = useAppStore(
    (s) => s.estableceProyectoActivoNombre,
  );
  const estableceArchivoActivo = useAppStore((s) => s.estableceArchivoActivo);
  const establecePantallaActual = useAppStore((s) => s.establecePantallaActual);

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false);
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(
    null,
  );

  // TODO: quitar después del diagnóstico
  useEffect(() => {
    log("[PANTALLA] Proyectos montado");
    return () => log("[PANTALLA] Proyectos desmontado");
  }, []);

  const refrescaProyectos = useCallback(async () => {
    if (!perfilActivo) return;
    setCargando(true);
    setError(null);
    try {
      setProyectos(await listarProyectos(perfilActivo));
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }, [perfilActivo]);

  useEffect(() => {
    void refrescaProyectos();
  }, [refrescaProyectos]);

  async function abreProyecto(proyecto: Proyecto) {
    estableceProyectoActivo(proyecto.slug);
    estableceProyectoActivoNombre(proyecto.nombre);
    estableceArchivoActivo(proyecto.entrada);
    establecePantallaActual("editor");
  }

  async function creaProyecto(nombre: string) {
    if (!perfilActivo) return;
    const proyecto = await crearProyecto(perfilActivo, nombre);
    await refrescaProyectos();
    await abreProyecto(proyecto);
  }

  async function confirmaEliminar() {
    if (!perfilActivo || !proyectoAEliminar) return;
    await eliminarProyecto(perfilActivo, proyectoAEliminar.slug);
    setProyectoAEliminar(null);
    await refrescaProyectos();
  }

  return (
    // TODO: quitar bordes de debug
    <div
      className="flex h-screen flex-col"
      style={{ outline: "2px dashed lime", minHeight: "200px" }}
    >
      <BarraTareas
        izquierda={
          <>
            <UserRound className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <span className="truncate font-medium">
              {perfilActivoNombre ?? "Mi perfil"}
            </span>
            <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              · Proyectos
            </span>
          </>
        }
        derecha={
          <>
            <Boton
              variante="fantasma"
              onClick={() => establecePantallaActual("inicio")}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Cambiar perfil
            </Boton>
            <Boton
              variante="fantasma"
              onClick={() => establecePantallaActual("ajustes")}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Ajustes
            </Boton>
          </>
        }
      />

      <main className="min-h-0 flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Mis proyectos
              </p>
              {cargando ? (
                <h1 className="text-2xl font-semibold tracking-tight">
                  Cargando…
                </h1>
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight">
                  {proyectos.length} proyecto
                  {proyectos.length === 1 ? "" : "s"}
                </h1>
              )}
            </div>
            <Boton onClick={() => setDialogoCrearAbierto(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear nuevo proyecto
            </Boton>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              No se pudieron cargar los proyectos: {error}
            </p>
          ) : null}

          {cargando ? null : proyectos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <FolderOpen
                className="mx-auto mb-3 h-8 w-8 text-zinc-400"
                aria-hidden="true"
              />
              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                Todavía no tienes proyectos
              </p>
              <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                Crea el primero y empieza a programar.
              </p>
              <Boton onClick={() => setDialogoCrearAbierto(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear primer proyecto
              </Boton>
            </div>
          ) : (
            <ul className="grid gap-3">
              {proyectos.map((proyecto) => (
                <li
                  key={proyecto.slug}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/60"
                >
                  <button
                    type="button"
                    onClick={() => void abreProyecto(proyecto)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                      <FileCode2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {proyecto.nombre}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        <CalendarDays
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        Última modificación{" "}
                        {fechaRelativa(proyecto.modificadoEn) || "recientemente"}
                      </span>
                    </span>
                  </button>
                  <MenuAcciones
                    ariaLabel={`Opciones del proyecto ${proyecto.nombre}`}
                    opciones={[
                      {
                        etiqueta: "Eliminar",
                        icono: Trash2,
                        destructivo: true,
                        onClick: () => setProyectoAEliminar(proyecto),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialogo
        abierto={dialogoCrearAbierto}
        titulo="Nuevo proyecto"
        campoLabel="Nombre del proyecto"
        campoPlaceholder="P. ej. Mi primer programa"
        textoAceptar="Crear"
        onSubmit={creaProyecto}
        onCerrar={() => setDialogoCrearAbierto(false)}
      />

      <Dialogo
        abierto={proyectoAEliminar !== null}
        titulo="Eliminar proyecto"
        mensaje={`¿Seguro que quieres eliminar "${proyectoAEliminar?.nombre}"? Se moverá a la papelera del sistema y no podrás recuperarlo desde la app.`}
        textoAceptar="Eliminar"
        destructivo
        onSubmit={confirmaEliminar}
        onCerrar={() => setProyectoAEliminar(null)}
      />
    </div>
  );
}