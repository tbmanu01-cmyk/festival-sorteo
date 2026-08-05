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
    pct1Cifra?: number;
    ganadores4Cifras?: number;
    membresiasPorGiftCard?: number;
    giftCardActivo?: boolean;
    fechaSorteo?: string | null;
    qrPagoUrl?: string;
    brebKey?: string;
    datosBancarios?: string;
    linkPagoBoldUrl?: string;
    tiendaActiva?: boolean;
    saldoGiftCardActivo?: boolean;
  };

  const { pct4Cifras, pct3Cifras, pct2Cifras, pct1Cifra, margenGanancia } = body;
  if (
    pct4Cifras !== undefined &&
    pct3Cifras !== undefined &&
    pct2Cifras !== undefined &&
    pct1Cifra !== undefined &&
    margenGanancia !== undefined
  ) {
    const suma = pct4Cifras + pct3Cifras + pct2Cifras + pct1Cifra + margenGanancia;
    if (Math.abs(suma - 1) > 0.001) {
      return NextResponse.json(
        { mensaje: `La suma de porcentajes debe ser 100%. Suma actual: ${(suma * 100).toFixed(1)}%` },
        { status: 400 }
      );
    }
  }

  if (body.ganadores4Cifras !== undefined) {
    const n = body.ganadores4Cifras;
    if (!Number.isInteger(n) || n < 1 || n > 4) {
      return NextResponse.json(
        { mensaje: "La cantidad de ganadores de 4 cifras debe ser un número entero entre 1 y 4." },
        { status: 400 }
      );
    }
  }

  if (body.membresiasPorGiftCard !== undefined) {
    const n = body.membresiasPorGiftCard;
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return NextResponse.json(
        { mensaje: "Las membresías por gift card deben ser un número entero entre 1 y 100." },
        { status: 400 }
      );
    }
  }

  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.config.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...body,
      fechaSorteo: body.fechaSorteo ? new Date(body.fechaSorteo) : null,
    },
    update: {
      ...body,
      fechaSorteo: body.fechaSorteo
        ? new Date(body.fechaSorteo)
        : body.fechaSorteo === null
        ? null
        : undefined,
    },
  });
  return NextResponse.json({ mensaje: "Configuración guardada.", config });
}
