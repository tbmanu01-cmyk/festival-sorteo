// Límite de gasto mensual — el usuario lo fija voluntariamente desde su
// perfil (User.limiteGastoMensual, null = sin límite). Se valida en cada
// punto de compra antes de cobrar, sumando lo ya gastado este mes calendario
// (Caja.montoPagado de sus membresías VENDIDA con fechaCompra en el mes
// actual — cubre saldo, gift card parcial, Bold y pago manual por igual,
// porque todos esos caminos terminan escribiendo montoPagado/fechaCompra).

export async function verificarLimiteGasto(
  prisma: import("@prisma/client").PrismaClient,
  userId: string,
  montoNuevo: number
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { limiteGastoMensual: true },
  });
  if (!usuario?.limiteGastoMensual) return { ok: true };

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { _sum } = await prisma.caja.aggregate({
    where: { userId, estado: "VENDIDA", fechaCompra: { gte: inicioMes } },
    _sum: { montoPagado: true },
  });
  const gastadoEsteMes = _sum.montoPagado ?? 0;

  if (gastadoEsteMes + montoNuevo > usuario.limiteGastoMensual) {
    const disponible = Math.max(0, usuario.limiteGastoMensual - gastadoEsteMes);
    return {
      ok: false,
      mensaje: `Alcanzaste el límite de gasto mensual que fijaste en tu perfil ($${usuario.limiteGastoMensual.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP). Te quedan $${disponible.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP disponibles este mes — podés ajustar o quitar el límite desde tu perfil cuando quieras.`,
    };
  }
  return { ok: true };
}
