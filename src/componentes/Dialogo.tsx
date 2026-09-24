// Diálogo modal simple con campo de texto opcional (crear) o solo
// confirmación (eliminar). Al enviar correctamente se cierra; si la acción
// falla, muestra el error dentro del diálogo y permanece abierto.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Boton from "./Boton";

interface DialogoProps {
  abierto: boolean;
  titulo: string;
  mensaje?: string;
  campoLabel?: string;
  campoPlaceholder?: string;
  campoValorInicial?: string;
  textoAceptar?: string;
  destructivo?: boolean;
  onSubmit: (valor: string) => Promise<void> | void;
  onCerrar: () => void;
}

export default function Dialogo({
  abierto,
  titulo,
  mensaje,
  campoLabel,
  campoPlaceholder,
  campoValorInicial = "",
  textoAceptar,
  destructivo = false,
  onSubmit,
  onCerrar,
}: DialogoProps) {
  const [valor, setValor] = useState(campoValorInicial);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setValor(campoValorInicial);
      setError(null);
      setEnviando(false);
      const raf = window.requestAnimationFrame(() => {
        entradaRef.current?.focus();
        entradaRef.current?.select();
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [abierto, campoValorInicial]);

  if (!abierto) return null;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await onSubmit(valor.trim());
      onCerrar();
    } catch (e) {
      setError(String(e));
      setEnviando(false);
    }
  }

  const etiquetaAceptar = textoAceptar ?? (campoLabel ? "Crear" : "Aceptar");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {mensaje ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{mensaje}</p>
        ) : null}

        {campoLabel ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {campoLabel}
            </span>
            <input
              ref={entradaRef}
              type="text"
              value={valor}
              onChange={(evento) => {
                setValor(evento.target.value);
                setError(null);
              }}
              placeholder={campoPlaceholder}
              disabled={enviando}
              className={clsx(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-zinc-950",
                error
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                  : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/30 dark:border-zinc-700",
              )}
            />
          </label>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Boton type="button" variante="secundaria" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            variante={destructivo ? "secundaria" : "primaria"}
            disabled={enviando || (campoLabel ? valor.trim() === "" : false)}
            className={destructivo ? "bg-red-600 text-white ring-0 hover:bg-red-500" : ""}
          >
            {etiquetaAceptar}
          </Boton>
        </div>
      </form>
    </div>
  );
}