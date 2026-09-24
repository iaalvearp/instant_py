// Botón reutilizable con variantes (primario, secundario, peligro).
// Placeholder: por ahora se usa el <button> directo en App.tsx.
import { ButtonHTMLAttributes } from "react";

export type VarianteBoton = "primaria" | "secundaria";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
}

export default function Boton({ variante = "primaria", children, ...rest }: Props) {
  return (
    <button {...rest} data-variante={variante}>
      {children}
    </button>
  );
}