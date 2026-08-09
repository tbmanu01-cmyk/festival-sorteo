import { NextResponse } from "next/server";

const DEFAULTS = {
  margenGanancia: 0.40,
  pct4Cifras: 0.35,
  pct3Cifras: 0.15,
  pct2Cifras: 0.10,
  qrPagoUrl: "",
  brebKey: "",
  datosBancarios: "",
  saldoGiftCardActivo: false,
};

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");

    const [config, tiposMembresiaDb] = await Promise.all([
      prisma.config.findUnique({ where: { id: "singleton" } }),
      prisma.tipoMembresia.findMany({ where: { activo: true }, orderBy: { orden: "desc" } }),
    ]);

    const tiposMembresia = await Promise.all(tiposMembresiaDb.map(async (t) => {
      const vendidas = await prisma.caja.count({ where: { tipoMembresiaId: t.id, estado: "VENDIDA" } });
      const freeze = calcularFreezeSeleccion(t.fechaSorteo);
      return {
        slug: t.slug,
        nombre: t.nombre,
        precio: t.precio,
        fechaSorteo: t.fechaSorteo,
        vendidasTotal: vendidas,
        freezeActivo: freeze.activo,
        freezeMinutos: freeze.minutosParaInicio,
      };
    }));

    // Compat: mientras no todas las páginas sean tier-aware, se exponen los
    // campos sueltos apuntando al tier "primario" (el de mayor `orden`,
    // hoy el único activo: 50k) — evita romper superficies que aún no se
    // migraron sin necesitar un segundo campo global.
    const primario = tiposMembresia[0];

    return NextResponse.json({
      ...(config ?? DEFAULTS),
      tiposMembresia,
      precioCaja: primario?.precio ?? null,
      fechaSorteo: primario?.fechaSorteo ?? null,
      vendidasTotal: primario?.vendidasTotal ?? 0,
      freezeActivo: primario?.freezeActivo ?? false,
      freezeMinutos: primario?.freezeMinutos ?? null,
    });
  } catch {
    return NextResponse.json({ ...DEFAULTS, tiposMembresia: [], vendidasTotal: 0, freezeActivo: false, freezeMinutos: null });
  }
}
