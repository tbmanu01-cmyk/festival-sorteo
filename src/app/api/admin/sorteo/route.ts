import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

interface CajaConUser {
  numero: string;
  userId: string | null;
}

function calcularGanadores(numeroGanador: string, cajas: CajaConUser[]) {
  const u4 = numeroGanador;
  const u3 = numeroGanador.slice(-3);
  const u2 = numeroGanador.slice(-2);
  const u1 = numeroGanador.slice(-1);

  const g4 = cajas.filter((c) => c.numero === u4);
  const set4 = new Set(g4.map((c) => c.numero));

  const g3 = cajas.filter((c) => c.numero.slice(-3) === u3 && !set4.has(c.numero));
  const set3 = new Set(g3.map((c) => c.numero));

  const g2 = cajas.filter(
    (c) => c.numero.slice(-2) === u2 && !set4.has(c.numero) && !set3.has(c.numero)
  );
  const set2 = new Set(g2.map((c) => c.numero));

  const g1 = cajas.filter(
    (c) =>
      c.numero.slice(-1) === u1 &&
      !set4.has(c.numero) &&
      !set3.has(c.numero) &&
      !set2.has(c.numero)
  );

  return { g4, g3, g2, g1 };
}

// GET: último sorteo finalizado
export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");

  const sorteo = await prisma.sorteo.findFirst({
    where: { estado: { in: ["FINALIZADO", "EN_CURSO"] } },
    include: {
      premios: {
        include: { user: { select: { nombre: true, apellido: true, correo: true } } },
        orderBy: { categoria: "asc" },
      },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ sorteo });
}

// POST: ejecutar sorteo
export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  try {
  const body = await req.json() as { modo: "auto" | "manual"; numeroGanador?: string };
  const { modo, numeroGanador: numManual } = body;

  if (modo === "manual") {
    if (!numManual || !/^\d{4}$/.test(numManual)) {
      return NextResponse.json({ mensaje: "El número ganador debe ser de 4 dígitos." }, { status: 400 });
    }
  }

  const { prisma } = await import("@/lib/prisma");

  // Verificar que no haya sorteo finalizado reciente (protección doble ejecución)
  const yaEjecutado = await prisma.sorteo.findFirst({ where: { estado: "FINALIZADO" } });
  if (yaEjecutado) {
    return NextResponse.json(
      { mensaje: "Ya existe un sorteo finalizado. Solo puede haber uno.", sorteo: yaEjecutado },
      { status: 409 }
    );
  }

  // Leer configuración activa
  const cfg = await prisma.config.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const PRECIO_CAJA = cfg.precioCaja;
  const PCT_4 = cfg.pct4Cifras;
  const PCT_3 = cfg.pct3Cifras;
  const PCT_2 = cfg.pct2Cifras;

  // Obtener todas las cajas vendidas con sus dueños
  const cajasVendidas = await prisma.caja.findMany({
    where: { estado: "VENDIDA", userId: { not: null } },
    select: { numero: true, userId: true },
  });

  if (cajasVendidas.length === 0) {
    return NextResponse.json({ mensaje: "No hay cajas vendidas para realizar el sorteo." }, { status: 400 });
  }

  // Determinar número ganador
  const numeroGanador =
    modo === "auto"
      ? cajasVendidas[Math.floor(Math.random() * cajasVendidas.length)].numero
      : numManual!;

  const totalVendidas = cajasVendidas.length;
  const totalRecaudo = totalVendidas * PRECIO_CAJA;
  const fondoPremios = totalRecaudo * (PCT_4 + PCT_3 + PCT_2);
  const ganancia = totalRecaudo * cfg.margenGanancia;

  const { g4, g3, g2, g1 } = calcularGanadores(numeroGanador, cajasVendidas);

  // Calcular montos por categoría
  const monto4 = g4.length > 0 ? (totalRecaudo * PCT_4) / g4.length : 0;
  const monto3 = g3.length > 0 ? (totalRecaudo * PCT_3) / g3.length : 0;
  const monto2 = g2.length > 0 ? (totalRecaudo * PCT_2) / g2.length : 0;
  const monto1 = PRECIO_CAJA; // devolución fija

  // Crear sorteo + premios en transacción
  const sorteo = await prisma.$transaction(async (tx) => {
    const nuevoSorteo = await tx.sorteo.create({
      data: {
        fecha: new Date(),
        numeroGanador,
        estado: "FINALIZADO",
        totalVendidas,
        totalRecaudo,
        ganancia,
        fondoPremios,
        configuracion: { precioCaja: PRECIO_CAJA, modo },
      },
    });

    const premiosData = [
      ...g4.map((c) => ({ sorteoId: nuevoSorteo.id, userId: c.userId!, categoria: "CUATRO_CIFRAS" as const, monto: monto4 })),
      ...g3.map((c) => ({ sorteoId: nuevoSorteo.id, userId: c.userId!, categoria: "TRES_CIFRAS" as const, monto: monto3 })),
      ...g2.map((c) => ({ sorteoId: nuevoSorteo.id, userId: c.userId!, categoria: "DOS_CIFRAS" as const, monto: monto2 })),
      ...g1.map((c) => ({ sorteoId: nuevoSorteo.id, userId: c.userId!, categoria: "UNA_CIFRA" as const, monto: monto1 })),
    ];

    if (premiosData.length > 0) {
      await tx.premio.createMany({ data: premiosData });
    }

    // Acreditar saldo a ganadores
    const saldosPorUsuario = new Map<string, number>();
    for (const p of premiosData) {
      saldosPorUsuario.set(p.userId, (saldosPorUsuario.get(p.userId) ?? 0) + p.monto);
    }

    for (const [userId, monto] of saldosPorUsuario) {
      await tx.user.update({
        where: { id: userId },
        data: { saldoPuntos: { increment: monto } },
      });
      await tx.transaccion.create({
        data: {
          userId,
          tipo: "PREMIO",
          monto,
          descripcion: `Premio sorteo — número ganador: ${numeroGanador}`,
          referencia: nuevoSorteo.id,
        },
      });
    }

    return nuevoSorteo;
  }, { timeout: 30_000 });

  const sorteoCompleto = await prisma.sorteo.findUnique({
    where: { id: sorteo.id },
    include: {
      premios: {
        include: { user: { select: { nombre: true, apellido: true, correo: true } } },
        orderBy: { categoria: "asc" },
      },
    },
  });

  // Enviar emails a ganadores — fire and forget
  if (sorteoCompleto?.premios) {
    import("@/lib/email").then(({ enviarPremio }) => {
      for (const p of sorteoCompleto.premios) {
        enviarPremio({
          correo: p.user.correo,
          nombre: p.user.nombre,
          categoria: p.categoria,
          monto: p.monto,
          numeroGanador,
        }).catch((err) => console.error("Email premio error:", err));
      }
    });
  }

  return NextResponse.json({
    mensaje: "¡Sorteo ejecutado exitosamente!",
    sorteo: sorteoCompleto,
    resumen: {
      numeroGanador,
      totalVendidas,
      totalRecaudo,
      ganadores4: g4.length,
      ganadores3: g3.length,
      ganadores2: g2.length,
      ganadores1: g1.length,
      monto4,
      monto3,
      monto2,
      monto1,
    },
  });
  } catch (err) {
    console.error("[POST /api/admin/sorteo]", err);
    return NextResponse.json(
      { mensaje: "Error interno al ejecutar el sorteo. Revisa los logs del servidor." },
      { status: 500 }
    );
  }
}

// DELETE: reiniciar sorteo (solo para pruebas)
export async function DELETE() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.premio.deleteMany();
  await prisma.sorteo.deleteMany();

  return NextResponse.json({ mensaje: "Sorteos eliminados. Puedes ejecutar uno nuevo." });
}
