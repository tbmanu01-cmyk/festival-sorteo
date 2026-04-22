import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const retiros = await prisma.retiro.findMany({
    where: { estado: "PENDIENTE" },
    include: {
      user: { select: { nombre: true, apellido: true, correo: true, celular: true, banco: true } },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ retiros });
}
