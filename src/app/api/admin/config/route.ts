import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.config.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const body = await req.json() as {
    precioCaja?: number;
    margenGanancia?: number;
    pct4Cifras?: number;
    pct3Cifras?: number;
    pct2Cifras?: number;
    fechaSorteo?: string | null;
  };

  // Validar que los porcentajes no superen 100%
  const { pct4Cifras, pct3Cifras, pct2Cifras, margenGanancia } = body;
  if (
    pct4Cifras !== undefined &&
    pct3Cifras !== undefined &&
    pct2Cifras !== undefined &&
    margenGanancia !== undefined
  ) {
    const suma = pct4Cifras + pct3Cifras + pct2Cifras + margenGanancia;
    if (Math.abs(suma - 1) > 0.001) {
      return NextResponse.json(
        { mensaje: `La suma de porcentajes debe ser 100%. Suma actual: ${(suma * 100).toFixed(1)}%` },
        { status: 400 }
      );
    }
  }

  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.config.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...body, fechaSorteo: body.fechaSorteo ? new Date(body.fechaSorteo) : null },
    update: { ...body, fechaSorteo: body.fechaSorteo ? new Date(body.fechaSorteo) : body.fechaSorteo === null ? null : undefined },
  });
  return NextResponse.json({ mensaje: "Configuración guardada.", config });
}
