import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

// Paga varias membresías reservadas de una sola vez con saldo de cuenta —
// una sola llamada atómica en vez de N llamadas secuenciales a
// /api/cajas/[numero]/comprar (que podían fallar a mitad de camino por
// rate limit, un error de red entre llamadas, etc. dejando el lote a
// medio pagar sin que el usuario entendiera por qué).
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }
    const userId = (session.user as unknown as { id: string }).id;

    const rl = checkRateLimit(`caja-compra-lote:${userId}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { mensaje: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({})) as { numeros?: string[] };
    const numeros = Array.isArray(body.numeros) ? Array.from(new Set(body.numeros)) : [];

    if (numeros.length === 0) {
      return NextResponse.json({ mensaje: "No seleccionaste ninguna membresía." }, { status: 400 });
    }
    if (numeros.length > 50) {
      return NextResponse.json({ mensaje: "Máximo 50 membresías por pago múltiple." }, { status: 400 });
    }
    if (!numeros.every((n) => /^\d{4}$/.test(n))) {
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");

    const usuarioCheck = await prisma.user.findUnique({
      where: { id: userId },
      select: { confirmado: true, saldoPuntos: true },
    });
    if (!usuarioCheck?.confirmado) {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de comprar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const precioCaja = config?.precioCaja ?? 10_000;

    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");
    const freeze = calcularFreezeSeleccion(config?.fechaSorteo ?? null);
    if (freeze.activo) {
      return NextResponse.json(
        {
          mensaje: `La selección de esta temporada está por comenzar (en ${freeze.minutosParaInicio} min). Las compras se reabren apenas termine.`,
          codigo: "SELECCION_POR_COMENZAR",
        },
        { status: 423 }
      );
    }

    const cajas = await prisma.caja.findMany({ where: { numero: { in: numeros } } });
    if (cajas.length !== numeros.length) {
      return NextResponse.json({ mensaje: "Alguna de las membresías seleccionadas no existe." }, { status: 404 });
    }
    const noDisponibles = cajas.filter(
      (c) => !(c.estado === "DISPONIBLE" || (c.estado === "RESERVADA" && c.userId === userId))
    );
    if (noDisponibles.length > 0) {
      return NextResponse.json(
        {
          mensaje: `Las membresías ${noDisponibles.map((c) => "#" + c.numero).join(", ")} ya no están disponibles. Actualiza la página e inténtalo de nuevo.`,
        },
        { status: 409 }
      );
    }

    const total = precioCaja * numeros.length;
    if (usuarioCheck.saldoPuntos < total) {
      return NextResponse.json(
        {
          mensaje: `Saldo insuficiente. Te faltan $${(total - usuarioCheck.saldoPuntos).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP para pagar las ${numeros.length} membresías seleccionadas.`,
          codigo: "SALDO_INSUFICIENTE",
        },
        { status: 402 }
      );
    }

    const idLote = `LOTE-${userId}-${Date.now()}`;

    const compradas = await prisma.$transaction(async (tx) => {
      // Descuento atómico único por el total del lote — evita saldo negativo por condición de carrera
      const deducido = await tx.user.updateMany({
        where: { id: userId, saldoPuntos: { gte: total } },
        data: { saldoPuntos: { decrement: total } },
      });
      if (deducido.count === 0) throw new Error("SALDO_INSUFICIENTE");

      const ok: string[] = [];
      for (const numero of numeros) {
        const idCompra = `${idLote}-${numero}`;
        await tx.caja.update({
          where: { numero },
          data: { estado: "VENDIDA", userId, fechaCompra: new Date(), idCompra },
        });
        await tx.transaccion.create({
          data: {
            userId,
            tipo: "COMPRA",
            monto: -precioCaja,
            descripcion: `Compra de membresía #${numero} (pago múltiple)`,
            referencia: idCompra,
          },
        });
        ok.push(numero);
      }
      return ok;
    }).catch((err) => {
      if (err instanceof Error && err.message === "SALDO_INSUFICIENTE") return null;
      throw err;
    });

    if (!compradas) {
      return NextResponse.json(
        { mensaje: "Saldo insuficiente al momento de procesar. Intenta de nuevo.", codigo: "SALDO_INSUFICIENTE" },
        { status: 402 }
      );
    }

    // Email comprobante único con todas las membresías del lote — fire and forget
    prisma.user.findUnique({ where: { id: userId }, select: { nombre: true, correo: true } })
      .then((u) => {
        if (!u) return;
        import("@/lib/email").then(({ enviarComprobanteLote }) =>
          enviarComprobanteLote({
            correo: u.correo,
            nombre: u.nombre,
            numerosCaja: compradas,
            idLote,
            fecha: new Date(),
            precioTotal: precioCaja * compradas.length,
          }).catch((err) => console.error("Email comprobante lote error:", err))
        );
      })
      .catch(() => undefined);

    // Gift cards automáticas por umbral de membresías (propias o de la red de referidos) + notificación
    import("@/lib/giftCardsPorMembresias").then(({ emitirGiftCardsPorMembresias }) =>
      emitirGiftCardsPorMembresias({ usuarioCompradorId: userId, precioCaja })
    ).catch((err) => console.error("Gift cards por membresías error:", err));

    return NextResponse.json({
      mensaje: `¡${compradas.length} membresía${compradas.length !== 1 ? "s" : ""} pagada${compradas.length !== 1 ? "s" : ""} con tu saldo! (${compradas.map((n) => "#" + n).join(", ")}) · Referencia: ${idLote}`,
      numeros: compradas,
      referencia: idLote,
    });
  } catch (error) {
    console.error("POST comprar-lote error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
