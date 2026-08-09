import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// GET: último sorteo finalizado + estado de la temporada actual de un tier
export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const tier = req.nextUrl.searchParams.get("tier");
  if (!tier) {
    return NextResponse.json({ mensaje: "Falta el parámetro tier." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { obtenerOCrearTemporadaActual } = await import("@/lib/temporada");

  const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
  if (!tipoMembresia) {
    return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
  }

  const [sorteo, temporadaActual, vendidasActuales, reservadasActivas] = await Promise.all([
    prisma.sorteo.findFirst({
      where: { estado: { in: ["FINALIZADO", "EN_CURSO"] }, tipoMembresiaId: tipoMembresia.id },
      include: {
        premios: {
          include: { user: { select: { nombre: true, apellido: true, correo: true } } },
          orderBy: { categoria: "asc" },
        },
      },
      orderBy: { fecha: "desc" },
    }),
    obtenerOCrearTemporadaActual(prisma, tipoMembresia.id),
    prisma.caja.count({ where: { estado: "VENDIDA", tipoSorteo: "PRINCIPAL", tipoMembresiaId: tipoMembresia.id } }),
    prisma.caja.count({ where: { estado: "RESERVADA", tipoSorteo: "PRINCIPAL", tipoMembresiaId: tipoMembresia.id } }),
  ]);

  return NextResponse.json({
    sorteo,
    temporadaActual: { ...temporadaActual, vendidasActuales, reservadasActivas },
  });
}

// POST: ejecutar sorteo con N ganadores de 4 cifras, para un tier específico
export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  try {
    const body = await req.json() as { tier: string; modo: "auto" | "manual"; numeroGanador?: string };
    if (!body.tier) {
      return NextResponse.json({ mensaje: "Falta el parámetro tier." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: body.tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }

    const { ejecutarSeleccionPrincipal } = await import("@/lib/ejecutarSeleccionPrincipal");

    const resultado = await ejecutarSeleccionPrincipal({
      tipoMembresiaId: tipoMembresia.id,
      modo: body.modo,
      numeroGanador: body.numeroGanador,
    });
    if (!resultado.ok) {
      return NextResponse.json({ mensaje: resultado.mensaje }, { status: resultado.status });
    }

    return NextResponse.json({
      mensaje: "¡Selección ejecutada exitosamente!",
      sorteo: resultado.sorteo,
      resumen: resultado.resumen,
    });
  } catch (err) {
    console.error("[POST /api/admin/sorteo]", err);
    return NextResponse.json(
      { mensaje: "Error interno al ejecutar la selección. Revisa los logs del servidor." },
      { status: 500 }
    );
  }
}
