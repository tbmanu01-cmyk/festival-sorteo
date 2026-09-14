// Colombia no tiene horario de verano — offset fijo UTC-5 siempre. Usado
// para que la fecha/hora que un admin escribe o lee en pantalla sea SIEMPRE
// hora de Bogotá, sin importar en qué huso horario corre el navegador o el
// servidor (Vercel corre en UTC, no en la hora del admin).
const OFFSET_MS = 5 * 3600_000;

/**
 * Convierte el valor crudo de un <input type="datetime-local"> (interpretado
 * como hora de Bogotá) al instante UTC real que hay que guardar en la BD.
 */
export function bogotaInputAUtcISO(valorInput: string): string {
  const [fecha, hora] = valorInput.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, mi] = (hora ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) + OFFSET_MS).toISOString();
}

/**
 * Convierte un instante UTC guardado en la BD al string "YYYY-MM-DDTHH:mm"
 * en hora de Bogotá, para precargar un <input type="datetime-local">.
 */
export function utcAInputBogota(fechaUtc: Date | string | null | undefined): string {
  if (!fechaUtc) return "";
  const bogota = new Date(new Date(fechaUtc).getTime() - OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${bogota.getUTCFullYear()}-${pad(bogota.getUTCMonth() + 1)}-${pad(bogota.getUTCDate())}T${pad(bogota.getUTCHours())}:${pad(bogota.getUTCMinutes())}`;
}
