import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const EMOJIS_VALIDOS = ["👍", "❤️", "😮", "😂", "🙏", "🔥"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { emoji?: string };
  const emoji = body.emoji?.trim();

  if (!emoji || !EMOJIS_VALIDOS.includes(emoji)) {
    return NextResponse.json({ mensaje: "Emoji inválido." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const rol     = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  const notif = await prisma.notificacion.findFirst({
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
  if (!notif) return NextResponse.json({ mensaje: "Notificación no encontrada." }, { status: 404 });

  const clave = { notificacionId: id, usuarioId: userId };

  const actual = await prisma.notifReaccion.findUnique({ where: { notificacionId_usuarioId: clave } });

  if (actual?.emoji === emoji) {
    await prisma.notifReaccion.delete({ where: { notificacionId_usuarioId: clave } });
    return NextResponse.json({ accion: "quitada", emoji: null });
  }

  await prisma.notifReaccion.upsert({
    where:  { notificacionId_usuarioId: clave },
    create: { notificacionId: id, usuarioId: userId, emoji },
    update: { emoji, createdAt: new Date() },
  });

  return NextResponse.json({ accion: "guardada", emoji });
}
