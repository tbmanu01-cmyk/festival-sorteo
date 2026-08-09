import { NextResponse } from "next/server";

const DEFAULTS = {
  precioCaja: 10_000,
  margenGanancia: 0.40,
  pct4Cifras: 0.35,
  pct3Cifras: 0.15,
  pct2Cifras: 0.10,
  fechaSorteo: null as string | null,
  qrPagoUrl: "",
  brebKey: "",
  datosBancarios: "",
  linkPagoBoldUrl: "",
  tiendaActiva: true,
  saldoGiftCardActivo: false,
};

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { calcularFreezeSeleccion } = await import("@/lib/freezeSeleccion");
    const [config, vendidasTotal] = await Promise.all([
      prisma.config.findUnique({ where: { id: "singleton" } }),
      prisma.caja.count({ where: { estado: "VENDIDA" } }),
    ]);
    const freeze = calcularFreezeSeleccion(config?.fechaSorteo ?? null);
    return NextResponse.json({
      ...(config ?? DEFAULTS),
      vendidasTotal,
      freezeActivo: freeze.activo,
      freezeMinutos: freeze.minutosParaInicio,
    });
  } catch {
    return NextResponse.json({ ...DEFAULTS, vendidasTotal: 0, freezeActivo: false, freezeMinutos: null });
  }
}
