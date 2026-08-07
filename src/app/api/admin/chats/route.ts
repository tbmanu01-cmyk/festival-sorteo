import { NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chats — lista de conversaciones para el panel /admin/chats,
// ordenadas por actividad más reciente. Visible para ADMIN y ASISTENTE.
export async function GET() {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");

  const conversaciones = await prisma.chatConversacion.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      usuario: { select: { nombre: true, apellido: true, correo: true } },
      asesor: { select: { nombre: true, apellido: true } },
      mensajes: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { mensajes: { where: { autor: "USER", leidoPorAdmin: false } } } },
    },
  });

  return NextResponse.json({
    conversaciones: conversaciones.map((c) => ({
      id: c.id,
      estado: c.estado,
      usuarioNombre: `${c.usuario.nombre} ${c.usuario.apellido}`,
      usuarioCorreo: c.usuario.correo,
      asesorNombre: c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}` : null,
      ultimoMensaje: c.mensajes[0]?.contenido ?? null,
      updatedAt: c.updatedAt,
      noLeidos: c._count.mensajes,
    })),
  });
}
