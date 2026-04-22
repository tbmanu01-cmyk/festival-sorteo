import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

const PRECIO_CAJA = 10_000;

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [vendidas, reservadas, usuarios, retirosPendientes] = await Promise.all([
    prisma.caja.count({ where: { estado: "VENDIDA" } }),
    prisma.caja.count({ where: { estado: "RESERVADA" } }),
    prisma.user.count({ where: { rol: "USER" } }),
    prisma.retiro.count({ where: { estado: "PENDIENTE" } }),
  ]);

  const totalRecaudo = vendidas * PRECIO_CAJA;
  const fondoPremios = totalRecaudo * 0.60;
  const gananciaEstimada = totalRecaudo * 0.40;

  return NextResponse.json({
    vendidas,
    reservadas,
    disponibles: 10_000 - vendidas - reservadas,
    usuarios,
    retirosPendientes,
    totalRecaudo,
    fondoPremios,
    gananciaEstimada,
    precioCaja: PRECIO_CAJA,
    porcentajeVendido: ((vendidas / 10_000) * 100).toFixed(1),
  });
}
