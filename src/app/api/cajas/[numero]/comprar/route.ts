import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

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

    const userId = (session.user as unknown as { id: string }).id;

    // Rate limit: máx 15 compras de membresías por usuario cada 15 minutos
    const rl = checkRateLimit(`caja-compra:${userId}`, 15, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { mensaje: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({})) as { giftCardId?: string };

    const { prisma } = await import("@/lib/prisma");

    // Verificar correo confirmado
    const usuarioCheck = await prisma.user.findUnique({ where: { id: userId }, select: { confirmado: true } });
    if (!usuarioCheck?.confirmado) {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de comprar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    // Precio dinámico desde Config
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const precioCaja = config?.precioCaja ?? 10_000;

    const caja = await prisma.caja.findUnique({ where: { numero } });
    if (!caja) return NextResponse.json({ mensaje: "Membresía no encontrada." }, { status: 404 });

    const esReservadaMia = caja.estado === "RESERVADA" && caja.userId === userId;
    if (caja.estado !== "DISPONIBLE" && !esReservadaMia) {
      return NextResponse.json(
        { mensaje: "Esta membresía ya está comprada o reservada por otro usuario." },
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

    // El resto (si lo hay tras la gift card) se paga con saldo de la cuenta —
    // esta ruta es solo para pago interno (saldo/gift card); si no alcanza,
    // el frontend debe ofrecer pagar con Bold en vez de reintentar aquí.
    if (montoCobrado > 0) {
      const usuarioSaldo = await prisma.user.findUnique({ where: { id: userId }, select: { saldoPuntos: true } });
      if (!usuarioSaldo || usuarioSaldo.saldoPuntos < montoCobrado) {
        return NextResponse.json(
          {
            mensaje: `Saldo insuficiente. Te faltan $${(montoCobrado - (usuarioSaldo?.saldoPuntos ?? 0)).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP. Puedes pagar con tarjeta, PSE o Nequi.`,
            codigo: "SALDO_INSUFICIENTE",
            montoFaltante: montoCobrado - (usuarioSaldo?.saldoPuntos ?? 0),
          },
          { status: 402 }
        );
      }
    }

    const cajaActualizada = await prisma.$transaction(async (tx) => {
      if (montoCobrado > 0) {
        // Descuento atómico — el WHERE saldoPuntos >= montoCobrado evita saldo negativo por condición de carrera
        const deducido = await tx.user.updateMany({
          where: { id: userId, saldoPuntos: { gte: montoCobrado } },
          data: { saldoPuntos: { decrement: montoCobrado } },
        });
        if (deducido.count === 0) throw new Error("SALDO_INSUFICIENTE");
      }

      const actualizada = await tx.caja.update({
        where: { numero },
        data: { estado: "VENDIDA", userId, fechaCompra: new Date(), idCompra },
      });

      await tx.transaccion.create({
        data: {
          userId,
          tipo: "COMPRA",
          monto: -montoCobrado,
          descripcion: giftCard
            ? `Compra de membresía #${numero} (gift card ${giftCard.codigo})`
            : `Compra de membresía #${numero}`,
          referencia: idCompra,
        },
      });

      if (giftCard) {
        await tx.giftCard.update({
          where: { id: giftCard.id },
          data: { estado: "USADA", usadaEn: new Date(), nota: `Usada en compra membresía #${numero}` },
        });
      }

      return actualizada;
    }).catch((err) => {
      if (err instanceof Error && err.message === "SALDO_INSUFICIENTE") return null;
      throw err;
    });

    if (!cajaActualizada) {
      return NextResponse.json(
        { mensaje: "Saldo insuficiente al momento de procesar. Intenta de nuevo o paga con tarjeta.", codigo: "SALDO_INSUFICIENTE" },
        { status: 402 }
      );
    }

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

    // Gift cards automáticas por umbral de membresías (propias o de la red de referidos) + notificación
    import("@/lib/giftCardsPorMembresias").then(({ emitirGiftCardsPorMembresias }) =>
      emitirGiftCardsPorMembresias({ usuarioCompradorId: userId, precioCaja })
    ).catch((err) => console.error("Gift cards por membresías error:", err));

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
