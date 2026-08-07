import { NextRequest, NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const body = (await req.json().catch(() => ({}))) as {
    categoria?: string;
    pregunta?: string;
    palabrasClave?: string;
    respuesta?: string;
    orden?: number;
    activo?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (body.categoria !== undefined) data.categoria = body.categoria.trim();
  if (body.pregunta !== undefined) data.pregunta = body.pregunta.trim();
  if (body.respuesta !== undefined) data.respuesta = body.respuesta.trim();
  if (body.orden !== undefined) data.orden = body.orden;
  if (body.activo !== undefined) data.activo = body.activo;
  if (body.palabrasClave !== undefined) {
    data.palabrasClave = body.palabrasClave.split(",").map((p) => p.trim()).filter(Boolean);
  }

  const faq = await prisma.faqItem.update({ where: { id }, data });
  return NextResponse.json({ faq });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  await prisma.faqItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
