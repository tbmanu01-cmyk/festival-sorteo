import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MINUTOS_RESERVA = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tier: string; numero: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { mensaje: "Debes iniciar sesión para reservar una membresía." },
        { status: 401 }
      );
    }

    const { tier, numero } = await params;

    if (!/^\d{4}$/.test(numero)) {
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");
    const userId = (session.user as unknown as { id: string }).id;

    const usuarioCheck = await prisma.user.findUnique({ where: { id: userId }, select: { confirmado: true, rol: true } });
    if (!usuarioCheck?.confirmado && usuarioCheck?.rol !== "ADMIN") {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de reservar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }

    const freeze = calcularFreezeSeleccion(tipoMembresia.fechaSorteo);
    if (freeze.activo) {
      return NextResponse.json(
        {
          mensaje: `La selección de esta temporada está por comenzar (en ${freeze.minutosParaInicio} min). Las reservas se reabren apenas termine.`,
          codigo: "SELECCION_POR_COMENZAR",
        },
        { status: 423 }
      );
    }

    // Liberar reservas expiradas (barrido global, no depende del tier de esta operación)
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

    const caja = await prisma.caja.findUnique({
      where: { cajaTierNumero: { tipoMembresiaId: tipoMembresia.id, numero } },
    });

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

    // Update atómico con el estado como condición — si dos personas reservan
    // el mismo número casi al mismo tiempo, el chequeo de arriba (findUnique)
    // no alcanza a evitar la carrera por sí solo; count===0 significa que
    // alguien más ya la tomó entre el chequeo y este update.
    const resultado = await prisma.caja.updateMany({
      where: { tipoMembresiaId: tipoMembresia.id, numero, estado: "DISPONIBLE" },
      data: {
        estado: "RESERVADA",
        userId,
        fechaCompra: new Date(),
        idCompra: `RESERVA-${userId}-${Date.now()}`,
      },
    });

    if (resultado.count === 0) {
      return NextResponse.json(
        { mensaje: "Esta membresía ya está reservada o comprada. Elige otro número." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      mensaje: `Membresía ${numero} reservada por ${MINUTOS_RESERVA} minutos.`,
      expira: expira.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cajas/[tier]/[numero]/reservar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}

// DELETE: liberar una reserva propia antes de que expire (el usuario ya no quiere pagarla)
export async function DELETE(
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
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const userId = (session.user as unknown as { id: string }).id;

    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }

    const caja = await prisma.caja.findUnique({
      where: { cajaTierNumero: { tipoMembresiaId: tipoMembresia.id, numero } },
    });
    if (!caja) {
      return NextResponse.json({ mensaje: "Membresía no encontrada." }, { status: 404 });
    }
    if (caja.estado !== "RESERVADA" || caja.userId !== userId) {
      return NextResponse.json({ mensaje: "Esta membresía no está reservada por ti." }, { status: 409 });
    }

    const resultado = await prisma.caja.updateMany({
      where: { tipoMembresiaId: tipoMembresia.id, numero, estado: "RESERVADA", userId },
      data: { estado: "DISPONIBLE", userId: null, fechaCompra: null, idCompra: null },
    });

    if (resultado.count === 0) {
      return NextResponse.json({ mensaje: "Esta membresía no está reservada por ti." }, { status: 409 });
    }

    return NextResponse.json({ mensaje: `Reserva de la membresía #${numero} cancelada. Queda disponible de nuevo.` });
  } catch (error) {
    console.error("DELETE /api/cajas/[tier]/[numero]/reservar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
