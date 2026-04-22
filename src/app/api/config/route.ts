import { NextResponse } from "next/server";

const DEFAULTS = {
  precioCaja: 10_000,
  margenGanancia: 0.40,
  pct4Cifras: 0.35,
  pct3Cifras: 0.15,
  pct2Cifras: 0.10,
  fechaSorteo: null as string | null,
};

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(config ?? DEFAULTS);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
