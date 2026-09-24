// Orquestación de la ejecución de Python: manual, automática con debounce de
// 2 s y cancelación. El backend solo mantiene una ejecución viva: al lanzar
// una nueva, la anterior queda cancelada.
import { useEffect, useRef } from "react";
import {
  detenerEjecucion,
  ejecutarPython,
  guardarPreferencias,
  obtenerPreferencias,
} from "../puente/tauriBridge";
import { useAppStore } from "./appStore";
import { useCodigoStore } from "./codigoStore";
import { useEjecucionStore } from "./ejecucionStore";

const DEBOUNCE_AUTO_MS = 2000;
const MENSAJE_TIMEOUT =
  "⏱ El código tardó más de 15 segundos y fue detenido. Revisa si tienes un bucle infinito.";

export function usarEjecucion() {
  const estableceEjecutando = useAppStore((estado) => estado.estableceEjecutando);
  const estableceSalida = useCodigoStore((estado) => estado.estableceSalida);
  const { automatica, indicador, estableceAutomatica, estableceIndicador } =
    useEjecucionStore();

  const ultimoEjecutadoRef = useRef<string | null>(null);
  const temporizadorRef = useRef<number | null>(null);
  const autoSuprimidaRef = useRef(false);
  const corridaIdRef = useRef(0);

  function anularTemporizador() {
    if (temporizadorRef.current !== null) {
      window.clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  }

  function programarIndicadorInactivo(milisegundos: number) {
    window.setTimeout(() => estableceIndicador("inactivo"), milisegundos);
  }

  async function correr(codigo: string) {
    anularTemporizador();
    ultimoEjecutadoRef.current = codigo;
    const id = ++corridaIdRef.current;
    estableceEjecutando(true);
    estableceIndicador("corriendo");
    try {
      const resultado = await ejecutarPython(codigo);
      if (id !== corridaIdRef.current) return;
      if (resultado.detenido) {
        autoSuprimidaRef.current = true;
        estableceSalida("Ejecución detenida.");
        estableceIndicador("error");
        programarIndicadorInactivo(2000);
      } else if (resultado.tiempoExcedido) {
        estableceSalida(MENSAJE_TIMEOUT);
        estableceIndicador("error");
        programarIndicadorInactivo(2000);
      } else {
        estableceSalida(resultado.salida);
        const correcto = resultado.codigoSalida === 0;
        estableceIndicador(correcto ? "exito" : "error");
        programarIndicadorInactivo(correcto ? 1000 : 2000);
      }
    } catch (error) {
      if (id !== corridaIdRef.current) return;
      estableceSalida(String(error));
      estableceIndicador("error");
      programarIndicadorInactivo(2000);
    } finally {
      if (id === corridaIdRef.current) {
        estableceEjecutando(false);
      }
    }
  }

  // Programar la auto-ejecución tras una edición real del contenido.
  function armarParaEdicion(codigo: string) {
    autoSuprimidaRef.current = false;
    if (!automatica) return;
    anularTemporizador();
    if (codigo === ultimoEjecutadoRef.current) return;
    temporizadorRef.current = window.setTimeout(() => {
      void correr(codigo);
    }, DEBOUNCE_AUTO_MS);
  }

  function ejecutarManualmente(codigo: string) {
    anularTemporizador();
    autoSuprimidaRef.current = false;
    void correr(codigo);
  }

  // Detener la ejecución en curso; la auto-ejecución queda suspendida hasta
  // la siguiente edición.
  function detener() {
    autoSuprimidaRef.current = true;
    anularTemporizador();
    void detenerEjecucion().catch(() => {});
  }

  function reiniciarUltimaEjecucion() {
    anularTemporizador();
    autoSuprimidaRef.current = false;
    ultimoEjecutadoRef.current = null;
  }

  async function alternarAutomatica(activa: boolean) {
    estableceAutomatica(activa);
    anularTemporizador();
    try {
      await guardarPreferencias({ ejecucionAutomatica: activa });
    } catch {
      // El cambio visual se mantiene aunque no se pueda persistir.
    }
  }

  // Carga la preferencia guardada al entrar en el editor.
  useEffect(() => {
    void obtenerPreferencias()
      .then((preferencias) => {
        estableceAutomatica(preferencias.ejecucionAutomatica);
      })
      .catch(() => {});
  }, [estableceAutomatica]);

  // Al salir del editor, cancela la ejecución en curso y el temporizador.
  useEffect(() => {
    return () => {
      anularTemporizador();
      void detenerEjecucion().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    automatica,
    indicador,
    alternarAutomatica,
    armarParaEdicion,
    ejecutarManualmente,
    detener,
    reiniciarUltimaEjecucion,
  };
}