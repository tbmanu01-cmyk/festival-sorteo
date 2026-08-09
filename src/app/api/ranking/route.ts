import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { prisma } = await import("@/lib/prisma");

  const tier = req.nextUrl.searchParams.get("tier");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (tier === "otros") {
    where.origen = { not: "Selección principal" };
  } else if (tier) {
    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }
    where.tipoMembresiaId = tipoMembresia.id;
    where.origen = "Selección principal";
  }

  const ganadores = await prisma.ganadorPublico.findMany({
    where,
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
