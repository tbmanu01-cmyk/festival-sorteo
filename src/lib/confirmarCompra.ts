// Lógica compartida para activar una membresía tras un pago verificado —
// usada por la aprobación manual de admin (/api/admin/pagos-manuales/[id])
// y por el webhook de Bold (/api/webhooks/bold).

export async function confirmarCompraMembresia(opts: {
  usuarioId: string;
  numeroCaja: string;
  tipoMembresiaId: string;
  monto: number;
  descripcionTransaccion: string;
  referenciaTransaccion: string;
}) {
  const { usuarioId, numeroCaja, tipoMembresiaId, monto, descripcionTransaccion, referenciaTransaccion } = opts;
  const { prisma } = await import("@/lib/prisma");

  const caja = await prisma.caja.findUnique({
    where: { cajaTierNumero: { tipoMembresiaId, numero: numeroCaja } },
  });
  if (!caja) throw new Error(`Membresía #${numeroCaja} no encontrada en el sistema.`);
  if (caja.estado === "VENDIDA") throw new Error(`La membresía #${numeroCaja} ya fue vendida.`);

  const idCompra = `COMPRA-${usuarioId}-${Date.now()}`;

  await prisma.$transaction([
    prisma.caja.update({
      where: { cajaTierNumero: { tipoMembresiaId, numero: numeroCaja } },
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
    emitirGiftCardsPorMembresias({ usuarioCompradorId: usuarioId, precioCaja: monto, tipoMembresiaId })
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

// Igual que confirmarCompraMembresia() pero para un paquete de varias
// membresías pagadas en un solo cobro de Bold — usada solo por el webhook
// de Bold cuando la orden trae numerosCaja (ver /api/pagos/bold/firma-lote).
// El descuento del pago ya lo hizo Bold; acá solo se activan las membresías.
export async function confirmarCompraMembresiaLote(opts: {
  usuarioId: string;
  numeros: string[];
  tipoMembresiaId: string;
  montoPorUnidad: number;
  referenciaTransaccion: string;
}) {
  const { usuarioId, numeros, tipoMembresiaId, montoPorUnidad, referenciaTransaccion } = opts;
  const { prisma } = await import("@/lib/prisma");

  const cajas = await prisma.caja.findMany({ where: { numero: { in: numeros }, tipoMembresiaId } });
  if (cajas.length !== numeros.length) throw new Error("Alguna membresía del paquete no existe en el sistema.");
  const yaVendidas = cajas.filter((c) => c.estado === "VENDIDA");
  if (yaVendidas.length > 0) {
    throw new Error(`Las membresías ${yaVendidas.map((c) => "#" + c.numero).join(", ")} ya fueron vendidas.`);
  }

  const idLote = `LOTE-${usuarioId}-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    for (const numero of numeros) {
      const idCompra = `${idLote}-${numero}`;
      await tx.caja.update({
        where: { cajaTierNumero: { tipoMembresiaId, numero } },
        data: { estado: "VENDIDA", userId: usuarioId, fechaCompra: new Date(), idCompra },
      });
      await tx.transaccion.create({
        data: {
          userId: usuarioId,
          tipo: "COMPRA",
          monto: -montoPorUnidad,
          descripcion: `Membresía #${numero} — paquete de ${numeros.length} pagado con Bold`,
          referencia: idCompra,
        },
      });
    }
  });

  import("@/lib/giftCardsPorMembresias").then(({ emitirGiftCardsPorMembresias }) =>
    emitirGiftCardsPorMembresias({ usuarioCompradorId: usuarioId, precioCaja: montoPorUnidad, tipoMembresiaId })
  ).catch((e) => console.error("Gift cards por membresías (lote Bold) error:", e));

  const usuario = await prisma.user.findUnique({ where: { id: usuarioId }, select: { correo: true, nombre: true } });
  if (usuario) {
    import("@/lib/email").then(({ enviarComprobanteLote }) =>
      enviarComprobanteLote({
        correo: usuario.correo,
        nombre: usuario.nombre,
        numerosCaja: numeros,
        idLote: referenciaTransaccion,
        fecha: new Date(),
        precioTotal: montoPorUnidad * numeros.length,
      }).catch((e) => console.error("Email comprobante lote (Bold) error:", e))
    );
  }
}
