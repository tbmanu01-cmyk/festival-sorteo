/** Muestra solo los últimos 4 dígitos de un número de cuenta */
export function mascararCuenta(cuenta: string | null | undefined): string {
  if (!cuenta) return "—";
  const limpio = cuenta.replace(/\D/g, "");
  if (limpio.length <= 4) return "****";
  return "****" + limpio.slice(-4);
}

/** Enmascara correo: ma***@gmail.com */
export function mascararCorreo(correo: string | null | undefined): string {
  if (!correo) return "—";
  const [usuario, dominio] = correo.split("@");
  if (!dominio) return correo;
  const visible = usuario.slice(0, 2);
  return `${visible}***@${dominio}`;
}

/** Muestra cuenta completa solo para admins, enmascarada para otros */
export function cuentaSegunRol(
  cuenta: string | null | undefined,
  esAdmin: boolean
): string {
  if (!cuenta) return "—";
  return esAdmin ? cuenta : mascararCuenta(cuenta);
}
