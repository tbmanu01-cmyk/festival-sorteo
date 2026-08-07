import { NextRequest, NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const faqs = await prisma.faqItem.findMany({ orderBy: [{ categoria: "asc" }, { orden: "asc" }] });
  return NextResponse.json({ faqs });
}

export async function POST(req: NextRequest) {
  const session = await verificarAsistente();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const body = (await req.json().catch(() => ({}))) as {
    categoria?: string;
    pregunta?: string;
    palabrasClave?: string;
    respuesta?: string;
    orden?: number;
  };

  const categoria = (body.categoria ?? "").trim();
  const pregunta = (body.pregunta ?? "").trim();
  const respuesta = (body.respuesta ?? "").trim();
  if (!categoria || !pregunta || !respuesta) {
    return NextResponse.json({ mensaje: "Categoría, pregunta y respuesta son obligatorias." }, { status: 400 });
  }

  const palabrasClave = (body.palabrasClave ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const faq = await prisma.faqItem.create({
    data: { categoria, pregunta, respuesta, palabrasClave, orden: body.orden ?? 0 },
  });

  return NextResponse.json({ faq }, { status: 201 });
}
