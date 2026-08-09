import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");
  const tipos = await prisma.tipoMembresia.findMany({ orderBy: { orden: "desc" } });
  return NextResponse.json({ tipos });
}
