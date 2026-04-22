import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const sorteo = await prisma.sorteo.findFirst({
    where: { estado: "FINALIZADO" },
    include: {
      premios: {
        include: {
          user: { select: { nombre: true, apellido: true, correo: true, celular: true } },
        },
        orderBy: { categoria: "asc" },
      },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ sorteo });
}
