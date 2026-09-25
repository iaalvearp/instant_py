// TODO: quitar tras diagnóstico
// Logs del frontend que se ven en DevTools y, además, en la terminal donde
// corre `pnpm tauri dev`, enrutándolos por el comando Rust log_al_terminal.
import { logAlTerminal } from "../puente/tauriBridge";

export function log(mensaje: string, ...args: unknown[]) {
  const completo = [
    mensaje,
    ...args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2))),
  ].join(" ");
  console.log(completo);
  void logAlTerminal("log", completo);
}

export function logError(mensaje: string, error?: unknown) {
  const completo =
    error instanceof Error
      ? `${mensaje}: ${error.message}\n${error.stack ?? ""}`
      : `${mensaje}: ${String(error)}`;
  console.error(completo);
  void logAlTerminal("error", completo);
}