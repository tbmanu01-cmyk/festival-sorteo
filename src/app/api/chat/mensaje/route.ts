import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buscarRespuesta, agruparPorCategoria, type FaqLike } from "@/lib/chatbot";
import { obtenerConversacionActiva } from "@/lib/chatConversacion";

export const dynamic = "force-dynamic";

const RESPUESTA_NO_ENTENDIDA =
  "No estoy seguro de haber entendido tu pregunta 🤔 Elige uno de estos temas, o si prefieres, solicita hablar con un asesor.";

// POST /api/chat/mensaje — el usuario envía un mensaje. Si la conversación
// sigue en modo BOT, se responde automáticamente por coincidencia de
// palabras clave contra las FAQ activas; si ya está escalada a un asesor
// (ESPERANDO_ASESOR / EN_ATENCION), el mensaje solo se guarda para que el
// admin lo vea en /admin/chats — el bot no interviene.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const body = (await req.json().catch(() => ({}))) as { texto?: string; faqItemId?: string };
  const texto = (body.texto ?? "").trim();
  if (!texto) return NextResponse.json({ mensaje: "Escribe un mensaje." }, { status: 400 });

  let conversacion = await obtenerConversacionActiva(prisma, userId);
  if (!conversacion) {
    conversacion = await prisma.chatConversacion.create({ data: { usuarioId: userId } });
  }

  const mensajeUsuario = await prisma.chatMensaje.create({
    data: { conversacionId: conversacion.id, autor: "USER", contenido: texto },
  });

  if (conversacion.estado !== "BOT") {
    await prisma.chatConversacion.update({ where: { id: conversacion.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({
      conversacion: { id: conversacion.id, estado: conversacion.estado },
      mensajeUsuario: { id: mensajeUsuario.id, autor: "USER", contenido: texto, createdAt: mensajeUsuario.createdAt },
      botReply: null,
    });
  }

  const faqs: FaqLike[] = await prisma.faqItem.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });

  let respuestaTexto: string;
  let sugerencias: FaqLike[] = [];

  if (body.faqItemId) {
    const exacto = faqs.find((f) => f.id === body.faqItemId);
    respuestaTexto = exacto ? exacto.respuesta : RESPUESTA_NO_ENTENDIDA;
  } else {
    const resultado = buscarRespuesta(texto, faqs);
    if (resultado.tipo === "respuesta") {
      respuestaTexto = resultado.item.respuesta;
    } else {
      respuestaTexto = RESPUESTA_NO_ENTENDIDA;
      if (resultado.tipo === "sugerencias") sugerencias = resultado.items;
    }
  }

  const mensajeBot = await prisma.chatMensaje.create({
    data: { conversacionId: conversacion.id, autor: "BOT", contenido: respuestaTexto },
  });
  await prisma.chatConversacion.update({ where: { id: conversacion.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    conversacion: { id: conversacion.id, estado: conversacion.estado },
    mensajeUsuario: { id: mensajeUsuario.id, autor: "USER", contenido: texto, createdAt: mensajeUsuario.createdAt },
    botReply: { id: mensajeBot.id, autor: "BOT", contenido: respuestaTexto, createdAt: mensajeBot.createdAt },
    sugerencias,
    categorias: agruparPorCategoria(faqs),
  });
}
