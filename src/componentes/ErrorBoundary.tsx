// TODO: quitar después del diagnóstico
// ErrorBoundary global: muestra en pantalla cualquier error que ocurra dentro
// del árbol de componentes y lo loguea en consola. Fondo rojo bien visible.
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, informacion: ErrorInfo) {
    // TODO: quitar después del diagnóstico
    console.error("[ERROR BOUNDARY]", error, informacion.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          style={{
            background: "#7f1d1d",
            color: "#ffffff",
            height: "100vh",
            overflow: "auto",
            padding: "24px",
            fontFamily: "monospace",
            fontSize: "16px",
          }}
        >
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
            Se rompió la interfaz
          </h1>
          <p style={{ fontWeight: 600 }}>{error.message}</p>
          <pre style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
            {error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}