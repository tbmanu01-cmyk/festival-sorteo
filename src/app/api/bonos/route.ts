import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");

  const bonos = await prisma.bono.findMany({
    where: { activo: true },
    orderBy: { cadena: "asc" },
    select: {
      id: true,
      nombre: true,
      cadena: true,
      valorFace: true,
      precio: true,
      stock: true,
      descripcion: true,
      imagen: true,
    },
  });

  return NextResponse.json({ bonos });
}
