const HORA_MS = 60 * 60 * 1000;

// Freeze de compra/reserva de membresías en la hora previa a la selección
// programada (Config.fechaSorteo). Una vez que la fecha ya pasó se deja de
// considerar como disparador — así el freeze no queda pegado indefinidamente
// si el admin no actualiza la fecha justo después de ejecutar la selección.
export function calcularFreezeSeleccion(fechaSorteo: Date | null): {
  activo: boolean;
  minutosParaInicio: number | null;
} {
  if (!fechaSorteo) return { activo: false, minutosParaInicio: null };

  const msParaInicio = fechaSorteo.getTime() - Date.now();
  if (msParaInicio <= 0) return { activo: false, minutosParaInicio: null };

  return {
    activo: msParaInicio <= HORA_MS,
    minutosParaInicio: Math.ceil(msParaInicio / 60_000),
  };
}
