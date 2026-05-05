import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  const pagina = Math.max(1, Number(req.nextUrl.searchParams.get("pagina") ?? 1));
  const busqueda = req.nextUrl.searchParams.get("busqueda")?.trim() ?? "";
  const limite = 20;

  const filtroRol = req.nextUrl.searchParams.get("rol") as "USER" | "ADMIN" | null;

  const where = {
    ...(filtroRol && { rol: filtroRol }),
    ...(busqueda && {
      OR: [
        { nombre: { contains: busqueda, mode: "insensitive" as const } },
        { apellido: { contains: busqueda, mode: "insensitive" as const } },
        { correo: { contains: busqueda, mode: "insensitive" as const } },
        { documento: { contains: busqueda, mode: "insensitive" as const } },
      ],
    }),
  };

  const [usuarios, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, nombre: true, apellido: true, documento: true,
        correo: true, celular: true, ciudad: true, departamento: true,
        saldoPuntos: true, activo: true, confirmado: true, rol: true, fechaRegistro: true,
        _count: { select: { cajas: true } },
      },
      orderBy: { fechaRegistro: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ usuarios, total, pagina, totalPaginas: Math.ceil(total / limite) });
}
