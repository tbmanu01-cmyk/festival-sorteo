import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");

  const notifs = await prisma.notificacion.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { lecturas: true } } },
  });

  return NextResponse.json({
    notificaciones: notifs.map((n) => ({
      id:          n.id,
      tipo:        n.tipo,
      titulo:      n.titulo,
      cuerpo:      n.cuerpo,
      icono:       n.icono,
      paraAdmins:  n.paraAdmins,
      paraUsuarios: n.paraUsuarios,
      usuarioId:   n.usuarioId,
      createdAt:   n.createdAt,
      lecturas:    n._count.lecturas,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    tipo?: string;
    titulo?: string;
    cuerpo?: string;
    icono?: string;
    destino?: "todos" | "admins" | "usuario";
    correoUsuario?: string;
  };

  if (!body.titulo?.trim() || !body.cuerpo?.trim()) {
    return NextResponse.json({ mensaje: "Título y cuerpo son requeridos." }, { status: 400 });
  }
  if (!["SISTEMA", "SORTEO", "RETIRO", "PROMO", "MEMBRESIA"].includes(body.tipo ?? "")) {
    return NextResponse.json({ mensaje: "Tipo inválido." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  let usuarioId: string | null = null;
  if (body.destino === "usuario") {
    if (!body.correoUsuario?.trim()) {
      return NextResponse.json({ mensaje: "Correo del usuario requerido." }, { status: 400 });
    }
    const u = await prisma.user.findUnique({ where: { correo: body.correoUsuario.trim() }, select: { id: true } });
    if (!u) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
    usuarioId = u.id;
  }

  const notif = await prisma.notificacion.create({
    data: {
      tipo:         body.tipo!,
      titulo:       body.titulo!.trim(),
      cuerpo:       body.cuerpo!.trim(),
      icono:        body.icono?.trim() || undefined,
      usuarioId,
      paraAdmins:   body.destino === "admins",
      paraUsuarios: body.destino === "todos",
    },
  });

  return NextResponse.json({ ok: true, notif }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ mensaje: "ID requerido." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.notificacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
