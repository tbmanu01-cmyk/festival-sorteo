import { NextResponse } from "next/server";

// Endpoint PÚBLICO (sin auth) — a pedido de los socios/usuarios, para que
// cualquiera pueda ver cuántas membresías de la temporada actual se pagaron
// con dinero real vs. cuántas se obtuvieron gratis (gift card de referidos
// o de premio de 1 cifra), y cómo eso se refleja en el fondo de premios.
export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const { obtenerOCrearTemporadaActual } = await import("@/lib/temporada");

  const [tipos, cfg] = await Promise.all([
    prisma.tipoMembresia.findMany({ where: { activo: true }, orderBy: { orden: "desc" } }),
    prisma.config.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
  ]);

  const pctFondo = (cfg.pct4Cifras ?? 0.25) + (cfg.pct3Cifras ?? 0.20) + (cfg.pct2Cifras ?? 0.15) + (cfg.pct1Cifra ?? 0);
  const pctMargen = cfg.margenGanancia ?? 0.40;

  const tiers = await Promise.all(tipos.map(async (t) => {
    const temporada = await obtenerOCrearTemporadaActual(prisma, t.id);
    const cajas = await prisma.caja.findMany({
      where: { tipoMembresiaId: t.id, estado: "VENDIDA" },
      select: { montoPagado: true },
    });

    const vendidas = cajas.length;
    const gratis = cajas.filter((c) => c.montoPagado === 0).length;
    const pagadas = cajas.filter((c) => (c.montoPagado ?? 0) > 0).length;
    const sinDato = vendidas - gratis - pagadas;
    const recaudoReal = cajas.reduce((s, c) => s + (c.montoPagado ?? 0), 0);
    const fondoPremios = recaudoReal * pctFondo;
    const margenOperacion = recaudoReal * pctMargen;

    return {
      slug: t.slug,
      nombre: t.nombre,
      precio: t.precio,
      temporadaNumero: temporada.numero,
      vendidas,
      totalCajas: 10_000,
      pagadas,
      gratis,
      sinDato,
      recaudoReal,
      fondoPremios,
      margenOperacion,
    };
  }));

  return NextResponse.json({
    tiers,
    porcentajes: {
      cuatroCifras: cfg.pct4Cifras ?? 0.25,
      tresCifras: cfg.pct3Cifras ?? 0.20,
      dosCifras: cfg.pct2Cifras ?? 0.15,
      unaCifra: cfg.pct1Cifra ?? 0,
      margen: pctMargen,
    },
  });
}
