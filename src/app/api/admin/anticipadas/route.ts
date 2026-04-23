import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Los métodos $queryRaw / $executeRaw existen en PrismaClient base,
// sin depender del modelo generado. Se usan mientras 'prisma generate'
// no pueda correr (DLL bloqueado por el dev server en Windows).

type Row = {
  id: string;
  nombre: string;
  descripcion: string | null;
  premioDescripcion: string;
  premioValor: number | null;
  cantidadGanadores: number | bigint;
  soloVendidas: boolean;
  minCajas: number | bigint;
  fecha: Date;
  estado: string;
  ganadores: unknown;
};

function normalizar(r: Row) {
  return {
    ...r,
    cantidadGanadores: Number(r.cantidadGanadores),
    minCajas: Number(r.minCajas ?? 0),
    fecha: r.fecha instanceof Date ? r.fecha.toISOString() : r.fecha,
    ganadores: r.ganadores ?? null,
  };
}

// ── GET: listar todas ──────────────────────────────────────────────────────

export async function GET() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        id, nombre, descripcion,
        "premioDescripcion", "premioValor",
        "cantidadGanadores", "soloVendidas", "minCajas",
        fecha, estado::text, ganadores
      FROM sorteos_anticipados
      ORDER BY fecha ASC
    `;
    return NextResponse.json({ anticipadas: rows.map(normalizar) });
  } catch (err) {
    console.error("GET /api/admin/anticipadas:", err);
    return NextResponse.json({ anticipadas: [] });
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
    premioValor?: number | string;
    cantidadGanadores?: number | string;
    soloVendidas?: boolean;
    minCajas?: number | string;
    fecha?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const { nombre, descripcion, premioDescripcion, premioValor, cantidadGanadores, soloVendidas, minCajas, fecha } = body;

  if (!nombre?.trim() || !premioDescripcion?.trim() || !fecha) {
    return NextResponse.json(
      { mensaje: "Nombre, descripción del premio y fecha son requeridos." },
      { status: 400 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const id = crypto.randomUUID();
    const nombreV = nombre.trim();
    const descripcionV = descripcion?.trim() || null;
    const premioDescV = premioDescripcion.trim();
    const premioValV = premioValor ? Number(premioValor) : null;
    const cantidadV = Number(cantidadGanadores) || 5;
    const soloV = soloVendidas !== false;
    const minCajasV = Number(minCajas) || 0;
    const fechaV = new Date(fecha);

    await prisma.$executeRaw`
      INSERT INTO sorteos_anticipados (
        id, nombre, descripcion, "premioDescripcion", "premioValor",
        "cantidadGanadores", "soloVendidas", "minCajas", fecha, estado
      ) VALUES (
        ${id}, ${nombreV}, ${descripcionV}, ${premioDescV}, ${premioValV},
        ${cantidadV}, ${soloV}, ${minCajasV}, ${fechaV},
        'PENDIENTE'::"EstadoAnticipada"
      )
    `;

    const [anticipada] = await prisma.$queryRaw<Row[]>`
      SELECT
        id, nombre, descripcion,
        "premioDescripcion", "premioValor",
        "cantidadGanadores", "soloVendidas", "minCajas",
        fecha, estado::text, ganadores
      FROM sorteos_anticipados
      WHERE id = ${id}
    `;

    return NextResponse.json({ anticipada: normalizar(anticipada) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/anticipadas:", err);
    return NextResponse.json({ mensaje: "Error al crear la selección." }, { status: 500 });
  }
}

// ── DELETE: eliminar (solo PENDIENTE) ─────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ mensaje: "ID requerido." }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const [row] = await prisma.$queryRaw<{ estado: string }[]>`
      SELECT estado::text FROM sorteos_anticipados WHERE id = ${id}
    `;

    if (!row) {
      return NextResponse.json({ mensaje: "Selección no encontrada." }, { status: 404 });
    }
    if (row.estado === "EJECUTADO") {
      return NextResponse.json({ mensaje: "No se puede eliminar una selección ya ejecutada." }, { status: 409 });
    }

    await prisma.$executeRaw`DELETE FROM sorteos_anticipados WHERE id = ${id}`;
    return NextResponse.json({ mensaje: "Selección eliminada." });
  } catch (err) {
    console.error("DELETE /api/admin/anticipadas:", err);
    return NextResponse.json({ mensaje: "Error al eliminar la selección." }, { status: 500 });
  }
}
