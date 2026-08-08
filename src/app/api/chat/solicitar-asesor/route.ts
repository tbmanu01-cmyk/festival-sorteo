import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";
import { obtenerConversacionActiva } from "@/lib/chatConversacion";

export const dynamic = "force-dynamic";

const MENSAJE_ESCALACION =
  "Un usuario solicitó hablar con un asesor. En cuanto uno se conecte, seguirá la conversación aquí mismo 👋";

// POST /api/chat/solicitar-asesor — el bot no pudo resolverlo (o el usuario
// simplemente prefiere hablar con alguien). Marca la conversación como
// ESPERANDO_ASESOR y avisa a todo el equipo admin/asistente por la campana.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const nombre = session.user.name ?? "Un usuario";

  let conversacion = await obtenerConversacionActiva(prisma, userId);
  if (!conversacion) {
    conversacion = await prisma.chatConversacion.create({ data: { usuarioId: userId } });
  }

  if (conversacion.estado === "BOT") {
    conversacion = await prisma.chatConversacion.update({
      where: { id: conversacion.id },
      data: { estado: "ESPERANDO_ASESOR", escalada: true },
    });
    await prisma.chatMensaje.create({
      data: { conversacionId: conversacion.id, autor: "BOT", contenido: MENSAJE_ESCALACION },
    });
    await crearNotificacion(prisma, {
      tipo: "SISTEMA",
      icono: "💬",
      titulo: "Nueva solicitud de soporte",
      cuerpo: `${nombre} solicitó hablar con un asesor en el chat de soporte.`,
      paraAdmins: true,
    });
  }

  return NextResponse.json({
    conversacion: { id: conversacion.id, estado: conversacion.estado },
    mensaje: { autor: "BOT", contenido: MENSAJE_ESCALACION, createdAt: new Date() },
  });
}
