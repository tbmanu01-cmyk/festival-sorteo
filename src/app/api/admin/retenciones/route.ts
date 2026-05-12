import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");
  const conceptos = await prisma.conceptoRetencion.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ conceptos });
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { nombre, porcentaje } = await req.json() as { nombre?: string; porcentaje?: number };

  if (!nombre?.trim()) {
    return NextResponse.json({ mensaje: "El nombre es obligatorio." }, { status: 400 });
  }
  const pct = Number(porcentaje);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
    return NextResponse.json({ mensaje: "El porcentaje debe estar entre 0.01 y 99.99." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const concepto = await prisma.conceptoRetencion.create({
    data: { nombre: nombre.trim(), porcentaje: pct },
  });
  return NextResponse.json({ concepto }, { status: 201 });
}
