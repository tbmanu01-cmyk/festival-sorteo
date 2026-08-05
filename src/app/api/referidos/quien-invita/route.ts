import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`quien-invita:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ mensaje: "Demasiadas consultas." }, { status: 429 });
  }

  const codigo = req.nextUrl.searchParams.get("codigo")?.trim().toUpperCase();
  if (!codigo) return NextResponse.json({ mensaje: "Falta el código." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const referidor = await prisma.user.findFirst({
    where: { codigoRef: codigo },
    select: { nombre: true, apellido: true },
  });

  if (!referidor) return NextResponse.json({ mensaje: "Código no encontrado." }, { status: 404 });

  return NextResponse.json({ nombre: referidor.nombre, apellido: referidor.apellido });
}
