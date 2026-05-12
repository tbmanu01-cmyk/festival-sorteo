import { NextResponse } from "next/server";

const MINUTOS_RESERVA = 15;

export async function GET() {
  const { prisma } = await import("@/lib/prisma");

  // Liberar reservas expiradas
  const expiradas = new Date(Date.now() - MINUTOS_RESERVA * 60 * 1000);
  await prisma.caja.updateMany({
    where: { estado: "RESERVADA", fechaCompra: { lt: expiradas } },
    data: { estado: "DISPONIBLE", userId: null, fechaCompra: null },
  });

  const total = await prisma.caja.count({ where: { estado: "DISPONIBLE" } });

  if (total === 0) {
    return NextResponse.json({ mensaje: "No hay membresías disponibles." }, { status: 404 });
  }

  const skip = Math.floor(Math.random() * total);
  const caja = await prisma.caja.findFirst({
    where: { estado: "DISPONIBLE" },
    skip,
    select: { numero: true, estado: true },
  });

  if (!caja) {
    return NextResponse.json({ mensaje: "No se pudo obtener una membresía." }, { status: 404 });
  }

  return NextResponse.json({ caja, disponibles: total });
}
