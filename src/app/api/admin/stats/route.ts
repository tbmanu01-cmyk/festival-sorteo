import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [tipos, usuarios, retirosPendientes, cfg] = await Promise.all([
    prisma.tipoMembresia.findMany(),
    prisma.user.count({ where: { rol: "USER" } }),
    prisma.retiro.count({ where: { estado: { in: ["PENDIENTE", "PRE_APROBADO"] } } }),
    prisma.config.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
  ]);

  let vendidas = 0;
  let reservadas = 0;
  // Recaudo REAL: suma de lo efectivamente cobrado (Caja.montoPagado), no
  // "vendidas × precio de tabla" — esa cuenta asumía que toda membresía
  // vendida se pagó completa, sobreestimando el fondo cuando hay ventas
  // gratuitas (gift card de referidos o de premio de 1 cifra).
  let totalRecaudo = 0;
  const totalCajas = tipos.length * 10_000;

  for (const tipo of tipos) {
    const [v, r, sumaPagado] = await Promise.all([
      prisma.caja.count({ where: { tipoMembresiaId: tipo.id, estado: "VENDIDA" } }),
      prisma.caja.count({ where: { tipoMembresiaId: tipo.id, estado: "RESERVADA" } }),
      prisma.caja.aggregate({
        where: { tipoMembresiaId: tipo.id, estado: "VENDIDA" },
        _sum: { montoPagado: true },
      }),
    ]);
    vendidas += v;
    reservadas += r;
    totalRecaudo += sumaPagado._sum.montoPagado ?? 0;
  }

  const pctFondo = (cfg.pct4Cifras ?? 0.25) + (cfg.pct3Cifras ?? 0.20) + (cfg.pct2Cifras ?? 0.15) + (cfg.pct1Cifra ?? 0);
  const fondoPremios = totalRecaudo * pctFondo;
  const gananciaEstimada = totalRecaudo * (cfg.margenGanancia ?? 0.40);
  const precioPromedio = tipos[0]?.precio ?? 0;

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
