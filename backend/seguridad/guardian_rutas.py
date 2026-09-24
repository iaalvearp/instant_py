"""Bloqueo de rutas fuera del proyecto activo.

Responsabilidad: impedir que el código Python ejecutado (o las operaciones
de gestión) lean, escriban o borren archivos fuera del directorio del
proyecto activo.

Placeholder: el validador se aplicará antes de ejecutar cualquier script o
de aceptar rutas del frontend.
"""


def ruta_permitida(ruta: str) -> bool:
    """Devuelve True si `ruta` está dentro del proyecto activo."""
    raise NotImplementedError