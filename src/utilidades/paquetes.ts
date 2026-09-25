// Utilidades de dependencias pip del proyecto: nombre base de un requisito y
// validación de nombres de paquete (mismo criterio que src-tauri/src/paquetes.rs).

export interface TrozoSalida {
  texto: string;
  color?: string;
}

/** Nombre de la dependencia sin versiones ni extras ("numpy==1.26.0" -> "numpy"). */
export function nombreBaseDeRequisito(requisito: string): string {
  const recortado = requisito.trim();
  const indice = recortado.search(/[=<>!~\[]/);
  return (indice === -1 ? recortado : recortado.slice(0, indice)).trim();
}

/**
 * Valida que un nombre de paquete solo contenga letras, números y los
 * caracteres permitidos por pip (punto, guion, guion bajo y '=' para fijar
 * versiones). Rechaza cualquier carácter de shell.
 */
export function validarNombrePaquete(nombre: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._=-]*$/.test(nombre);
}

/** Extrae la declaración de color RGB del código SGR si es un color de primer
 * plano (38;2;r;g;b) y devuelve undefined en caso contrario. */
function colorDelCodigo(codigo: string): string | undefined {
  const partes = codigo.split(";");
  if (partes[0] === "38" && partes[1] === "2") {
    const [r, g, b] = partes.slice(2, 5).map(Number);
    if ([r, g, b].every((v) => Number.isFinite(v))) {
      return `rgb(${r},${g},${b})`;
    }
  }
  return undefined;
}

const COLORES_BASICOS: Record<string, string> = {
  "30": "rgb(50,50,50)",
  "31": "rgb(185,55,55)",
  "32": "rgb(15,134,84)",
  "33": "rgb(196,132,20)",
  "34": "rgb(38,87,200)",
  "35": "rgb(155,60,180)",
  "36": "rgb(24,146,161)",
  "37": "rgb(220,220,220)",
  "90": "rgb(120,120,120)",
  "91": "rgb(220,50,50)",
  "92": "rgb(60,190,120)",
  "93": "rgb(220,180,40)",
  "94": "rgb(80,120,230)",
  "95": "rgb(190,90,200)",
  "96": "rgb(60,180,200)",
  "97": "rgb(255,255,255)",
};

function aplicarCodigoAnsi(
  codigo: string,
  colorActual: string | undefined,
): string | undefined {
  const partes = codigo.split(";");
  const base = partes[0] ?? "";
  if (base === "" || base === "0" || base === "39" || base === "49") return undefined;
  const colorRgb = colorDelCodigo(codigo);
  if (colorRgb) return colorRgb;
  return COLORES_BASICOS[base] ?? colorActual;
}

function apilarTrozo(
  texto: string,
  color: string | undefined,
  trozos: TrozoSalida[],
) {
  const ultimo = trozos[trozos.length - 1];
  if (ultimo && ultimo.color === color) {
    ultimo.texto += texto;
  } else {
    trozos.push({ texto, color });
  }
}

/** Convierte las secuencias de escape SGR de una línea en trozos con color. */
export function trozosAnsi(linea: string): TrozoSalida[] {
  if (!linea.includes("\x1b[")) {
    return [{ texto: linea }];
  }
  const trozos: TrozoSalida[] = [];
  let color: string | undefined;
  let resto = linea;
  while (resto.length > 0) {
    const inicio = resto.indexOf("\x1b[");
    if (inicio === -1) {
      apilarTrozo(resto, color, trozos);
      break;
    }
    if (inicio > 0) apilarTrozo(resto.slice(0, inicio), color, trozos);
    const fin = resto.indexOf("m", inicio);
    if (fin === -1) {
      apilarTrozo(resto.slice(inicio), color, trozos);
      break;
    }
    color = aplicarCodigoAnsi(resto.slice(inicio + 2, fin), color);
    resto = resto.slice(fin + 1);
  }
  return trozos;
}