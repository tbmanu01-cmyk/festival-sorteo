import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  type SpRow = {
    id: string;
    granSorteoId: string;
    nombre: string;
    premioDescripcion: string;
    premioValor: number | null;
    cantidadGanadores: number | bigint;
    requisitos: unknown;
    estado: string;
  };

  const [sp] = await prisma.$queryRaw<SpRow[]>`
    SELECT id, "granSorteoId", nombre, "premioDescripcion", "premioValor",
           "cantidadGanadores", requisitos, estado::text
    FROM sorteos_previos_gran WHERE id = ${id} LIMIT 1
  `;

  if (!sp) {
    return NextResponse.json({ mensaje: "Sorteo previo no encontrado." }, { status: 404 });
  }
  if (sp.estado === "FINALIZADO") {
    return NextResponse.json({ mensaje: "Este sorteo ya fue ejecutado." }, { status: 409 });
  }

  const req_ = sp.requisitos as {
    soloVendidas?: boolean;
    minCajas?: number;
    soloEsteGranSorteo?: boolean;
  } | null ?? {};

  const soloVendidas = req_.soloVendidas !== false;
  const minCajas = Number(req_.minCajas ?? 0);
  const soloEsteGranSorteo = req_.soloEsteGranSorteo === true;
  const cantidadGanadores = Number(sp.cantidadGanadores ?? 5);

  // Filtrar usuarios elegibles por minCajas
  let usuariosElegibles: Set<string> | null = null;
  if (minCajas > 0) {
    type URow = { userId: string };
    const ueRows = await prisma.$queryRaw<URow[]>`
      SELECT "userId" FROM cajas
      WHERE estado = 'VENDIDA' AND "userId" IS NOT NULL
      GROUP BY "userId"
      HAVING COUNT(*) >= ${minCajas}
    `;
    usuariosElegibles = new Set(ueRows.map((r) => r.userId));
    if (usuariosElegibles.size === 0) {
      return NextResponse.json(
        { mensaje: `No hay usuarios con ${minCajas}+ cajas para este sorteo.` },
        { status: 400 }
      );
    }
  }

  type CajaRow = {
    id: string;
    numero: string;
    userId: string;
    nombre: string;
    apellido: string;
    correo: string;
  };

  let cajas: CajaRow[];

  if (soloEsteGranSorteo) {
    if (soloVendidas) {
      cajas = await prisma.$queryRaw<CajaRow[]>`
        SELECT c.id, c.numero, c."userId",
               u.nombre, u.apellido, u.correo
        FROM cajas c
        JOIN users u ON u.id = c."userId"
        WHERE c."granSorteoId" = ${sp.granSorteoId}
          AND c.estado = 'VENDIDA'
          AND c."userId" IS NOT NULL
      `;
    } else {
      cajas = await prisma.$queryRaw<CajaRow[]>`
        SELECT c.id, c.numero, c."userId",
               u.nombre, u.apellido, u.correo
        FROM cajas c
        JOIN users u ON u.id = c."userId"
        WHERE c."granSorteoId" = ${sp.granSorteoId}
          AND c.estado IN ('VENDIDA', 'RESERVADA')
          AND c."userId" IS NOT NULL
      `;
    }
  } else {
    if (soloVendidas) {
      cajas = await prisma.$queryRaw<CajaRow[]>`
        SELECT c.id, c.numero, c."userId",
               u.nombre, u.apellido, u.correo
        FROM cajas c
        JOIN users u ON u.id = c."userId"
        WHERE c.estado = 'VENDIDA' AND c."userId" IS NOT NULL
      `;
    } else {
      cajas = await prisma.$queryRaw<CajaRow[]>`
        SELECT c.id, c.numero, c."userId",
               u.nombre, u.apellido, u.correo
        FROM cajas c
        JOIN users u ON u.id = c."userId"
        WHERE c.estado IN ('VENDIDA', 'RESERVADA') AND c."userId" IS NOT NULL
      `;
    }
  }

  const cajasFiltradas = usuariosElegibles
    ? cajas.filter((c) => usuariosElegibles!.has(c.userId))
    : cajas;

  if (cajasFiltradas.length === 0) {
    return NextResponse.json(
      { mensaje: "No hay cajas elegibles para ejecutar este sorteo." },
      { status: 400 }
    );
  }

  const mezcladas = [...cajasFiltradas].sort(() => Math.random() - 0.5);
  const cantidad = Math.min(cantidadGanadores, mezcladas.length);
  const seleccionados: typeof mezcladas = [];
  const usuariosYa = new Set<string>();

  for (const caja of mezcladas) {
    if (seleccionados.length >= cantidad) break;
    if (!usuariosYa.has(caja.userId)) {
      seleccionados.push(caja);
      usuariosYa.add(caja.userId);
    }
  }
  if (seleccionados.length < cantidad) {
    for (const caja of mezcladas) {
      if (seleccionados.length >= cantidad) break;
      if (!seleccionados.includes(caja)) seleccionados.push(caja);
    }
  }

  const ganadores = seleccionados.map((c) => ({
    userId: c.userId,
    nombre: c.nombre,
    apellido: c.apellido,
    correo: c.correo,
    numeroCaja: c.numero,
  }));

  await prisma.$executeRaw`
    UPDATE sorteos_previos_gran
    SET estado = 'FINALIZADO'::"EstadoSorteo",
        ganadores = ${JSON.stringify(ganadores)}::jsonb,
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({
    mensaje: "¡Sorteo previo ejecutado exitosamente!",
    ganadores,
  });
}
