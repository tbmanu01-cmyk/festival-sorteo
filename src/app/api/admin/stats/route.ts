import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [cfg, vendidas, reservadas, usuarios, retirosPendientes] = await Promise.all([
    prisma.config.findUnique({ where: { id: "singleton" } }),
    prisma.caja.count({ where: { estado: "VENDIDA" } }),
    prisma.caja.count({ where: { estado: "RESERVADA" } }),
    prisma.user.count({ where: { rol: "USER" } }),
    prisma.retiro.count({ where: { estado: "PENDIENTE" } }),
  ]);

  const precioCaja = cfg?.precioCaja ?? 50_000;
  const totalRecaudo = vendidas * precioCaja;
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
    precioCaja,
    porcentajeVendido: ((vendidas / 10_000) * 100).toFixed(1),
  });
}
