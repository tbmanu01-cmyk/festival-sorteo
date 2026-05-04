import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }

    const { numero } = await params;
    if (!/^\d{4}$/.test(numero)) {
      return NextResponse.json({ mensaje: "Número inválido." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({})) as { giftCardId?: string };

    const { prisma } = await import("@/lib/prisma");
    const userId = (session.user as unknown as { id: string }).id;

    // Precio dinámico desde Config
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const precioCaja = config?.precioCaja ?? 10_000;

    const caja = await prisma.caja.findUnique({ where: { numero } });
    if (!caja) return NextResponse.json({ mensaje: "Caja no encontrada." }, { status: 404 });

    const esReservadaMia = caja.estado === "RESERVADA" && caja.userId === userId;
    if (caja.estado !== "DISPONIBLE" && !esReservadaMia) {
      return NextResponse.json(
        { mensaje: "Esta caja ya está comprada o reservada por otro usuario." },
        { status: 409 }
      );
    }

    // Validar gift card si se provee
    let giftCard = null;
    if (body.giftCardId) {
      giftCard = await prisma.giftCard.findUnique({ where: { id: body.giftCardId } });
      if (!giftCard || giftCard.propietarioId !== userId || giftCard.estado !== "DISPONIBLE") {
        return NextResponse.json({ mensaje: "Gift card inválida o ya utilizada." }, { status: 400 });
      }
    }

    const idCompra = `COMPRA-${userId}-${Date.now()}`;
    const montoDescuento = giftCard ? Math.min(giftCard.valor, precioCaja) : 0;
    const montoCobrado = precioCaja - montoDescuento;

    const [cajaActualizada] = await prisma.$transaction([
      prisma.caja.update({
        where: { numero },
        data: { estado: "VENDIDA", userId, fechaCompra: new Date(), idCompra },
      }),
      prisma.transaccion.create({
        data: {
          userId,
          tipo: "COMPRA",
          monto: -montoCobrado,
          descripcion: giftCard
            ? `Compra de membresía #${numero} (gift card ${giftCard.codigo})`
            : `Compra de membresía #${numero}`,
          referencia: idCompra,
        },
      }),
      ...(giftCard
        ? [prisma.giftCard.update({
            where: { id: giftCard.id },
            data: { estado: "USADA", usadaEn: new Date(), nota: `Usada en compra membresía #${numero}` },
          })]
        : []),
    ]);

    // Email comprobante — fire and forget
    prisma.user.findUnique({ where: { id: userId }, select: { nombre: true, correo: true } })
      .then((u) => {
        if (!u) return;
        import("@/lib/email").then(({ enviarComprobante }) =>
          enviarComprobante({
            correo: u.correo,
            nombre: u.nombre,
            numeroCaja: numero,
            idCompra,
            fecha: new Date(),
            precio: montoCobrado,
          }).catch((err) => console.error("Email comprobante error:", err))
        );
      })
      .catch(() => undefined);

    // Referidos: marcar compra y emitir gift card si corresponde — fire and forget
    Promise.resolve().then(async () => {
      type RefRow = { id: string; referidorId: string; compro: boolean };
      const [ref] = await prisma.$queryRaw<RefRow[]>`
        SELECT id, "referidorId", compro FROM referidos WHERE "referidoId" = ${userId} LIMIT 1
      `;
      if (!ref || ref.compro) return;

      const cajasCount = await prisma.caja.count({ where: { userId, estado: "VENDIDA" } });
      if (cajasCount !== 1) return;

      await prisma.$executeRaw`UPDATE referidos SET compro = true WHERE id = ${ref.id}`;

      const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM referidos WHERE "referidorId" = ${ref.referidorId} AND compro = true
      `;
      const totalNum = Number(total);
      if (totalNum > 0 && totalNum % 5 === 0) {
        const gcCodigo = `GC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        await prisma.giftCard.create({
          data: {
            codigo: gcCodigo,
            valor: precioCaja,
            propietarioId: ref.referidorId,
            nota: "Premio por 5 referidos",
          },
        });
      }
    }).catch((err) => console.error("Referidos post-compra error:", err));

    return NextResponse.json({
      mensaje: `¡Membresía ${numero} comprada exitosamente!`,
      caja: cajaActualizada,
      referencia: idCompra,
    });
  } catch (error) {
    console.error("POST comprar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
