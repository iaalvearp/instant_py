import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./componentes/ErrorBoundary";
import "./index.css";
import { log, logError } from "./utilidades/diagnostico";

// TODO: quitar después del diagnóstico
log("=== instant_py arrancando ===");
log(
  "Tauri disponible:",
  String(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window),
);

// TODO: quitar después del diagnóstico
window.addEventListener("error", (e) => {
  logError("[GLOBAL ERROR]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  // TODO: quitar después del diagnóstico
  logError("[UNHANDLED REJECTION]", e.reason);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);