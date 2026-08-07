import { NextRequest, NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chats/[id] — hilo completo de una conversación; marca como
// leídos (por el admin) los mensajes del usuario al abrirla.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  const conversacion = await prisma.chatConversacion.findUnique({
    where: { id },
    include: {
      usuario: { select: { nombre: true, apellido: true, correo: true, celular: true } },
      asesor: { select: { nombre: true, apellido: true } },
      mensajes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversacion) return NextResponse.json({ mensaje: "Conversación no encontrada." }, { status: 404 });

  await prisma.chatMensaje.updateMany({
    where: { conversacionId: id, autor: "USER", leidoPorAdmin: false },
    data: { leidoPorAdmin: true },
  });

  return NextResponse.json({
    id: conversacion.id,
    estado: conversacion.estado,
    usuarioNombre: `${conversacion.usuario.nombre} ${conversacion.usuario.apellido}`,
    usuarioCorreo: conversacion.usuario.correo,
    usuarioCelular: conversacion.usuario.celular,
    asesorNombre: conversacion.asesor ? `${conversacion.asesor.nombre} ${conversacion.asesor.apellido}` : null,
    mensajes: conversacion.mensajes.map((m) => ({
      id: m.id,
      autor: m.autor,
      contenido: m.contenido,
      createdAt: m.createdAt,
    })),
  });
}

// PATCH /api/admin/chats/[id] — cerrar la conversación
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  const conversacion = await prisma.chatConversacion.update({
    where: { id },
    data: { estado: "CERRADA" },
  });

  return NextResponse.json({ id: conversacion.id, estado: conversacion.estado });
}
