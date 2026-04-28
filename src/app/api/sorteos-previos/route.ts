import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

type SorteoPrevioRow = {
  id: string;
  granSorteoId: string;
  granSorteoNombre: string;
  nombre: string;
  premioDescripcion: string;
  premioValor: number | null;
  fechaSorteo: Date;
  cantidadGanadores: number | bigint;
  requisitos: unknown;
  estado: string;
  ganadores: unknown;
  createdAt: Date;
};

function normalizar(r: SorteoPrevioRow) {
  return {
    ...r,
    cantidadGanadores: Number(r.cantidadGanadores ?? 5),
    fechaSorteo: r.fechaSorteo instanceof Date ? r.fechaSorteo.toISOString() : r.fechaSorteo,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    requisitos: r.requisitos ?? null,
    ganadores: r.ganadores ?? null,
  };
}

// ── GET: listar (opcionalmente filtrado por granSorteoId) ──────────────────

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const filtroId = searchParams.get("granSorteoId");
    const { prisma } = await import("@/lib/prisma");

    let rows: SorteoPrevioRow[];
    if (filtroId) {
      rows = await prisma.$queryRaw<SorteoPrevioRow[]>`
        SELECT sp.id, sp."granSorteoId", gs.nombre AS "granSorteoNombre",
          sp.nombre, sp."premioDescripcion", sp."premioValor",
          sp."fechaSorteo", sp."cantidadGanadores",
          sp.requisitos, sp.estado::text,
          sp.ganadores, sp."createdAt"
        FROM sorteos_previos_gran sp
        JOIN grandes_sorteos gs ON gs.id = sp."granSorteoId"
        WHERE sp."granSorteoId" = ${filtroId}
        ORDER BY sp."fechaSorteo" ASC
      `;
    } else {
      rows = await prisma.$queryRaw<SorteoPrevioRow[]>`
        SELECT sp.id, sp."granSorteoId", gs.nombre AS "granSorteoNombre",
          sp.nombre, sp."premioDescripcion", sp."premioValor",
          sp."fechaSorteo", sp."cantidadGanadores",
          sp.requisitos, sp.estado::text,
          sp.ganadores, sp."createdAt"
        FROM sorteos_previos_gran sp
        JOIN grandes_sorteos gs ON gs.id = sp."granSorteoId"
        ORDER BY sp."fechaSorteo" ASC
      `;
    }

    return NextResponse.json({ sorteosPrevios: rows.map(normalizar) });
  } catch (err) {
    console.error("GET /api/sorteos-previos:", err);
    return NextResponse.json({ sorteosPrevios: [] });
  }
}

// ── POST: crear ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  let body: {
    granSorteoId?: string;
    nombre?: string;
    premioDescripcion?: string;
    premioValor?: number | string | null;
    fechaSorteo?: string;
    cantidadGanadores?: number | string;
    requisitos?: {
      soloVendidas?: boolean;
      minCajas?: number;
      soloEsteGranSorteo?: boolean;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  const { granSorteoId, nombre, premioDescripcion, premioValor, fechaSorteo, cantidadGanadores, requisitos } = body;

  if (!granSorteoId || !nombre?.trim() || !premioDescripcion?.trim() || !fechaSorteo) {
    return NextResponse.json(
      { mensaje: "Gran Sorteo, nombre, premio y fecha son requeridos." },
      { status: 400 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const [gs] = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM grandes_sorteos WHERE id = ${granSorteoId} LIMIT 1
    `;
    if (!gs) {
      return NextResponse.json({ mensaje: "Gran Sorteo no encontrado." }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const nombreV = nombre.trim();
    const premioDescV = premioDescripcion.trim();
    const premioValV = premioValor ? Number(premioValor) : null;
    const fechaSorteoV = new Date(fechaSorteo);
    const cantidadV = Number(cantidadGanadores ?? 5);
    const requisitosV = JSON.stringify({
      soloVendidas: requisitos?.soloVendidas !== false,
      minCajas: Number(requisitos?.minCajas ?? 0),
      soloEsteGranSorteo: requisitos?.soloEsteGranSorteo === true,
    });

    await prisma.$executeRaw`
      INSERT INTO sorteos_previos_gran (
        id, "granSorteoId", nombre,
        "premioDescripcion", "premioValor",
        "fechaSorteo", "cantidadGanadores",
        requisitos, estado, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${granSorteoId}, ${nombreV},
        ${premioDescV}, ${premioValV},
        ${fechaSorteoV}, ${cantidadV},
        ${requisitosV}::jsonb,
        'ACTIVO'::"EstadoSorteo",
        NOW(), NOW()
      )
    `;

    const [sp] = await prisma.$queryRaw<SorteoPrevioRow[]>`
      SELECT sp.id, sp."granSorteoId", gs.nombre AS "granSorteoNombre",
        sp.nombre, sp."premioDescripcion", sp."premioValor",
        sp."fechaSorteo", sp."cantidadGanadores",
        sp.requisitos, sp.estado::text,
        sp.ganadores, sp."createdAt"
      FROM sorteos_previos_gran sp
      JOIN grandes_sorteos gs ON gs.id = sp."granSorteoId"
      WHERE sp.id = ${id}
    `;

    return NextResponse.json({ sorteoPrevio: normalizar(sp) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sorteos-previos:", err);
    return NextResponse.json({ mensaje: "Error al crear el sorteo previo." }, { status: 500 });
  }
}
