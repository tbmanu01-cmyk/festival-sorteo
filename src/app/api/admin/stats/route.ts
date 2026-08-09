import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [tipos, usuarios, retirosPendientes] = await Promise.all([
    prisma.tipoMembresia.findMany(),
    prisma.user.count({ where: { rol: "USER" } }),
    prisma.retiro.count({ where: { estado: { in: ["PENDIENTE", "PRE_APROBADO"] } } }),
  ]);

  let vendidas = 0;
  let reservadas = 0;
  let totalRecaudo = 0;
  const totalCajas = tipos.length * 10_000;

  for (const tipo of tipos) {
    const [v, r] = await Promise.all([
      prisma.caja.count({ where: { tipoMembresiaId: tipo.id, estado: "VENDIDA" } }),
      prisma.caja.count({ where: { tipoMembresiaId: tipo.id, estado: "RESERVADA" } }),
    ]);
    vendidas += v;
    reservadas += r;
    totalRecaudo += v * tipo.precio;
  }

  const fondoPremios = totalRecaudo * 0.60;
  const gananciaEstimada = totalRecaudo * 0.40;
  const precioPromedio = vendidas > 0 ? totalRecaudo / vendidas : (tipos[0]?.precio ?? 0);

  return NextResponse.json({
    vendidas,
    reservadas,
    disponibles: totalCajas - vendidas - reservadas,
    usuarios,
    retirosPendientes,
    totalRecaudo,
    fondoPremios,
    gananciaEstimada,
    precioCaja: precioPromedio,
    porcentajeVendido: totalCajas > 0 ? ((vendidas / totalCajas) * 100).toFixed(1) : "0.0",
  });
}
