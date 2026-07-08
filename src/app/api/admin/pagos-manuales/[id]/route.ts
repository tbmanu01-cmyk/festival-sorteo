import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const adminId = (session?.user as unknown as { id: string } | undefined)?.id;

  const { id } = await params;
  const body = await req.json() as { accion: "aprobar" | "rechazar"; motivoRechazo?: string };

  if (!["aprobar", "rechazar"].includes(body.accion)) {
    return NextResponse.json({ mensaje: "Acción inválida." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const pago = await prisma.pagoManual.findUnique({
    where: { id },
    include: { usuario: { select: { nombre: true, correo: true, confirmado: true } } },
  });

  if (!pago) return NextResponse.json({ mensaje: "Pago no encontrado." }, { status: 404 });
  if (pago.estado !== "PENDIENTE") {
    return NextResponse.json({ mensaje: "Este pago ya fue procesado." }, { status: 409 });
  }

  if (body.accion === "rechazar") {
    await prisma.pagoManual.update({
      where: { id },
      data: { estado: "RECHAZADO", motivoRechazo: body.motivoRechazo || null, aprobadoPorId: adminId, aprobadoEn: new Date() },
    });

    import("@/lib/email").then(({ enviarPagoManualRechazado }) =>
      enviarPagoManualRechazado({
        correo: pago.usuario.correo,
        nombre: pago.usuario.nombre,
        numeroCaja: pago.numeroCaja,
        motivo: body.motivoRechazo,
      }).catch((e) => console.error("Email rechazo error:", e))
    );

    return NextResponse.json({ mensaje: "Pago rechazado y usuario notificado." });
  }

  // APROBAR — verificar que la caja siga disponible o reservada por este usuario
  const caja = await prisma.caja.findUnique({ where: { numero: pago.numeroCaja } });
  if (!caja) {
    return NextResponse.json({ mensaje: "Membresía no encontrada en el sistema." }, { status: 404 });
  }
  if (caja.estado === "VENDIDA") {
    return NextResponse.json(
      { mensaje: `La membresía #${pago.numeroCaja} ya fue vendida a otro usuario. Rechaza este pago y contacta al cliente.` },
      { status: 409 }
    );
  }

  const config = await prisma.config.findUnique({ where: { id: "singleton" } });
  const idCompra = `COMPRA-${pago.usuarioId}-${Date.now()}`;

  await prisma.$transaction([
    prisma.caja.update({
      where: { numero: pago.numeroCaja },
      data: { estado: "VENDIDA", userId: pago.usuarioId, fechaCompra: new Date(), idCompra },
    }),
    prisma.transaccion.create({
      data: {
        userId: pago.usuarioId,
        tipo: "COMPRA",
        monto: -pago.monto,
        descripcion: `Membresía #${pago.numeroCaja} — pago por transferencia (${pago.referencia})`,
        referencia: idCompra,
      },
    }),
    prisma.pagoManual.update({
      where: { id },
      data: { estado: "APROBADO", aprobadoPorId: adminId, aprobadoEn: new Date() },
    }),
  ]);

  // Lógica de referidos y gift cards
  Promise.resolve().then(async () => {
    type RefRow = { id: string; referidorId: string };
    const refs = await prisma.$queryRaw<RefRow[]>`
      SELECT id, "referidorId" FROM referidos WHERE "referidoId" = ${pago.usuarioId} LIMIT 1
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

  // Email al usuario
  import("@/lib/email").then(({ enviarPagoManualAprobado }) =>
    enviarPagoManualAprobado({
      correo: pago.usuario.correo,
      nombre: pago.usuario.nombre,
      numeroCaja: pago.numeroCaja,
      referencia: pago.referencia,
      monto: pago.monto,
    }).catch((e) => console.error("Email aprobacion error:", e))
  );

  return NextResponse.json({ mensaje: `¡Membresía #${pago.numeroCaja} aprobada y activada!` });
}
