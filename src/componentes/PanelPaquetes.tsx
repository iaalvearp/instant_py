// Panel lateral de gestión de paquetes pip del entorno virtual compartido y
// del requirements.txt del proyecto. Se desliza sobre el panel de salida
// desde el botón "Paquetes" de la barra superior.
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Package, PackagePlus, RefreshCw, Search, Trash2, X } from "lucide-react";
import Boton from "./Boton";
import Dialogo from "./Dialogo";
import {
  desinstalarPaquete,
  escribirRequirements,
  instalarPaquete,
  leerRequirements,
  listarPaquetesInstalados,
  sincronizarRequirements,
} from "../puente/tauriBridge";
import {
  nombreBaseDeRequisito,
  validarNombrePaquete,
} from "../utilidades/paquetes";
import type { PaqueteInfo } from "../tipos/modelos";

interface PanelPaquetesProps {
  abierto: boolean;
  perfilSlug: string | null;
  proyectoSlug: string | null;
  onCerrar: () => void;
}

export default function PanelPaquetes({
  abierto,
  perfilSlug,
  proyectoSlug,
  onCerrar,
}: PanelPaquetesProps) {
  const [instalados, setInstalados] = useState<PaqueteInfo[]>([]);
  const [requisitos, setRequisitos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [instalando, setInstalando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [desinstalandose, setDesinstalandose] = useState<string | null>(null);

  const recargarTodo = useCallback(async () => {
    const [pkg, requisitosLeidos] = await Promise.all([
      listarPaquetesInstalados(),
      perfilSlug && proyectoSlug
        ? leerRequirements(perfilSlug, proyectoSlug)
        : Promise.resolve([] as string[]),
    ]);
    setInstalados(pkg);
    setRequisitos(requisitosLeidos);
  }, [perfilSlug, proyectoSlug]);

  // Al abrir el panel se cargan las dos listas.
  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    recargarTodo().catch((e) => {
      if (activo) setError(String(e));
    });
    return () => {
      activo = false;
    };
  }, [abierto, recargarTodo]);

  async function alInstalar() {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    if (!validarNombrePaquete(nombre)) {
      setError(`Nombre de paquete inválido: ${nombre}`);
      return;
    }
    setInstalando(true);
    setError(null);
    setMensaje(null);
    try {
      await instalarPaquete(nombre);
      const base = nombreBaseDeRequisito(nombre);
      const yaGuardado = requisitos.some(
        (r) => nombreBaseDeRequisito(r) === base,
      );
      const actualizados = yaGuardado ? requisitos : [...requisitos, nombre];
      if (perfilSlug && proyectoSlug) {
        await escribirRequirements(perfilSlug, proyectoSlug, actualizados);
      }
      setRequisitos(actualizados);
      setInstalados(await listarPaquetesInstalados());
      setNombreNuevo("");
      setMensaje(`${nombre} instalado`);
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalando(false);
    }
  }

  async function alConfirmarDesinstalar() {
    if (!desinstalandose) return;
    const base = nombreBaseDeRequisito(desinstalandose);
    await desinstalarPaquete(base);
    const restantes = requisitos.filter(
      (r) => nombreBaseDeRequisito(r) !== base,
    );
    if (perfilSlug && proyectoSlug) {
      await escribirRequirements(perfilSlug, proyectoSlug, restantes);
    }
    setRequisitos(restantes);
    setInstalados(await listarPaquetesInstalados());
    setMensaje(`${base} desinstalado`);
  }

  async function alSincronizar() {
    if (!perfilSlug || !proyectoSlug) return;
    setSincronizando(true);
    setError(null);
    setMensaje(null);
    try {
      await sincronizarRequirements(perfilSlug, proyectoSlug);
      await recargarTodo();
      setMensaje("Requirements sincronizado");
    } catch (e) {
      setError(String(e));
    } finally {
      setSincronizando(false);
    }
  }

  const instaladosFiltrados = instalados.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const filaPaquete = (pkg: PaqueteInfo) => (
    <li
      key={pkg.nombre}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <span className="min-w-0 flex-1 truncate text-sm">{pkg.nombre}</span>
      <span className="shrink-0 text-xs text-zinc-400">{pkg.version}</span>
      <button
        type="button"
        onClick={() => setDesinstalandose(pkg.nombre)}
        aria-label={`Desinstalar ${pkg.nombre}`}
        title="Desinstalar"
        className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <aside
      aria-label="Paquetes del proyecto"
      aria-hidden={!abierto}
      className={clsx(
        "absolute inset-y-0 right-0 z-30 flex w-80 flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-200 lg:w-96 dark:border-zinc-800 dark:bg-zinc-900",
        abierto ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          Paquetes
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar panel de paquetes"
          className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <form
          className="flex gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            void alInstalar();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Nombre del paquete a instalar</span>
            <input
              type="text"
              value={nombreNuevo}
              onChange={(evento) => {
                setNombreNuevo(evento.target.value);
                setError(null);
              }}
              placeholder="Ej. rich, numpy==1.26.0"
              disabled={instalando}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <Boton
            type="submit"
            variante="primaria"
            disabled={instalando || nombreNuevo.trim() === ""}
            aria-label="Instalar paquete"
          >
            {instalando ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            Instalar
          </Boton>
        </form>

        {error || mensaje ? (
          <p
            className={clsx(
              "mt-3 text-sm",
              error
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {error ?? mensaje}
          </p>
        ) : null}

        <section className="mt-6" aria-label="Del proyecto">
          <h3 className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Del proyecto
          </h3>
          <ul className="mt-2 space-y-1">
            {requisitos.length === 0 ? (
              <li className="text-sm text-zinc-500 dark:text-zinc-400">
                Todavía no hay paquetes en el requirements.txt.
              </li>
            ) : (
              requisitos.map((requisito) => (
                <li
                  key={requisito}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {requisito}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDesinstalandose(requisito)}
                    aria-label={`Desinstalar ${requisito}`}
                    title="Desinstalar y quitar de requirements"
                    className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3">
            <Boton
              variante="secundaria"
              onClick={() => void alSincronizar()}
              disabled={sincronizando || !perfilSlug || !proyectoSlug}
              className="w-full"
            >
              {sincronizando ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              Sincronizar requirements
            </Boton>
          </div>
        </section>

        <section className="mt-6" aria-label="Instalados">
          <h3 className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Instalados
          </h3>
          <label className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="sr-only">Buscar paquete instalado</span>
            <input
              type="text"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar instalados…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <ul className="mt-2 space-y-1">
            {instaladosFiltrados.length === 0 ? (
              <li className="text-sm text-zinc-500 dark:text-zinc-400">
                {instalados.length === 0
                  ? "El entorno virtual no tiene paquetes aún."
                  : "Ningún paquete coincide con la búsqueda."}
              </li>
            ) : (
              instaladosFiltrados.map(filaPaquete)
            )}
          </ul>
        </section>
      </div>

      <Dialogo
        abierto={desinstalandose !== null}
        titulo={`Desinstalar '${desinstalandose ?? ""}'?`}
        mensaje="Se eliminará del entorno virtual y, si está en el requirements.txt, también de ahí."
        textoAceptar="Desinstalar"
        destructivo
        onSubmit={alConfirmarDesinstalar}
        onCerrar={() => setDesinstalandose(null)}
      />
    </aside>
  );
}