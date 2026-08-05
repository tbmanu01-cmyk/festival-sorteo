import { NextResponse } from "next/server";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");

  const ganadores = await prisma.ganadorPublico.findMany({
    orderBy: { fecha: "desc" },
    take: 50,
    include: { user: { select: { nombre: true, apellido: true, ciudad: true, avatar: true } } },
  });

  return NextResponse.json({
    ganadores: ganadores.map((g) => ({
      id: g.id,
      nombre: g.user.nombre,
      apellido: g.user.apellido,
      ciudad: g.user.ciudad,
      avatar: g.user.avatar,
      categoria: g.categoria,
      origen: g.origen,
      numeroCaja: g.numeroCaja,
      monto: g.monto,
      fecha: g.fecha,
    })),
  });
}
