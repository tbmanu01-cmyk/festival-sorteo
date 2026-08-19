import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Tamaños de paquete ofrecidos en /membresias — mismo set que valida el frontend.
const TAMANOS_VALIDOS = [1, 2, 3, 4, 5, 10];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }
    const userId = (session.user as unknown as { id: string }).id;

    const body = await req.json() as { numeros?: string[]; tier?: string };
    const numeros = Array.isArray(body.numeros) ? Array.from(new Set(body.numeros)) : [];
    if (!TAMANOS_VALIDOS.includes(numeros.length)) {
      return NextResponse.json({ mensaje: `El paquete debe tener ${TAMANOS_VALIDOS.join(", ")} membresías.` }, { status: 400 });
    }
    if (!numeros.every((n) => /^\d{4}$/.test(n))) {
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }
    if (!body.tier) {
      return NextResponse.json({ mensaje: "Falta el parámetro tier." }, { status: 400 });
    }

    if (!process.env.BOLD_API_KEY || !process.env.BOLD_SECRET_KEY) {
      return NextResponse.json(
        { mensaje: "El pago con tarjeta, PSE o Nequi no está disponible en este momento. Intenta de nuevo en unos minutos o contáctanos." },
        { status: 503 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { confirmado: true, rol: true },
    });
    if (!usuario?.confirmado && usuario?.rol !== "ADMIN") {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de comprar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: body.tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }

    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");
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

    const cajas = await prisma.caja.findMany({ where: { numero: { in: numeros }, tipoMembresiaId: tipoMembresia.id } });
    if (cajas.length !== numeros.length) {
      return NextResponse.json({ mensaje: "Alguna de las membresías del paquete no existe." }, { status: 404 });
    }
    const noDisponibles = cajas.filter(
      (c) => !(c.estado === "DISPONIBLE" || (c.estado === "RESERVADA" && c.userId === userId))
    );
    if (noDisponibles.length > 0) {
      return NextResponse.json(
        { mensaje: `Las membresías ${noDisponibles.map((c) => "#" + c.numero).join(", ")} ya no están disponibles. Vuelve a armar tu paquete.` },
        { status: 409 }
      );
    }

    const monto = tipoMembresia.precio * numeros.length;
    const moneda = "COP";
    const orderId = `LOTE${numeros[0]}-${Date.now().toString(36).toUpperCase()}`;

    await prisma.pagoBold.create({
      data: {
        orderId,
        usuarioId: userId,
        numeroCaja: numeros[0],
        numerosCaja: numeros,
        tipoMembresiaId: tipoMembresia.id,
        monto,
        moneda,
      },
    });

    const { generarFirmaBold } = await import("@/lib/bold");
    const signature = generarFirmaBold(orderId, monto, moneda);

    return NextResponse.json({
      apiKey: process.env.BOLD_API_KEY,
      orderId,
      amount: monto,
      currency: moneda,
      signature,
    });
  } catch (error) {
    console.error("POST /api/pagos/bold/firma-lote error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
