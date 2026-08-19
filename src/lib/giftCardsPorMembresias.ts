// Emite gift cards automáticas cuando un usuario alcanza el umbral de
// membresías configurado (Config.membresiasPorGiftCard) — ya sea por sus
// propias compras o porque la suma de compras de su red de referidos llega
// al umbral — y notifica al beneficiario. El umbral se cuenta POR SEPARADO
// en cada tier (5 compras del tier 10k no se mezclan con 5 del tier 50k).
// Compartido entre los 3 caminos de compra: /api/cajas/[tier]/[numero]/comprar,
// /api/cajas/comprar-lote y la confirmación de pagos por Bold/transferencia manual.

async function crearGiftCardYNotificar(opts: {
  propietarioId: string;
  valor: number;
  nota: string;
  mensajeExtra: string;
}) {
  const { prisma } = await import("@/lib/prisma");
  const gcCodigo = `GC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await prisma.giftCard.create({
    data: { codigo: gcCodigo, valor: opts.valor, propietarioId: opts.propietarioId, nota: opts.nota },
  });

  await prisma.notificacion.create({
    data: {
      tipo: "MEMBRESIA",
      titulo: "🎉 ¡Ganaste una gift card!",
      cuerpo: `${opts.mensajeExtra} Te regalamos una gift card de $${opts.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP — úsala en tu próxima membresía o conviértela en saldo desde tu panel.`,
      icono: "🎁",
      usuarioId: opts.propietarioId,
    },
  }).catch((err) => console.error("Notificación gift card error:", err));

  // Correo — antes esta gift card (por umbral de referidos/compras propias)
  // solo generaba la notificación de campanita, nunca un correo al beneficiario.
  prisma.user.findUnique({ where: { id: opts.propietarioId }, select: { nombre: true, correo: true } })
    .then((u) => {
      if (!u) return;
      import("@/lib/email").then(({ enviarGiftCardRecibida }) =>
        enviarGiftCardRecibida({
          correo: u.correo,
          nombre: u.nombre,
          codigoGiftCard: gcCodigo,
          valorGiftCard: opts.valor,
          motivo: opts.mensajeExtra,
        }).catch((err) => console.error("Email gift card por membresías error:", err))
      );
    })
    .catch(() => undefined);
}

export async function emitirGiftCardsPorMembresias(opts: {
  usuarioCompradorId: string;
  precioCaja: number;
  tipoMembresiaId: string;
}) {
  const { usuarioCompradorId, precioCaja, tipoMembresiaId } = opts;
  const { prisma } = await import("@/lib/prisma");

  const [config, tipoMembresia] = await Promise.all([
    prisma.config.findUnique({ where: { id: "singleton" } }),
    prisma.tipoMembresia.findUnique({ where: { id: tipoMembresiaId }, select: { slug: true } }),
  ]);
  if (!(config?.giftCardActivo ?? true) || !tipoMembresia) return;
  const mpgc = config?.membresiasPorGiftCard ?? 5;
  const sufijoTier = ` — ${tipoMembresia.slug}`;

  // Por red de referidos: el referidor de este comprador
  type RefRow = { id: string; referidorId: string };
  const refs = await prisma.$queryRaw<RefRow[]>`
    SELECT id, "referidorId" FROM referidos WHERE "referidoId" = ${usuarioCompradorId} LIMIT 1
  `;
  if (refs.length) {
    const ref = refs[0];
    await prisma.$executeRaw`UPDATE referidos SET compro = true WHERE id = ${ref.id} AND compro = false`;

    const [{ totalMembresias }] = await prisma.$queryRaw<{ totalMembresias: bigint }[]>`
      SELECT COUNT(c.id) AS "totalMembresias"
      FROM referidos r
      INNER JOIN cajas c ON c."userId" = r."referidoId" AND c.estado = 'VENDIDA' AND c."tipoMembresiaId" = ${tipoMembresiaId}
      WHERE r."referidorId" = ${ref.referidorId}
    `;
    const debeHaber = Math.floor(Number(totalMembresias) / mpgc);
    if (debeHaber > 0) {
      const yaEmitidas = await prisma.giftCard.count({
        where: { propietarioId: ref.referidorId, nota: { contains: `referidos${sufijoTier}` } },
      });
      for (let i = 0; i < debeHaber - yaEmitidas; i++) {
        await crearGiftCardYNotificar({
          propietarioId: ref.referidorId,
          valor: precioCaja,
          nota: `Premio por referidos${sufijoTier}`,
          mensajeExtra: `¡Felicitaciones! Tus referidos ya suman ${mpgc} membresías compradas.`,
        });
      }
    }
  }

  // Por compras propias
  const totalPropias = await prisma.caja.count({ where: { userId: usuarioCompradorId, estado: "VENDIDA", tipoMembresiaId } });
  const debeHaberPropias = Math.floor(totalPropias / mpgc);
  if (debeHaberPropias > 0) {
    const yaEmitidas = await prisma.giftCard.count({
      where: { propietarioId: usuarioCompradorId, nota: { contains: `compras propias${sufijoTier}` } },
    });
    for (let i = 0; i < debeHaberPropias - yaEmitidas; i++) {
      await crearGiftCardYNotificar({
        propietarioId: usuarioCompradorId,
        valor: precioCaja,
        nota: `Premio por compras propias${sufijoTier}`,
        mensajeExtra: `¡Felicitaciones! Ya acumulaste ${mpgc} membresías compradas.`,
      });
    }
  }
}
