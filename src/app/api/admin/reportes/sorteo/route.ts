import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  const { prisma } = await import("@/lib/prisma");
  const sorteos = await prisma.sorteo.findMany({
    where: { estado: "FINALIZADO" },
    include: {
      premios: {
        include: { user: { select: { nombre: true, apellido: true, correo: true, celular: true } } },
        orderBy: { categoria: "asc" },
      },
    },
    orderBy: { fecha: "desc" },
  });
  return NextResponse.json({ sorteos });
}

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  const { ids }: { ids: string[] } = await req.json();
  if (!ids?.length) return NextResponse.json({ mensaje: "Sin IDs." }, { status: 400 });
  const { prisma } = await import("@/lib/prisma");
  await prisma.premio.deleteMany({ where: { sorteoId: { in: ids } } });
  await prisma.transaccion.deleteMany({ where: { referencia: { in: ids }, tipo: "PREMIO" } });
  await prisma.sorteo.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ mensaje: "Eliminado correctamente." });
}
