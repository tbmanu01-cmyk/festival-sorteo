import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const usuarios = await prisma.user.findMany({
    select: {
      nombre: true,
      apellido: true,
      documento: true,
      correo: true,
      celular: true,
      ciudad: true,
      departamento: true,
      banco: true,
      tipoCuenta: true,
      cuentaBancaria: true,
      saldoPuntos: true,
      activo: true,
      fechaRegistro: true,
      _count: { select: { cajas: true } },
    },
    orderBy: { fechaRegistro: "asc" },
  });

  return NextResponse.json({ usuarios, total: usuarios.length });
}
