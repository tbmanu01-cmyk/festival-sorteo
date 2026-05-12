import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  const reacciones = await prisma.notifReaccion.findMany({
    where: { notificacionId: id },
    include: { usuario: { select: { nombre: true, apellido: true, correo: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Agrupar por emoji
  const porEmoji: Record<string, { count: number; usuarios: { nombre: string; correo: string }[] }> = {};
  for (const r of reacciones) {
    if (!porEmoji[r.emoji]) porEmoji[r.emoji] = { count: 0, usuarios: [] };
    porEmoji[r.emoji].count++;
    porEmoji[r.emoji].usuarios.push({
      nombre: `${r.usuario.nombre} ${r.usuario.apellido}`,
      correo: r.usuario.correo,
    });
  }

  return NextResponse.json({
    total: reacciones.length,
    porEmoji,
    detalle: reacciones.map((r) => ({
      emoji: r.emoji,
      nombre: `${r.usuario.nombre} ${r.usuario.apellido}`,
      correo: r.usuario.correo,
      fecha: r.createdAt,
    })),
  });
}
