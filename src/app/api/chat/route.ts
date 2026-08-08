import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agruparPorCategoria } from "@/lib/chatbot";
import { obtenerConversacionActiva } from "@/lib/chatConversacion";

export const dynamic = "force-dynamic";

interface MensajeRow {
  id: string;
  autor: "USER" | "BOT" | "ADMIN";
  contenido: string;
  createdAt: Date;
  leidoPorUsuario: boolean;
}

// GET /api/chat — trae la conversación activa del usuario (si existe) + sus
// mensajes, más las categorías de FAQ para el menú inicial del bot.
// `?marcar=0` evita marcar los mensajes del admin como leídos — lo usa el
// polling del globo flotante en segundo plano (para saber cuántos hay sin
// leer sin "gastarlos" antes de que el usuario realmente abra el panel).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const marcarLeido = req.nextUrl.searchParams.get("marcar") !== "0";

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const [conversacion, faqs] = await Promise.all([
    obtenerConversacionActiva(prisma, userId, {
      mensajes: { orderBy: { createdAt: "asc" } },
      asesor: { select: { nombre: true, apellido: true } },
    }),
    prisma.faqItem.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
  ]);

  const noLeidos = conversacion
    ? conversacion.mensajes.filter((m: MensajeRow) => m.autor === "ADMIN" && !m.leidoPorUsuario).length
    : 0;

  if (conversacion && marcarLeido && noLeidos > 0) {
    await prisma.chatMensaje.updateMany({
      where: { conversacionId: conversacion.id, autor: "ADMIN", leidoPorUsuario: false },
      data: { leidoPorUsuario: true },
    });
  }

  return NextResponse.json({
    conversacion: conversacion
      ? {
          id: conversacion.id,
          estado: conversacion.estado,
          asesorNombre: conversacion.asesor ? `${conversacion.asesor.nombre} ${conversacion.asesor.apellido}` : null,
        }
      : null,
    mensajes: (conversacion?.mensajes ?? []).map((m: MensajeRow) => ({
      id: m.id,
      autor: m.autor,
      contenido: m.contenido,
      createdAt: m.createdAt,
    })),
    categorias: agruparPorCategoria(faqs),
    noLeidos: marcarLeido ? 0 : noLeidos,
  });
}
