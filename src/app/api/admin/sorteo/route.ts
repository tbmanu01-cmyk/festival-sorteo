import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

interface CajaConUser {
  numero: string;
  userId: string | null;
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

// POST: ejecutar sorteo con N ganadores de 4 cifras
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

    const yaEjecutado = await prisma.sorteo.findFirst({ where: { estado: "FINALIZADO" } });
    if (yaEjecutado) {
      return NextResponse.json(
        { mensaje: "Ya existe un sorteo finalizado. Solo puede haber uno.", sorteo: yaEjecutado },
        { status: 409 }
      );
    }

    // Leer configuración
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = await prisma.config.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }) as any;
    const PRECIO_CAJA: number = cfg.precioCaja;
    const PCT_4: number      = cfg.pct4Cifras;
    const PCT_3: number      = cfg.pct3Cifras;
    const PCT_2: number      = cfg.pct2Cifras;
    const PCT_1: number      = cfg.pct1Cifra  ?? 0.25;
    const N: number          = cfg.ganadores4Cifras ?? 4;

    const cajasVendidas: CajaConUser[] = await prisma.caja.findMany({
      where: { estado: "VENDIDA", userId: { not: null } },
      select: { numero: true, userId: true },
    });

    if (cajasVendidas.length === 0) {
      return NextResponse.json({ mensaje: "No hay cajas vendidas para realizar el sorteo." }, { status: 400 });
    }

    const totalVendidas = cajasVendidas.length;
    const totalRecaudo  = totalVendidas * PRECIO_CAJA;
    const fondoPremios  = totalRecaudo * (PCT_4 + PCT_3 + PCT_2 + PCT_1);
    const ganancia      = totalRecaudo * cfg.margenGanancia;

    // ── Ejecutar N sorteos ────────────────────────────────────────────────

    const numerosGanadores: string[] = [];
    const numerosUsados = new Set<string>();

    function elegirAleatorio(pool: CajaConUser[]): string {
      const disponibles = pool.filter((c) => !numerosUsados.has(c.numero));
      const base = disponibles.length > 0 ? disponibles : pool;
      return base[Math.floor(Math.random() * base.length)].numero;
    }

    // Sorteos 1..N-1 — solo premio de 4 cifras
    const cantPrevios = Math.max(0, N - 1);
    for (let i = 0; i < cantPrevios; i++) {
      const num = elegirAleatorio(cajasVendidas);
      numerosUsados.add(num);
      numerosGanadores.push(num);
    }

    // Sorteo N (el último) — todos los premios; en modo manual se usa el número ingresado
    const ultimoNumero =
      modo === "manual" ? numManual! : elegirAleatorio(cajasVendidas);
    numerosUsados.add(ultimoNumero);
    numerosGanadores.push(ultimoNumero);

    // ── Calcular ganadores ────────────────────────────────────────────────

    // 4 cifras — uno por sorteo (exactamente el número sorteado)
    const all4Winners: CajaConUser[] = numerosGanadores
      .flatMap((num) => cajasVendidas.filter((c) => c.numero === num));
    const set4 = new Set(all4Winners.map((c) => c.numero));

    // 3, 2, 1 cifras — basadas en el ÚLTIMO número (sin acumulación con 4 cifras)
    const u3 = ultimoNumero.slice(-3);
    const u2 = ultimoNumero.slice(-2);
    const u1 = ultimoNumero.slice(-1);

    const g3 = cajasVendidas.filter((c) => c.numero.slice(-3) === u3 && !set4.has(c.numero));
    const set3 = new Set(g3.map((c) => c.numero));
    const g2 = cajasVendidas.filter(
      (c) => c.numero.slice(-2) === u2 && !set4.has(c.numero) && !set3.has(c.numero)
    );
    const set2 = new Set(g2.map((c) => c.numero));
    const g1 = cajasVendidas.filter(
      (c) =>
        c.numero.slice(-1) === u1 &&
        !set4.has(c.numero) &&
        !set3.has(c.numero) &&
        !set2.has(c.numero)
    );

    // ── Montos ────────────────────────────────────────────────────────────

    // Premio de 4 cifras: el fondo total de 4c se divide en N partes iguales (una por sorteo)
    const monto4PerWinner = (totalRecaudo * PCT_4) / N;
    const monto3 = g3.length > 0 ? (totalRecaudo * PCT_3) / g3.length : 0;
    const monto2 = g2.length > 0 ? (totalRecaudo * PCT_2) / g2.length : 0;
    const monto1 = g1.length > 0 ? (totalRecaudo * PCT_1) / g1.length : 0;

    // ── Transacción en BD ─────────────────────────────────────────────────

    const sorteo = await prisma.$transaction(async (tx) => {
      const nuevoSorteo = await tx.sorteo.create({
        data: {
          fecha: new Date(),
          numeroGanador: ultimoNumero,
          numerosGanadores: numerosGanadores as unknown as import("@prisma/client").Prisma.InputJsonValue,
          estado: "FINALIZADO",
          totalVendidas,
          totalRecaudo,
          ganancia,
          fondoPremios,
          configuracion: { precioCaja: PRECIO_CAJA, modo, ganadores4Cifras: N },
        },
      });

      const premiosData = [
        ...all4Winners.map((c) => ({
          sorteoId: nuevoSorteo.id,
          userId: c.userId!,
          categoria: "CUATRO_CIFRAS" as const,
          monto: monto4PerWinner,
          numeroCaja: c.numero,
        })),
        ...g3.map((c) => ({
          sorteoId: nuevoSorteo.id,
          userId: c.userId!,
          categoria: "TRES_CIFRAS" as const,
          monto: monto3,
          numeroCaja: c.numero,
        })),
        ...g2.map((c) => ({
          sorteoId: nuevoSorteo.id,
          userId: c.userId!,
          categoria: "DOS_CIFRAS" as const,
          monto: monto2,
          numeroCaja: c.numero,
        })),
        ...g1.map((c) => ({
          sorteoId: nuevoSorteo.id,
          userId: c.userId!,
          categoria: "UNA_CIFRA" as const,
          monto: monto1,
          numeroCaja: c.numero,
        })),
      ];

      if (premiosData.length > 0) {
        await tx.premio.createMany({ data: premiosData });
      }

      // Acreditar saldo
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
            descripcion: `Premio sorteo — números ganadores: ${numerosGanadores.join(", ")}`,
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

    // Emails a ganadores — fire and forget
    if (sorteoCompleto?.premios) {
      import("@/lib/email").then(({ enviarPremio }) => {
        for (const p of sorteoCompleto.premios) {
          enviarPremio({
            correo: p.user.correo,
            nombre: p.user.nombre,
            categoria: p.categoria,
            monto: p.monto,
            numeroGanador: ultimoNumero,
          }).catch((err) => console.error("Email premio error:", err));
        }
      });
    }

    return NextResponse.json({
      mensaje: "¡Sorteo ejecutado exitosamente!",
      sorteo: sorteoCompleto,
      numerosGanadores,
      resumen: {
        numerosGanadores,
        numeroGanador: ultimoNumero,
        totalVendidas,
        totalRecaudo,
        ganadores4: all4Winners.length,
        ganadores3: g3.length,
        ganadores2: g2.length,
        ganadores1: g1.length,
        monto4: monto4PerWinner,
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
