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

  try {
    const { prisma } = await import("@/lib/prisma");

    const [gs] = await prisma.$queryRaw<{ id: string; estado: string }[]>`
      SELECT id, estado::text FROM grandes_sorteos WHERE id = ${id} LIMIT 1
    `;
    if (!gs) {
      return NextResponse.json({ mensaje: "Gran Sorteo no encontrado." }, { status: 404 });
    }
    if (gs.estado === "FINALIZADO") {
      return NextResponse.json(
        { mensaje: "No se puede editar un sorteo ya finalizado." },
        { status: 409 }
      );
    }

    const campos: string[] = [];
    const valores: unknown[] = [];
    let idx = 1;

    if (body.nombre?.trim()) { campos.push(`nombre = $${idx++}`); valores.push(body.nombre.trim()); }
    if (body.descripcion !== undefined) { campos.push(`descripcion = $${idx++}`); valores.push(body.descripcion?.trim() ?? ""); }
    if (body.premioDescripcion?.trim()) { campos.push(`"premioDescripcion" = $${idx++}`); valores.push(body.premioDescripcion.trim()); }
    if (body.valorCaja) { campos.push(`"valorCaja" = $${idx++}`); valores.push(Number(body.valorCaja)); }
    if (body.fechaInicio) { campos.push(`"fechaInicio" = $${idx++}`); valores.push(new Date(body.fechaInicio)); }
    if (body.fechaSorteo) { campos.push(`"fechaSorteo" = $${idx++}`); valores.push(new Date(body.fechaSorteo)); }
    if (body.estado && ["PENDIENTE", "EN_CURSO", "ACTIVO"].includes(body.estado)) {
      campos.push(`estado = $${idx++}::"EstadoSorteo"`);
      valores.push(body.estado);
    }
    campos.push(`"updatedAt" = NOW()`);

    if (campos.length <= 1) {
      return NextResponse.json({ mensaje: "No hay campos para actualizar." }, { status: 400 });
    }

    const query = `UPDATE grandes_sorteos SET ${campos.join(", ")} WHERE id = $${idx}`;
    valores.push(id);
    await prisma.$executeRawUnsafe(query, ...valores);

    return NextResponse.json({ mensaje: "Gran Sorteo actualizado." });
  } catch (err) {
    console.error("PATCH /api/gran-sorteos/[id]:", err);
    return NextResponse.json({ mensaje: "Error al actualizar." }, { status: 500 });
  }
}

// ── DELETE: eliminar (solo PENDIENTE) ─────────────────────────────────────

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

    const [gs] = await prisma.$queryRaw<{ estado: string }[]>`
      SELECT estado::text FROM grandes_sorteos WHERE id = ${id} LIMIT 1
    `;
    if (!gs) {
      return NextResponse.json({ mensaje: "Gran Sorteo no encontrado." }, { status: 404 });
    }
    if (gs.estado !== "PENDIENTE") {
      return NextResponse.json(
        { mensaje: "Solo se pueden eliminar Gran Sorteos en estado Pendiente." },
        { status: 409 }
      );
    }

    await prisma.$executeRaw`DELETE FROM sorteos_previos_gran WHERE "granSorteoId" = ${id}`;
    await prisma.$executeRaw`DELETE FROM grandes_sorteos WHERE id = ${id}`;

    return NextResponse.json({ mensaje: "Gran Sorteo eliminado." });
  } catch (err) {
    console.error("DELETE /api/gran-sorteos/[id]:", err);
    return NextResponse.json({ mensaje: "Error al eliminar." }, { status: 500 });
  }
}
