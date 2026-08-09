// Próximo día hábil (lunes a viernes) después de una fecha dada, a las
// 00:00. NO tiene en cuenta festivos colombianos a propósito — decisión
// explícita del usuario: si esa semana hay festivo, el admin corre la fecha
// un día más a mano desde /admin/configuracion en vez de automatizar el
// calendario de festivos (Ley Emiliani).
export function calcularProximoDiaHabil(desde: Date): Date {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(0, 0, 0, 0);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return fecha;
}

export function estaEnFreezeRetiros(retirosDisponiblesDesde: Date | null): boolean {
  if (!retirosDisponiblesDesde) return false;
  return Date.now() < retirosDisponiblesDesde.getTime();
}
