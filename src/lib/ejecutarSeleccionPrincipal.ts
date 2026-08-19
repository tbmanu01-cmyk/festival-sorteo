// Lógica compartida para ejecutar la selección principal — usada tanto por
// el botón manual del admin (/api/admin/sorteo) como por el cron automático
// (/api/cron/sorteo-automatico). Reparte premios, notifica a los ganadores
// (campanita + correo) y cierra/abre la temporada reseteando las membresías.

interface CajaConUser {
  numero: string;
  userId: string | null;
  montoPagado: number | null;
}

type Resultado =
  | { ok: true; sorteo: unknown; resumen: Record<string, unknown> }
  | { ok: false; status: number; mensaje: string };

export async function ejecutarSeleccionPrincipal(opts: {
  tipoMembresiaId: string;
  modo: "auto" | "manual";
  numeroGanador?: string;
}): Promise<Resultado> {
  const { tipoMembresiaId, modo, numeroGanador: numManual } = opts;

  if (modo === "manual" && (!numManual || !/^\d{4}$/.test(numManual))) {
    return { ok: false, status: 400, mensaje: "El número ganador debe ser de 4 dígitos." };
  }

  const { prisma } = await import("@/lib/prisma");
  const { obtenerOCrearTemporadaActual } = await import("@/lib/temporada");
  const { crearNotificacion } = await import("@/lib/notificaciones");

  const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { id: tipoMembresiaId } });
  if (!tipoMembresia) {
    return { ok: false, status: 404, mensaje: "Tipo de membresía no encontrado." };
  }

  const temporadaActual = await obtenerOCrearTemporadaActual(prisma, tipoMembresiaId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = await prisma.config.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }) as any;
  const PRECIO_CAJA: number = tipoMembresia.precio;
  const PCT_4: number      = cfg.pct4Cifras;
  const PCT_3: number      = cfg.pct3Cifras;
  const PCT_2: number      = cfg.pct2Cifras;
  const PCT_1: number      = cfg.pct1Cifra  ?? 0.25;
  const N: number          = cfg.ganadores4Cifras ?? 4;

  const cajasVendidas: CajaConUser[] = await prisma.caja.findMany({
    where: { estado: "VENDIDA", userId: { not: null }, tipoSorteo: "PRINCIPAL", tipoMembresiaId },
    select: { numero: true, userId: true, montoPagado: true },
  });

  if (cajasVendidas.length === 0) {
    return { ok: false, status: 400, mensaje: `No hay membresías ${tipoMembresia.nombre} vendidas para realizar la selección.` };
  }

  const totalVendidas = cajasVendidas.length;
  const totalRecaudo  = totalVendidas * PRECIO_CAJA;
  const fondoPremios  = totalRecaudo * (PCT_4 + PCT_3 + PCT_2 + PCT_1);
  const ganancia      = totalRecaudo * cfg.margenGanancia;

  const numerosGanadores: string[] = [];
  const numerosUsados = new Set<string>();

  function elegirAleatorio(pool: CajaConUser[]): string {
    const disponibles = pool.filter((c) => !numerosUsados.has(c.numero));
    const base = disponibles.length > 0 ? disponibles : pool;
    return base[Math.floor(Math.random() * base.length)].numero;
  }

  const cantPrevios = Math.max(0, N - 1);
  for (let i = 0; i < cantPrevios; i++) {
    const num = elegirAleatorio(cajasVendidas);
    numerosUsados.add(num);
    numerosGanadores.push(num);
  }

  const ultimoNumero = modo === "manual" ? numManual! : elegirAleatorio(cajasVendidas);
  numerosUsados.add(ultimoNumero);
  numerosGanadores.push(ultimoNumero);

  const all4Winners: CajaConUser[] = numerosGanadores
    .flatMap((num) => cajasVendidas.filter((c) => c.numero === num));
  const set4 = new Set(all4Winners.map((c) => c.numero));

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

  const fondo4 = totalRecaudo * PCT_4;
  const monto4Early = N > 1 ? fondo4 / (N + 1)       : fondo4;
  const monto4Last  = N > 1 ? (2 * fondo4) / (N + 1) : fondo4;

  const monto3 = g3.length > 0 ? (totalRecaudo * PCT_3) / g3.length : 0;
  const monto2 = g2.length > 0 ? (totalRecaudo * PCT_2) / g2.length : 0;
  const monto1 = g1.length > 0 ? (totalRecaudo * PCT_1) / g1.length : 0;

  const NOMBRE_CAT: Record<string, string> = {
    CUATRO_CIFRAS: "4 Cifras",
    TRES_CIFRAS: "3 Cifras",
    DOS_CIFRAS: "2 Cifras",
    UNA_CIFRA: "1 Cifra",
  };

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
        temporadaId: temporadaActual.id,
        tipoMembresiaId,
      },
    });

    const premiosData = [
      ...all4Winners.map((c, i) => ({
        sorteoId: nuevoSorteo.id,
        userId: c.userId!,
        categoria: "CUATRO_CIFRAS" as const,
        monto: i === all4Winners.length - 1 ? monto4Last : monto4Early,
        numeroCaja: c.numero,
        montoPagadoCaja: c.montoPagado,
      })),
      ...g3.map((c) => ({
        sorteoId: nuevoSorteo.id,
        userId: c.userId!,
        categoria: "TRES_CIFRAS" as const,
        monto: monto3,
        numeroCaja: c.numero,
        montoPagadoCaja: c.montoPagado,
      })),
      ...g2.map((c) => ({
        sorteoId: nuevoSorteo.id,
        userId: c.userId!,
        categoria: "DOS_CIFRAS" as const,
        monto: monto2,
        numeroCaja: c.numero,
        montoPagadoCaja: c.montoPagado,
      })),
      ...g1.map((c) => ({
        sorteoId: nuevoSorteo.id,
        userId: c.userId!,
        categoria: "UNA_CIFRA" as const,
        monto: monto1,
        numeroCaja: c.numero,
        montoPagadoCaja: c.montoPagado,
      })),
    ];

    if (premiosData.length > 0) {
      await tx.premio.createMany({ data: premiosData });

      await tx.ganadorPublico.createMany({
        data: premiosData.map((p) => ({
          userId: p.userId,
          numeroCaja: p.numeroCaja,
          monto: p.monto,
          categoria: NOMBRE_CAT[p.categoria],
          origen: "Selección principal",
          temporadaId: temporadaActual.id,
          tipoMembresiaId,
        })),
      });
    }

    const otorgaMembresia1Cifra = PCT_1 === 0;
    const unaCifraUserIds = otorgaMembresia1Cifra ? new Set(g1.map((c) => c.userId!)) : new Set<string>();

    const saldosPorUsuario = new Map<string, number>();
    for (const p of premiosData) {
      if (unaCifraUserIds.has(p.userId) && p.categoria === "UNA_CIFRA") continue;
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
          descripcion: `Premio selección aleatoria — números ganadores: ${numerosGanadores.join(", ")}`,
          referencia: nuevoSorteo.id,
        },
      });
    }

    if (otorgaMembresia1Cifra) {
      for (const c of g1) {
        const gcCodigo = `GC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        await tx.giftCard.create({
          data: {
            codigo: gcCodigo,
            valor: PRECIO_CAJA,
            propietarioId: c.userId!,
            nota: `Premio 1 cifra selección ${nuevoSorteo.id} — membresía #${c.numero}`,
          },
        });
      }
    }

    // Campanita para cada ganador — una notificación personal por premio
    for (const p of premiosData) {
      const esGiftCard1Cifra = otorgaMembresia1Cifra && p.categoria === "UNA_CIFRA";
      await crearNotificacion(tx, {
        tipo: "SORTEO",
        titulo: "¡Ganaste en la selección aleatoria!",
        cuerpo: esGiftCard1Cifra
          ? `Tu membresía #${p.numeroCaja} ganó en la categoría ${NOMBRE_CAT[p.categoria]} — recibiste una gift card por el valor de una membresía.`
          : `Tu membresía #${p.numeroCaja} ganó en la categoría ${NOMBRE_CAT[p.categoria]} — $${p.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP acreditados a tu saldo.`,
        usuarioId: p.userId,
      });
    }

    // Cierra la temporada actual con el snapshot de sus resultados y abre
    // la siguiente — el pool de 10,000 membresías de ESTE tier vuelve a
    // DISPONIBLE de inmediato para que arranque la nueva temporada. Los
    // otros tiers no se tocan.
    await tx.temporada.update({
      where: { id: temporadaActual.id },
      data: { fin: new Date(), totalVendidas, totalRecaudo, fondoPremios, ganancia },
    });
    await tx.temporada.create({ data: { tipoMembresiaId, numero: temporadaActual.numero + 1 } });
    await tx.caja.updateMany({
      where: { tipoSorteo: "PRINCIPAL", tipoMembresiaId },
      data: { estado: "DISPONIBLE", userId: null, fechaCompra: null, idCompra: null },
    });

    // Freeze total de retiros hasta el siguiente día hábil — le da al admin
    // el fin de semana para conciliar antes de que se muevan los primeros
    // retiros de la temporada nueva.
    const { calcularProximoDiaHabil } = await import("@/lib/retirosFreeze");
    await tx.config.update({
      where: { id: "singleton" },
      data: { retirosDisponiblesDesde: calcularProximoDiaHabil(new Date()) },
    });

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
    import("@/lib/email").then(async ({ enviarPremio, enviarPremioGiftCard }) => {
      const gcPor1Cifra = new Map<string, { codigo: string; valor: number }>();
      if (PCT_1 === 0) {
        for (const p of sorteoCompleto.premios.filter((p) => p.categoria === "UNA_CIFRA")) {
          const gc = await prisma.giftCard.findFirst({
            where: { propietarioId: p.userId, nota: { contains: sorteo.id } },
            orderBy: { creadaEn: "desc" },
          });
          if (gc) gcPor1Cifra.set(p.userId, { codigo: gc.codigo, valor: gc.valor });
        }
      }

      for (const p of sorteoCompleto.premios) {
        if (p.categoria === "UNA_CIFRA" && PCT_1 === 0) {
          const gc = gcPor1Cifra.get(p.userId);
          if (gc) {
            enviarPremioGiftCard({
              correo: p.user.correo,
              nombre: p.user.nombre,
              codigoGiftCard: gc.codigo,
              valorGiftCard: gc.valor,
              numeroGanador: ultimoNumero,
            }).catch((err) => console.error("Email gift card 1 cifra error:", err));
          }
        } else {
          enviarPremio({
            correo: p.user.correo,
            nombre: p.user.nombre,
            categoria: p.categoria,
            monto: p.monto,
            numeroGanador: ultimoNumero,
          }).catch((err) => console.error("Email premio error:", err));
        }
      }
    });
  }

  return {
    ok: true,
    sorteo: sorteoCompleto,
    resumen: {
      tipoMembresiaId,
      tipoMembresiaSlug: tipoMembresia.slug,
      numerosGanadores,
      numeroGanador: ultimoNumero,
      totalVendidas,
      totalRecaudo,
      ganadores4: all4Winners.length,
      ganadores3: g3.length,
      ganadores2: g2.length,
      ganadores1: g1.length,
      monto4Early,
      monto4Last,
      monto3,
      monto2,
      monto1,
    },
  };
}
