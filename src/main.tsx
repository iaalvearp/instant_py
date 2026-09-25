import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./componentes/ErrorBoundary";
import "./index.css";

// TODO: quitar después del diagnóstico
console.log("[BOOT] main.tsx iniciado");
console.log(
  "[BOOT] Tauri disponible:",
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
);

// TODO: quitar después del diagnóstico
window.addEventListener("error", (e) => {
  console.error("[GLOBAL ERROR]", e.error ?? e.message, e.filename, e.lineno);
});
window.addEventListener("unhandledrejection", (e) => {
  // TODO: quitar después del diagnóstico
  console.error("[UNHANDLED REJECTION]", e.reason);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);