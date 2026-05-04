import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? 1));
  const accion = searchParams.get("accion") ?? "";
  const porPagina = 50;

  const { prisma } = await import("@/lib/prisma");

  const where = accion ? { accion: { contains: accion } } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { nombre: true, apellido: true, correo: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, paginas: Math.ceil(total / porPagina) });
}
