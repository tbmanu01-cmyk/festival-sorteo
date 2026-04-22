import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  const pagina = Math.max(1, Number(req.nextUrl.searchParams.get("pagina") ?? 1));
  const limite = 20;

  const [usuarios, total] = await Promise.all([
    prisma.user.findMany({
      where: { rol: "USER" },
      select: {
        id: true, nombre: true, apellido: true, documento: true,
        correo: true, celular: true, ciudad: true, departamento: true,
        saldoPuntos: true, activo: true, confirmado: true, fechaRegistro: true,
        _count: { select: { cajas: true } },
      },
      orderBy: { fechaRegistro: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.user.count({ where: { rol: "USER" } }),
  ]);

  return NextResponse.json({ usuarios, total, pagina, totalPaginas: Math.ceil(total / limite) });
}
