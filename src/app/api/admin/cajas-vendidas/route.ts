import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  const pagina = Math.max(1, Number(req.nextUrl.searchParams.get("pagina") ?? 1));
  const limite = 50;

  const filtroBase = { estado: { in: ["VENDIDA" as const, "RESERVADA" as const] }, user: { rol: "USER" as const } };

  const [cajas, total] = await Promise.all([
    prisma.caja.findMany({
      where: filtroBase,
      include: {
        user: { select: { nombre: true, apellido: true, correo: true, celular: true } },
      },
      orderBy: { fechaCompra: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.caja.count({ where: filtroBase }),
  ]);

  return NextResponse.json({ cajas, total, pagina, totalPaginas: Math.ceil(total / limite) });
}
