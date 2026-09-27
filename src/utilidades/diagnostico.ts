// Logs del frontend que se ven solo en DevTools (consola del navegador).
export function log(mensaje: string, ...args: unknown[]) {
  const completo = [
    mensaje,
    ...args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2))),
  ].join(" ");
  console.log(completo);
}

export function logError(mensaje: string, error?: unknown) {
  const completo =
    error instanceof Error
      ? `${mensaje}: ${error.message}\n${error.stack ?? ""}`
      : `${mensaje}: ${String(error)}`;
  console.error(completo);
}