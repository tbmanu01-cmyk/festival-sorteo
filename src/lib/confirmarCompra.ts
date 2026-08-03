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

  // Lógica de referidos y gift cards — no bloquea la respuesta principal
  Promise.resolve().then(async () => {
    type RefRow = { id: string; referidorId: string };
    const refs = await prisma.$queryRaw<RefRow[]>`
      SELECT id, "referidorId" FROM referidos WHERE "referidoId" = ${usuarioId} LIMIT 1
    `;
    if (!refs.length) return;
    const ref = refs[0];

    await prisma.$executeRaw`UPDATE referidos SET compro = true WHERE id = ${ref.id} AND compro = false`;

    const [{ totalMembresias }] = await prisma.$queryRaw<{ totalMembresias: bigint }[]>`
      SELECT COUNT(c.id) AS "totalMembresias"
      FROM referidos r
      INNER JOIN cajas c ON c."userId" = r."referidoId" AND c.estado = 'VENDIDA'
      WHERE r."referidorId" = ${ref.referidorId}
    `;
    const totalNum = Number(totalMembresias);
    if (!(config?.giftCardActivo ?? true)) return;
    const mpgc = config?.membresiasPorGiftCard ?? 5;
    const debeHaber = Math.floor(totalNum / mpgc);
    if (debeHaber === 0) return;

    const yaEmitidas = await prisma.giftCard.count({
      where: { propietarioId: ref.referidorId, nota: { contains: "referidos" } },
    });
    const porEmitir = debeHaber - yaEmitidas;
    if (porEmitir <= 0) return;

    for (let i = 0; i < porEmitir; i++) {
      const gcCodigo = `GC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      await prisma.giftCard.create({
        data: {
          codigo: gcCodigo,
          valor: config?.precioCaja ?? 10_000,
          propietarioId: ref.referidorId,
          nota: "Premio por referidos",
        },
      });
    }
  }).catch((e) => console.error("Referidos post-aprobacion error:", e));

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
