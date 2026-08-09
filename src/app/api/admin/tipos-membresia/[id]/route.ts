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
  const body = await req.json() as {
    precio?: number;
    activo?: boolean;
    fechaSorteo?: string | null;
    linkPagoBoldUrl?: string | null;
  };

  if (body.precio !== undefined && (!Number.isFinite(body.precio) || body.precio <= 0)) {
    return NextResponse.json({ mensaje: "El precio debe ser un número mayor a 0." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const tipo = await prisma.tipoMembresia.update({
    where: { id },
    data: {
      precio: body.precio,
      activo: body.activo,
      fechaSorteo: body.fechaSorteo !== undefined ? (body.fechaSorteo ? new Date(body.fechaSorteo) : null) : undefined,
      linkPagoBoldUrl: body.linkPagoBoldUrl !== undefined ? (body.linkPagoBoldUrl || null) : undefined,
    },
  });

  return NextResponse.json({ mensaje: "Membresía actualizada.", tipo });
}
