import { NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export async function GET() {
  if (!await verificarAsistente()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");
  const conceptos = await prisma.conceptoRetencion.findMany({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ conceptos });
}
