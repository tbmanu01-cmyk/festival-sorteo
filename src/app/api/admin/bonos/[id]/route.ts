import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verificarAdmin() {
  const session = await getServerSession(authOptions);
  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;
  return rol === "ADMIN" ? session : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verificarAdmin())) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  const body = await req.json();
  const { nombre, cadena, valorFace, convenioPorc, stock, descripcion, imagen, activo } = body;

  const hayPrecio = valorFace !== undefined || convenioPorc !== undefined;
  const vf = valorFace !== undefined ? Number(valorFace) : undefined;
  const cp = convenioPorc !== undefined ? Number(convenioPorc) : undefined;

  const bono = await prisma.bono.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(cadena !== undefined && { cadena }),
      ...(vf !== undefined && { valorFace: vf }),
      ...(cp !== undefined && { convenioPorc: cp }),
      ...(hayPrecio && vf !== undefined && cp !== undefined && { precio: vf * (1 - cp / 100) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(descripcion !== undefined && { descripcion }),
      ...(imagen !== undefined && { imagen }),
      ...(activo !== undefined && { activo }),
    },
  });

  return NextResponse.json({ bono });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verificarAdmin())) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  // Solo desactivar si tiene compras; eliminar si está limpio
  const compras = await prisma.bonoCompra.count({ where: { bonoId: id } });
  if (compras > 0) {
    await prisma.bono.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ mensaje: "Bono desactivado (tiene compras registradas)" });
  }

  await prisma.bono.delete({ where: { id } });
  return NextResponse.json({ mensaje: "Bono eliminado" });
}
