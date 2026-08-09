import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// GET: último sorteo finalizado + estado de la temporada actual
export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { obtenerOCrearTemporadaActual } = await import("@/lib/temporada");

  const [sorteo, temporadaActual, vendidasActuales, reservadasActivas] = await Promise.all([
    prisma.sorteo.findFirst({
      where: { estado: { in: ["FINALIZADO", "EN_CURSO"] } },
      include: {
        premios: {
          include: { user: { select: { nombre: true, apellido: true, correo: true } } },
          orderBy: { categoria: "asc" },
        },
      },
      orderBy: { fecha: "desc" },
    }),
    obtenerOCrearTemporadaActual(prisma),
    prisma.caja.count({ where: { estado: "VENDIDA", tipoSorteo: "PRINCIPAL" } }),
    prisma.caja.count({ where: { estado: "RESERVADA", tipoSorteo: "PRINCIPAL" } }),
  ]);

  return NextResponse.json({
    sorteo,
    temporadaActual: { ...temporadaActual, vendidasActuales, reservadasActivas },
  });
}

// POST: ejecutar sorteo con N ganadores de 4 cifras
export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  try {
    const body = await req.json() as { modo: "auto" | "manual"; numeroGanador?: string };
    const { ejecutarSeleccionPrincipal } = await import("@/lib/ejecutarSeleccionPrincipal");

    const resultado = await ejecutarSeleccionPrincipal(body);
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
