import { NextRequest, NextResponse } from "next/server";

const MINUTOS_RESERVA = 15;

export async function GET(req: NextRequest) {
  const { prisma } = await import("@/lib/prisma");

  const tier = req.nextUrl.searchParams.get("tier");
  if (!tier) {
    return NextResponse.json({ mensaje: "Falta el parámetro tier." }, { status: 400 });
  }
  const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
  if (!tipoMembresia) {
    return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
  }

  // Liberar reservas expiradas
  const expiradas = new Date(Date.now() - MINUTOS_RESERVA * 60 * 1000);
  await prisma.caja.updateMany({
    where: { estado: "RESERVADA", fechaCompra: { lt: expiradas } },
    data: { estado: "DISPONIBLE", userId: null, fechaCompra: null },
  });

  const total = await prisma.caja.count({ where: { estado: "DISPONIBLE", tipoMembresiaId: tipoMembresia.id } });

  if (total === 0) {
    return NextResponse.json({ mensaje: "No hay membresías disponibles." }, { status: 404 });
  }

  const cantidadParam = Number(req.nextUrl.searchParams.get("cantidad") ?? "1");
  const cantidad = Number.isFinite(cantidadParam) ? Math.min(Math.max(Math.trunc(cantidadParam), 1), 20) : 1;

  if (cantidad > 1) {
    if (total < cantidad) {
      return NextResponse.json({ mensaje: `Solo quedan ${total} membresías disponibles.` }, { status: 404 });
    }
    // ORDER BY RANDOM() directo en Postgres — sin esto, un `take` sin orden
    // devuelve las filas en el orden del índice (tipoMembresiaId, numero),
    // es decir casi siempre los números más bajos disponibles (ej. 0000-0199),
    // nunca un muestreo real de las 10.000.
    const candidatas = await prisma.$queryRaw<{ numero: string }[]>`
      SELECT numero FROM cajas
      WHERE estado = 'DISPONIBLE'::"EstadoCaja" AND "tipoMembresiaId" = ${tipoMembresia.id}
      ORDER BY RANDOM()
      LIMIT ${cantidad}
    `;
    return NextResponse.json({ numeros: candidatas.map((c) => c.numero), disponibles: total });
  }

  const skip = Math.floor(Math.random() * total);
  const caja = await prisma.caja.findFirst({
    where: { estado: "DISPONIBLE", tipoMembresiaId: tipoMembresia.id },
    skip,
    select: { numero: true, estado: true },
  });

  if (!caja) {
    return NextResponse.json({ mensaje: "No se pudo obtener una membresía." }, { status: 404 });
  }

  return NextResponse.json({ caja, disponibles: total });
}
