// Lógica compartida para activar una membresía tras un pago verificado —
// usada por la aprobación manual de admin (/api/admin/pagos-manuales/[id])
// y por el webhook de Bold (/api/webhooks/bold).

export async function confirmarCompraMembresia(opts: {
  usuarioId: string;
  numeroCaja: string;
  monto: number;
  descripcionTransaccion: string;
  referenciaTransaccion: string;
}) {
  const { usuarioId, numeroCaja, monto, descripcionTransaccion, referenciaTransaccion } = opts;
  const { prisma } = await import("@/lib/prisma");

  const caja = await prisma.caja.findUnique({ where: { numero: numeroCaja } });
  if (!caja) throw new Error(`Membresía #${numeroCaja} no encontrada en el sistema.`);
  if (caja.estado === "VENDIDA") throw new Error(`La membresía #${numeroCaja} ya fue vendida.`);

  const config = await prisma.config.findUnique({ where: { id: "singleton" } });
  const idCompra = `COMPRA-${usuarioId}-${Date.now()}`;

  await prisma.$transaction([
    prisma.caja.update({
      where: { numero: numeroCaja },
      data: { estado: "VENDIDA", userId: usuarioId, fechaCompra: new Date(), idCompra },
    }),
    prisma.transaccion.create({
      data: {
        userId: usuarioId,
        tipo: "COMPRA",
        monto: -monto,
        descripcion: descripcionTransaccion,
        referencia: idCompra,
      },
    }),
  ]);

  // Gift cards automáticas por umbral de membresías (propias o de la red de referidos) + notificación
  import("@/lib/giftCardsPorMembresias").then(({ emitirGiftCardsPorMembresias }) =>
    emitirGiftCardsPorMembresias({ usuarioCompradorId: usuarioId, precioCaja: config?.precioCaja ?? 10_000 })
  ).catch((e) => console.error("Gift cards por membresías (aprobación) error:", e));

  // Email al usuario — fire and forget
  const usuario = await prisma.user.findUnique({
    where: { id: usuarioId },
    select: { correo: true, nombre: true },
  });
  if (usuario) {
    import("@/lib/email").then(({ enviarPagoManualAprobado }) =>
      enviarPagoManualAprobado({
        correo: usuario.correo,
        nombre: usuario.nombre,
        numeroCaja,
        referencia: referenciaTransaccion,
        monto,
      }).catch((e) => console.error("Email aprobacion error:", e))
    );
  }
}
