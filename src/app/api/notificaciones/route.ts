import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const rol    = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  // Notificaciones relevantes para este usuario
  const notifs = await prisma.notificacion.findMany({
    where: {
      OR: [
        { usuarioId: userId },
        { paraUsuarios: true },
        ...(esStaff ? [{ paraAdmins: true }] : []),
      ],
    },
    include: {
      lecturas: { where: { usuarioId: userId }, select: { leidaEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    notificaciones: notifs.map((n) => ({
      id:        n.id,
      tipo:      n.tipo,
      titulo:    n.titulo,
      cuerpo:    n.cuerpo,
      icono:     n.icono,
      createdAt: n.createdAt,
      leida:     n.lecturas.length > 0,
    })),
    noLeidas: notifs.filter((n) => n.lecturas.length === 0).length,
  });
}

// PATCH /api/notificaciones — marcar como leídas
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const rol    = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  const body = await req.json().catch(() => ({})) as { ids?: string[] };

  // Determinar qué notificaciones marcar: las dadas o todas las no leídas
  const notifs = await prisma.notificacion.findMany({
    where: body.ids?.length
      ? { id: { in: body.ids } }
      : {
          OR: [
            { usuarioId: userId },
            { paraUsuarios: true },
            ...(esStaff ? [{ paraAdmins: true }] : []),
          ],
          lecturas: { none: { usuarioId: userId } },
        },
    select: { id: true },
  });

  if (notifs.length === 0) return NextResponse.json({ ok: true });

  await prisma.notifLectura.createMany({
    data: notifs.map((n) => ({ notificacionId: n.id, usuarioId: userId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, marcadas: notifs.length });
}
