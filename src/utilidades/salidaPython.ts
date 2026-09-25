// Interpreta la salida del instrumentador Python: separa el auto-log de las
// expresiones del print normal y detecta los errores de sintaxis. Las líneas
// normales se dividen además en trozos de color (secuencias ANSI SGR) para
// que herramientas como rich puedan pintar la salida.
// Ver recursos/instrumentador.py para el protocolo de marcas.

import { trozosAnsi, type TrozoSalida } from "./paquetes";

export type EstiloSalida = "normal" | "autolog" | "sintaxis";

export interface LineaSalida {
  trozos: TrozoSalida[];
  estilo: EstiloSalida;
}

export interface ErrorSintaxis {
  linea: number;
  columna: number;
  mensaje: string;
}

const MARCA_AUTOLOG = "__AUTOLOG__:";
const MARCA_SINTAXIS = "__SYNTAX_ERROR__:";

/** Devuelve el error de sintaxis cuando la salida es únicamente esa marca. */
export function extraeErrorSintaxis(salida: string): ErrorSintaxis | null {
  if (!salida.startsWith(MARCA_SINTAXIS)) return null;
  const partes = salida.slice(MARCA_SINTAXIS.length).split(":");
  const linea = Number(partes[0]) || 0;
  const columna = Number(partes[1]) || 0;
  const mensaje = partes.slice(2).join(":");
  return { linea, columna, mensaje };
}

/** Divide la salida bruta en líneas etiquetadas (normal, auto-log o sintaxis). */
export function parsearSalida(salida: string): LineaSalida[] {
  const error = extraeErrorSintaxis(salida);
  if (error) {
    return [
      {
        trozos: [
          {
            texto: `SyntaxError en la línea ${error.linea}, columna ${error.columna}:`,
          },
        ],
        estilo: "sintaxis",
      },
      { trozos: [{ texto: error.mensaje }], estilo: "sintaxis" },
    ];
  }
  return salida.split("\n").map((linea) => {
    if (linea.startsWith(MARCA_AUTOLOG)) {
      const partes = linea.slice(MARCA_AUTOLOG.length).split(":");
      return { trozos: [{ texto: partes.slice(1).join(":") }], estilo: "autolog" };
    }
    return { trozos: trozosAnsi(linea), estilo: "normal" };
  });
}