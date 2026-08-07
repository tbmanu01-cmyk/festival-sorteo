import { NextRequest, NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export const dynamic = "force-dynamic";

// POST /api/admin/chats/[id]/mensaje — el admin/asistente responde. Si nadie
// había tomado la conversación todavía, responder la "reclama" (pasa a
// EN_ATENCION con este admin como asesor).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const adminId = (session.user as unknown as { id: string }).id;

  const body = (await req.json().catch(() => ({}))) as { texto?: string };
  const texto = (body.texto ?? "").trim();
  if (!texto) return NextResponse.json({ mensaje: "Escribe un mensaje." }, { status: 400 });

  const conversacion = await prisma.chatConversacion.findUnique({ where: { id } });
  if (!conversacion) return NextResponse.json({ mensaje: "Conversación no encontrada." }, { status: 404 });
  if (conversacion.estado === "CERRADA") {
    return NextResponse.json({ mensaje: "Esta conversación ya está cerrada." }, { status: 400 });
  }

  const mensaje = await prisma.chatMensaje.create({
    data: { conversacionId: id, autor: "ADMIN", autorId: adminId, contenido: texto, leidoPorAdmin: true },
  });

  await prisma.chatConversacion.update({
    where: { id },
    data: {
      estado: "EN_ATENCION",
      asesorId: conversacion.asesorId ?? adminId,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    mensaje: { id: mensaje.id, autor: "ADMIN", contenido: texto, createdAt: mensaje.createdAt },
  });
}
