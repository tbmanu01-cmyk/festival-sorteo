import { NextRequest, NextResponse } from "next/server";

const LIMITE_DEFAULT = 100;
const MINUTOS_RESERVA = 15;

export async function GET(req: NextRequest) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { searchParams } = req.nextUrl;

    const pagina = Math.max(1, Number(searchParams.get("pagina") ?? 1));
    const limite = Math.min(200, Math.max(1, Number(searchParams.get("limite") ?? LIMITE_DEFAULT)));
    const filtro = searchParams.get("filtro") ?? "todos";
    const buscar = searchParams.get("buscar")?.trim() ?? "";

    // Liberar reservas expiradas antes de consultar
    const expiradas = new Date(Date.now() - MINUTOS_RESERVA * 60 * 1000);
    await prisma.caja.updateMany({
      where: {
        estado: "RESERVADA",
        fechaCompra: { lt: expiradas },
      },
      data: {
        estado: "DISPONIBLE",
        userId: null,
        fechaCompra: null,
        idCompra: null,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (buscar) {
      where.numero = { contains: buscar };
    }

    if (filtro === "disponibles") {
      where.estado = "DISPONIBLE";
    } else if (filtro === "ocupados") {
      where.estado = { in: ["RESERVADA", "VENDIDA"] };
    }

    const [cajas, total] = await Promise.all([
      prisma.caja.findMany({
        where,
        select: { numero: true, estado: true, fechaCompra: true },
        orderBy: { numero: "asc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.caja.count({ where }),
    ]);

    return NextResponse.json({
      cajas,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      limite,
    });
  } catch (error) {
    console.error("GET /api/cajas error:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
