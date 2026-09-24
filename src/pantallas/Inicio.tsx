// Pantalla de inicio: selección de perfil para entrar a sus proyectos.
// Los perfiles viven en disco y se cargan con listar_perfiles.
import { useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import Boton from "../componentes/Boton";
import Dialogo from "../componentes/Dialogo";
import { useAppStore } from "../estado/appStore";
import { crearPerfil, listarPerfiles } from "../puente/tauriBridge";
import type { Perfil } from "../tipos/modelos";
import { iniciales } from "../utilidades/formato";

export default function Inicio() {
  const establecePerfilActivo = useAppStore((s) => s.establecePerfilActivo);
  const establecePerfilActivoNombre = useAppStore(
    (s) => s.establecePerfilActivoNombre,
  );
  const establecePantallaActual = useAppStore((s) => s.establecePantallaActual);

  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  async function refrescaPerfiles() {
    setCargando(true);
    setError(null);
    try {
      setPerfiles(await listarPerfiles());
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void refrescaPerfiles();
  }, []);

  async function creaPerfil(nombre: string) {
    const perfil = await crearPerfil(nombre);
    await refrescaPerfiles();
    establecePerfilActivo(perfil.slug);
    establecePerfilActivoNombre(perfil.nombre);
    establecePantallaActual("proyectos");
  }

  function seleccionaPerfil(perfil: Perfil) {
    establecePerfilActivo(perfil.slug);
    establecePerfilActivoNombre(perfil.nombre);
    establecePantallaActual("proyectos");
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">instant_py</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Aprende Python escribiendo y ejecutando código al instante.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          No se pudieron cargar los perfiles: {error}
        </p>
      ) : null}

      <div className="w-full max-w-md">
        <h2 className="mb-3 text-sm font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          ¿Quién va a aprender hoy?
        </h2>

        {cargando ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando perfiles…
          </p>
        ) : perfiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              Todavía no hay ningún perfil
            </p>
            <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
              Crea el primero para poder empezar a programar.
            </p>
            <Boton onClick={() => setDialogoAbierto(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear tu primer perfil
            </Boton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {perfiles.map((perfil) => (
              <button
                key={perfil.slug}
                type="button"
                onClick={() => seleccionaPerfil(perfil)}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/60"
              >
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 transition group-hover:bg-emerald-600/20 dark:text-emerald-400">
                  <UserRound className="h-7 w-7" aria-hidden="true" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    {iniciales(perfil.nombre)}
                  </span>
                </span>
                <span className="font-medium">{perfil.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Boton variante="secundaria" onClick={() => setDialogoAbierto(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Añadir perfil
      </Boton>

      <Dialogo
        abierto={dialogoAbierto}
        titulo="Nuevo perfil"
        campoLabel="Nombre del perfil"
        campoPlaceholder="P. ej. Papá"
        textoAceptar="Crear"
        onSubmit={creaPerfil}
        onCerrar={() => setDialogoAbierto(false)}
      />
    </main>
  );
}