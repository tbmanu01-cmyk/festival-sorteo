import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const pagos = await prisma.pagoManual.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usuario: { select: { nombre: true, apellido: true, correo: true, celular: true } },
      aprobadoPor: { select: { nombre: true } },
    },
  });

  const pendientes = pagos.filter((p) => p.estado === "PENDIENTE").length;
  const aprobados = pagos.filter((p) => p.estado === "APROBADO").length;
  const rechazados = pagos.filter((p) => p.estado === "RECHAZADO").length;

  return NextResponse.json({ pagos, pendientes, aprobados, rechazados });
}
