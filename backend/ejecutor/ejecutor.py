"""Lógica de ejecución de código Python de instant_py.

Este módulo guarda las piezas Python auxiliares que el backend de Rust
(src-tauri/) pueda invocar directamente (p. ej. vía sidecar o script) y la
definición de su contrato. Hoy la ejecución real vive en el comando Rust
`ejecutar_python` (src-tauri/src/lib.rs), que lanza `python3 -`.
"""


def ejecutar(codigo: str) -> dict:
    """Ejecuta `codigo` y devuelve {"salida": str, "errores": str}.

    Placeholder: se implementará si necesitamos lógica Python extra
    (entorno, dependencias o sandbox) fuera del comando Rust.
    """
    raise NotImplementedError