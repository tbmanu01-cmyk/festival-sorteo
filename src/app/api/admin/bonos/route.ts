import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verificarAdmin() {
  const session = await getServerSession(authOptions);
  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;
  return rol === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await verificarAdmin())) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");

  const bonos = await prisma.bono.findMany({
    orderBy: { cadena: "asc" },
    include: {
      _count: { select: { compras: true } },
    },
  });

  return NextResponse.json({ bonos });
}

export async function POST(req: NextRequest) {
  if (!(await verificarAdmin())) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");

  const body = await req.json();
  const { nombre, cadena, valorFace, convenioPorc, stock, descripcion, imagen } = body;

  if (!nombre || !cadena || !valorFace || !convenioPorc || stock === undefined) {
    return NextResponse.json({ error: "Campos obligatorios faltantes" }, { status: 400 });
  }

  const convPorc = Number(convenioPorc);
  const precio = Number(valorFace) * (1 - convPorc / 100);

  const bono = await prisma.bono.create({
    data: {
      nombre,
      cadena,
      valorFace: Number(valorFace),
      convenioPorc: convPorc,
      precio,
      stock: Number(stock),
      descripcion: descripcion || null,
      imagen: imagen || null,
      activo: true,
    },
  });

  return NextResponse.json({ bono });
}
