// Utilidades de formato para fechas e iniciales.

/** Convierte una fecha ISO en texto relativo en español ("hace 2 días"). */
export function fechaRelativa(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return "";
  }
  const diferenciaMs = Date.now() - fecha.getTime();
  const minutos = Math.floor(diferenciaMs / 60_000);
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  const semanas = Math.floor(dias / 7);
  if (semanas < 5) return `hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const años = Math.floor(dias / 365);
  return `hace ${años} ${años === 1 ? "año" : "años"}`;
}

/** Devuelve la inicial(es) del nombre, p. ej. "Papá" -> "P", "Ana Rosa" -> "AR". */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}