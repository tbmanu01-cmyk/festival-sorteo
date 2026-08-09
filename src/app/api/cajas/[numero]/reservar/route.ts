import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MINUTOS_RESERVA = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { mensaje: "Debes iniciar sesión para reservar una membresía." },
        { status: 401 }
      );
    }

    const { numero } = await params;

    if (!/^\d{4}$/.test(numero)) {
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");
    const userId = (session.user as unknown as { id: string }).id;

    const config = await prisma.config.findUnique({ where: { id: "singleton" }, select: { fechaSorteo: true } });
    const freeze = calcularFreezeSeleccion(config?.fechaSorteo ?? null);
    if (freeze.activo) {
      return NextResponse.json(
        {
          mensaje: `La selección de esta temporada está por comenzar (en ${freeze.minutosParaInicio} min). Las reservas se reabren apenas termine.`,
          codigo: "SELECCION_POR_COMENZAR",
        },
        { status: 423 }
      );
    }

    // Liberar reservas propias expiradas
    const expiradas = new Date(Date.now() - MINUTOS_RESERVA * 60 * 1000);
    await prisma.caja.updateMany({
      where: {
        estado: "RESERVADA",
        fechaCompra: { lt: expiradas },
      },
      data: {
        estado: "DISPONIBLE",
        userId: null,
        fechaCompra: null,
        idCompra: null,
      },
    });

    const caja = await prisma.caja.findUnique({ where: { numero } });

    if (!caja) {
      return NextResponse.json({ mensaje: "Membresía no encontrada." }, { status: 404 });
    }

    if (caja.estado !== "DISPONIBLE") {
      return NextResponse.json(
        { mensaje: "Esta membresía ya está reservada o comprada. Elige otro número." },
        { status: 409 }
      );
    }

    const expira = new Date(Date.now() + MINUTOS_RESERVA * 60 * 1000);

    const cajaReservada = await prisma.caja.update({
      where: { numero },
      data: {
        estado: "RESERVADA",
        userId,
        fechaCompra: new Date(),
        idCompra: `RESERVA-${userId}-${Date.now()}`,
      },
    });

    return NextResponse.json({
      mensaje: `Membresía ${numero} reservada por ${MINUTOS_RESERVA} minutos.`,
      caja: cajaReservada,
      expira: expira.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cajas/[numero]/reservar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}

// DELETE: liberar una reserva propia antes de que expire (el usuario ya no quiere pagarla)
export async function DELETE(
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
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const userId = (session.user as unknown as { id: string }).id;

    const caja = await prisma.caja.findUnique({ where: { numero } });
    if (!caja) {
      return NextResponse.json({ mensaje: "Membresía no encontrada." }, { status: 404 });
    }
    if (caja.estado !== "RESERVADA" || caja.userId !== userId) {
      return NextResponse.json({ mensaje: "Esta membresía no está reservada por ti." }, { status: 409 });
    }

    await prisma.caja.update({
      where: { numero },
      data: { estado: "DISPONIBLE", userId: null, fechaCompra: null, idCompra: null },
    });

    return NextResponse.json({ mensaje: `Reserva de la membresía #${numero} cancelada. Queda disponible de nuevo.` });
  } catch (error) {
    console.error("DELETE /api/cajas/[numero]/reservar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
