import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json() as { nombre?: string; porcentaje?: number; activo?: boolean };
  const { prisma } = await import("@/lib/prisma");

  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = body.nombre.trim();
  if (body.porcentaje !== undefined) {
    const pct = Number(body.porcentaje);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      return NextResponse.json({ mensaje: "Porcentaje inválido." }, { status: 400 });
    }
    data.porcentaje = pct;
  }
  if (body.activo !== undefined) data.activo = body.activo;

  const concepto = await prisma.conceptoRetencion.update({ where: { id }, data });
  return NextResponse.json({ concepto });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  await prisma.conceptoRetencion.delete({ where: { id } });
  return NextResponse.json({ mensaje: "Eliminado." });
}
