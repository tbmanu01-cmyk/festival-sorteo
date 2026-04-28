import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

type GranSorteoRow = {
  id: string;
  nombre: string;
  descripcion: string;
  premioDescripcion: string;
  valorCaja: number;
  fechaInicio: Date;
  fechaSorteo: Date;
  numeroGanador: string | null;
  estado: string;
  recaudo: number | bigint;
  fondoPremios: number | bigint;
  ganancia: number | bigint;
  createdAt: Date;
  participantes: number | bigint;
  ganadorNombre: string | null;
  ganadorApellido: string | null;
  ganadorCorreo: string | null;
};

function normalizar(r: GranSorteoRow) {
  return {
    ...r,
    recaudo: Number(r.recaudo ?? 0),
    fondoPremios: Number(r.fondoPremios ?? 0),
    ganancia: Number(r.ganancia ?? 0),
    participantes: Number(r.participantes ?? 0),
    fechaInicio: r.fechaInicio instanceof Date ? r.fechaInicio.toISOString() : r.fechaInicio,
    fechaSorteo: r.fechaSorteo instanceof Date ? r.fechaSorteo.toISOString() : r.fechaSorteo,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

// ── GET: listar todos ──────────────────────────────────────────────────────

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRaw<GranSorteoRow[]>`
      SELECT
        gs.id, gs.nombre, gs.descripcion,
        gs."premioDescripcion", gs."valorCaja",
        gs."fechaInicio", gs."fechaSorteo",
        gs."numeroGanador",
        gs.estado::text,
        gs.recaudo, gs."fondoPremios", gs.ganancia,
        gs."createdAt",
        COUNT(c.id) FILTER (WHERE c.estado = 'VENDIDA') AS participantes,
        w.nombre AS "ganadorNombre",
        w.apellido AS "ganadorApellido",
        w.correo AS "ganadorCorreo"
      FROM grandes_sorteos gs
      LEFT JOIN cajas c ON c."granSorteoId" = gs.id
      LEFT JOIN cajas wc
        ON wc.numero = gs."numeroGanador"
        AND wc."granSorteoId" = gs.id
      LEFT JOIN users w ON w.id = wc."userId"
      GROUP BY gs.id, w.nombre, w.apellido, w.correo
      ORDER BY gs."createdAt" DESC
    `;
    return NextResponse.json({ granSorteos: rows.map(normalizar) });
  } catch (err) {
    console.error("GET /api/gran-sorteos:", err);
    return NextResponse.json({ granSorteos: [] });
  }
}

// ── POST: crear ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  let body: {
    nombre?: string;
    descripcion?: string;
    premioDescripcion?: string;
    valorCaja?: number | string;
    fechaInicio?: string;
    fechaSorteo?: string;
    estado?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  const { nombre, descripcion, premioDescripcion, valorCaja, fechaInicio, fechaSorteo, estado } = body;

  if (!nombre?.trim() || !premioDescripcion?.trim() || !valorCaja || !fechaInicio || !fechaSorteo) {
    return NextResponse.json(
      { mensaje: "Nombre, premio, valor por caja, fecha inicio y fecha sorteo son requeridos." },
      { status: 400 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const id = crypto.randomUUID();
    const estadoV = (estado === "ACTIVO" ? "ACTIVO" : "PENDIENTE") as string;
    const nombreV = nombre.trim();
    const descV = descripcion?.trim() || "";
    const premioDescV = premioDescripcion.trim();
    const valorCajaV = Number(valorCaja);
    const fechaInicioV = new Date(fechaInicio);
    const fechaSorteoV = new Date(fechaSorteo);

    await prisma.$executeRaw`
      INSERT INTO grandes_sorteos (
        id, nombre, descripcion, "premioDescripcion", "valorCaja",
        "fechaInicio", "fechaSorteo", estado, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${nombreV}, ${descV}, ${premioDescV}, ${valorCajaV},
        ${fechaInicioV}, ${fechaSorteoV},
        ${estadoV}::"EstadoSorteo",
        NOW(), NOW()
      )
    `;

    const [gs] = await prisma.$queryRaw<GranSorteoRow[]>`
      SELECT
        gs.id, gs.nombre, gs.descripcion,
        gs."premioDescripcion", gs."valorCaja",
        gs."fechaInicio", gs."fechaSorteo",
        gs."numeroGanador",
        gs.estado::text,
        gs.recaudo, gs."fondoPremios", gs.ganancia,
        gs."createdAt",
        0::bigint AS participantes,
        NULL AS "ganadorNombre",
        NULL AS "ganadorApellido",
        NULL AS "ganadorCorreo"
      FROM grandes_sorteos gs
      WHERE gs.id = ${id}
    `;

    return NextResponse.json({ granSorteo: normalizar(gs) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/gran-sorteos:", err);
    return NextResponse.json({ mensaje: "Error al crear el Gran Sorteo." }, { status: 500 });
  }
}
