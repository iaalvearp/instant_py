#!/usr/bin/env python3
# Instrumentador de instant_py: transforma el AST del código del usuario para
# imprimir el resultado de toda expresión a nivel de módulo (estilo RunJS).
#
# Protocolo con el frontend:
#   - Expresión evaluada:   stdout "__AUTOLOG__:{linea}:{repr(valor)}"
#   - Error de sintaxis:    stderr "__SYNTAX_ERROR__:{linea}:{columna}:{msg}" (código 1)
#
# El script recibe el código del usuario por stdin y es ejecutado por el
# backend Rust con `python3 -c <este_script>`.

import ast
import sys


def __autolog__(linea: int, valor) -> None:
    if valor is not None:
        print(f"__AUTOLOG__:{linea}:{valor!r}")


class Instrumentador(ast.NodeTransformer):
    def __init__(self, codigo: str) -> None:
        self.codigo = codigo
        # True solo si la primera sentencia es un literal de texto de comillas
        # triples: se considera el docstring del módulo y no se auto-loguea.
        # Un literal corto como "texto" sí se auto-loguea (estilo RunJS).
        self.docstring_del_modulo = False

    def visit_Module(self, nodo: ast.Module) -> ast.AST:
        cuerpo = nodo.body
        es_docstring = False
        if (
            cuerpo
            and isinstance(cuerpo[0], ast.Expr)
            and isinstance(cuerpo[0].value, ast.Constant)
            and isinstance(cuerpo[0].value.value, str)
        ):
            segmento = ast.get_source_segment(self.codigo, cuerpo[0]) or ""
            texto = segmento.lstrip()
            es_docstring = texto.startswith('"""') or texto.startswith("'''")
        self.docstring_del_modulo = es_docstring
        return self.generic_visit(nodo)

    def visit_Expr(self, nodo: ast.Expr) -> ast.AST:
        if self.docstring_del_modulo:
            self.docstring_del_modulo = False
            return nodo
        llamada = ast.Call(
            func=ast.Name(id="__autolog__", ctx=ast.Load()),
            args=[ast.Constant(value=nodo.lineno), nodo.value],
            keywords=[],
        )
        nuevo = ast.Expr(value=llamada)
        return ast.copy_location(nuevo, nodo)

    def visit_FunctionDef(self, nodo: ast.FunctionDef) -> ast.AST:
        return nodo

    def visit_AsyncFunctionDef(self, nodo: ast.AsyncFunctionDef) -> ast.AST:
        return nodo

    def visit_ClassDef(self, nodo: ast.ClassDef) -> ast.AST:
        return nodo

    def visit_Lambda(self, nodo: ast.Lambda) -> ast.AST:
        return nodo


def ejecutar(codigo: str) -> int:
    try:
        arbol = ast.parse(codigo, filename="<stdin>")
    except SyntaxError as error:
        linea = error.lineno or 0
        columna = error.offset or 0
        print(
            f"__SYNTAX_ERROR__:{linea}:{columna}:{error.msg}",
            file=sys.stderr,
        )
        return 1

    arbol = Instrumentador(codigo).visit(arbol)
    ast.fix_missing_locations(arbol)
    codigo_compilado = compile(arbol, "<stdin>", "exec")
    ambito = {
        "__name__": "__main__",
        "__builtins__": __builtins__,
        "__autolog__": __autolog__,
    }
    exec(codigo_compilado, ambito)
    return 0


if __name__ == "__main__":
    sys.exit(ejecutar(sys.stdin.read()))