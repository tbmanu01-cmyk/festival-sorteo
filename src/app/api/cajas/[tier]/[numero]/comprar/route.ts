import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tier: string; numero: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }

    const { tier, numero } = await params;
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
    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");

    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }
    const precioCaja = tipoMembresia.precio;

    const freeze = calcularFreezeSeleccion(tipoMembresia.fechaSorteo);
    if (freeze.activo) {
      return NextResponse.json(
        {
          mensaje: `La selección de esta temporada está por comenzar (en ${freeze.minutosParaInicio} min). Las compras se reabren apenas termine.`,
          codigo: "SELECCION_POR_COMENZAR",
        },
        { status: 423 }
      );
    }

    // Verificar correo confirmado
    const usuarioCheck = await prisma.user.findUnique({ where: { id: userId }, select: { confirmado: true } });
    if (!usuarioCheck?.confirmado) {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de comprar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    const caja = await prisma.caja.findUnique({
      where: { cajaTierNumero: { tipoMembresiaId: tipoMembresia.id, numero } },
    });
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

    const resultado = await prisma.$transaction(async (tx) => {
      if (montoCobrado > 0) {
        // Descuento atómico — el WHERE saldoPuntos >= montoCobrado evita saldo negativo por condición de carrera
        const deducido = await tx.user.updateMany({
          where: { id: userId, saldoPuntos: { gte: montoCobrado } },
          data: { saldoPuntos: { decrement: montoCobrado } },
        });
        if (deducido.count === 0) throw new Error("SALDO_INSUFICIENTE");
      }

      // Update atómico con el estado como condición — sin esto, dos compras
      // simultáneas del mismo número podían pasar el chequeo de arriba antes
      // de que cualquiera terminara, cobrándole a las dos personas por la
      // misma membresía. count===0 significa que alguien más se adelantó.
      const cajaVendida = await tx.caja.updateMany({
        where: {
          tipoMembresiaId: tipoMembresia.id,
          numero,
          OR: [{ estado: "DISPONIBLE" }, { estado: "RESERVADA", userId }],
        },
        data: { estado: "VENDIDA", userId, fechaCompra: new Date(), idCompra, montoPagado: montoCobrado },
      });
      if (cajaVendida.count === 0) throw new Error("CAJA_NO_DISPONIBLE");

      await tx.transaccion.create({
        data: {
          userId,
          tipo: "COMPRA",
          monto: -montoCobrado,
          descripcion: giftCard
            ? `Compra de membresía ${tipoMembresia.nombre} #${numero} (gift card ${giftCard.codigo})`
            : `Compra de membresía ${tipoMembresia.nombre} #${numero}`,
          referencia: idCompra,
        },
      });

      if (giftCard) {
        // No se toca "nota": ahí queda el origen del premio ("Premio por
        // compras propias" / "Premio por referidos"), que es lo que usa
        // emitirGiftCardsPorMembresias() para contar cuántas ya se pagaron.
        // Sobrescribirlo aquí borraba ese rastro y hacía que cada canje
        // pareciera "nunca entregado", regalando otra gift card sin fin.
        // updateMany + estado:"DISPONIBLE" evita que la misma gift card se
        // use dos veces en compras simultáneas.
        const gcUsada = await tx.giftCard.updateMany({
          where: { id: giftCard.id, estado: "DISPONIBLE" },
          data: { estado: "USADA", usadaEn: new Date() },
        });
        if (gcUsada.count === 0) throw new Error("GIFTCARD_NO_DISPONIBLE");
      }

      return true;
    }).catch((err) => {
      if (err instanceof Error && ["SALDO_INSUFICIENTE", "CAJA_NO_DISPONIBLE", "GIFTCARD_NO_DISPONIBLE"].includes(err.message)) {
        return err.message;
      }
      throw err;
    });

    if (resultado === "CAJA_NO_DISPONIBLE") {
      return NextResponse.json(
        { mensaje: "Esta membresía acaba de ser comprada por otra persona. Elige otro número." },
        { status: 409 }
      );
    }
    if (resultado === "GIFTCARD_NO_DISPONIBLE") {
      return NextResponse.json(
        { mensaje: "Esa gift card ya fue utilizada. Actualiza la página e intenta de nuevo." },
        { status: 409 }
      );
    }
    if (resultado !== true) {
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
      emitirGiftCardsPorMembresias({ usuarioCompradorId: userId, precioCaja, tipoMembresiaId: tipoMembresia.id })
    ).catch((err) => console.error("Gift cards por membresías error:", err));

    return NextResponse.json({
      mensaje: `¡Membresía ${numero} comprada exitosamente!`,
      referencia: idCompra,
    });
  } catch (error) {
    console.error("POST comprar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
