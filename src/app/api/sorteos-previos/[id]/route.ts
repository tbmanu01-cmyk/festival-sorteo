import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// ── PATCH: editar ──────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;

  let body: {
    nombre?: string;
    premioDescripcion?: string;
    premioValor?: number | string | null;
    fechaSorteo?: string;
    cantidadGanadores?: number | string;
    requisitos?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const [sp] = await prisma.$queryRaw<{ estado: string }[]>`
      SELECT estado::text FROM sorteos_previos_gran WHERE id = ${id} LIMIT 1
    `;
    if (!sp) {
      return NextResponse.json({ mensaje: "Sorteo previo no encontrado." }, { status: 404 });
    }
    if (sp.estado === "FINALIZADO") {
      return NextResponse.json({ mensaje: "No se puede editar un sorteo ya ejecutado." }, { status: 409 });
    }

    const campos: string[] = [];
    const valores: unknown[] = [];
    let idx = 1;

    if (body.nombre?.trim()) { campos.push(`nombre = $${idx++}`); valores.push(body.nombre.trim()); }
    if (body.premioDescripcion?.trim()) { campos.push(`"premioDescripcion" = $${idx++}`); valores.push(body.premioDescripcion.trim()); }
    if (body.premioValor !== undefined) { campos.push(`"premioValor" = $${idx++}`); valores.push(body.premioValor !== null ? Number(body.premioValor) : null); }
    if (body.fechaSorteo) { campos.push(`"fechaSorteo" = $${idx++}`); valores.push(new Date(body.fechaSorteo)); }
    if (body.cantidadGanadores) { campos.push(`"cantidadGanadores" = $${idx++}`); valores.push(Number(body.cantidadGanadores)); }
    if (body.requisitos) { campos.push(`requisitos = $${idx++}::jsonb`); valores.push(JSON.stringify(body.requisitos)); }
    campos.push(`"updatedAt" = NOW()`);

    if (campos.length <= 1) {
      return NextResponse.json({ mensaje: "No hay campos para actualizar." }, { status: 400 });
    }

    const query = `UPDATE sorteos_previos_gran SET ${campos.join(", ")} WHERE id = $${idx}`;
    valores.push(id);
    await prisma.$executeRawUnsafe(query, ...valores);

    return NextResponse.json({ mensaje: "Sorteo previo actualizado." });
  } catch (err) {
    console.error("PATCH /api/sorteos-previos/[id]:", err);
    return NextResponse.json({ mensaje: "Error al actualizar." }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { prisma } = await import("@/lib/prisma");

    const [sp] = await prisma.$queryRaw<{ estado: string }[]>`
      SELECT estado::text FROM sorteos_previos_gran WHERE id = ${id} LIMIT 1
    `;
    if (!sp) {
      return NextResponse.json({ mensaje: "Sorteo previo no encontrado." }, { status: 404 });
    }
    if (sp.estado === "FINALIZADO") {
      return NextResponse.json({ mensaje: "No se puede eliminar un sorteo ya ejecutado." }, { status: 409 });
    }

    await prisma.$executeRaw`DELETE FROM sorteos_previos_gran WHERE id = ${id}`;
    return NextResponse.json({ mensaje: "Sorteo previo eliminado." });
  } catch (err) {
    console.error("DELETE /api/sorteos-previos/[id]:", err);
    return NextResponse.json({ mensaje: "Error al eliminar." }, { status: 500 });
  }
}
