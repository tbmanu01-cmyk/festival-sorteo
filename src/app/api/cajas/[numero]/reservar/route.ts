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
        { mensaje: "Debes iniciar sesión para reservar una caja." },
        { status: 401 }
      );
    }

    const { numero } = await params;

    if (!/^\d{4}$/.test(numero)) {
      return NextResponse.json({ mensaje: "Número de caja inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const userId = (session.user as unknown as { id: string }).id;

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
      return NextResponse.json({ mensaje: "Caja no encontrada." }, { status: 404 });
    }

    if (caja.estado !== "DISPONIBLE") {
      return NextResponse.json(
        { mensaje: "Esta caja ya está reservada o vendida. Elige otro número." },
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
      mensaje: `Caja ${numero} reservada por ${MINUTOS_RESERVA} minutos.`,
      caja: cajaReservada,
      expira: expira.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cajas/[numero]/reservar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
