import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/notificaciones/[id] — detalle de una notificación puntual
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const rol    = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  const n = await prisma.notificacion.findFirst({
    where: {
      id,
      OR: [
        { usuarioId: userId },
        { paraUsuarios: true },
        ...(esStaff ? [{ paraAdmins: true }] : []),
      ],
      eliminadas: { none: { usuarioId: userId } },
    },
    include: {
      lecturas:   { where: { usuarioId: userId }, select: { leidaEn: true } },
      reacciones: { select: { emoji: true, usuarioId: true } },
    },
  });

  if (!n) return NextResponse.json({ mensaje: "Notificación no encontrada." }, { status: 404 });

  const resumenReacciones: Record<string, number> = {};
  for (const r of n.reacciones) {
    resumenReacciones[r.emoji] = (resumenReacciones[r.emoji] ?? 0) + 1;
  }
  const miReaccion = n.reacciones.find((r) => r.usuarioId === userId)?.emoji ?? null;

  return NextResponse.json({
    id:         n.id,
    tipo:       n.tipo,
    titulo:     n.titulo,
    cuerpo:     n.cuerpo,
    icono:      n.icono,
    createdAt:  n.createdAt,
    leida:      n.lecturas.length > 0,
    reacciones: resumenReacciones,
    miReaccion,
  });
}

// DELETE /api/notificaciones/[id] — la elimina solo de la bandeja de este
// usuario (no borra el registro global: una notificación broadcast la
// siguen viendo los demás destinatarios).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const rol    = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  const n = await prisma.notificacion.findFirst({
    where: {
      id,
      OR: [
        { usuarioId: userId },
        { paraUsuarios: true },
        ...(esStaff ? [{ paraAdmins: true }] : []),
      ],
    },
    select: { id: true },
  });
  if (!n) return NextResponse.json({ mensaje: "Notificación no encontrada." }, { status: 404 });

  await prisma.notifEliminada.upsert({
    where: { notificacionId_usuarioId: { notificacionId: id, usuarioId: userId } },
    create: { notificacionId: id, usuarioId: userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
