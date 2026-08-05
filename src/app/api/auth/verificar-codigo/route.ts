import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const userId = (session.user as unknown as { id: string }).id;

  const rl = checkRateLimit(`verificar-codigo:${userId}`, 8, 15 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json({ mensaje: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, { status: 429 });

  const body = await req.json().catch(() => null) as { codigo?: string } | null;
  const codigo = body?.codigo?.trim();
  if (!codigo || !/^\d{6}$/.test(codigo)) {
    return NextResponse.json({ mensaje: "Ingresa un código de 6 dígitos." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { confirmado: true, verifyToken: true, verifyTokenExpiry: true },
  });

  if (!user) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  if (user.confirmado) return NextResponse.json({ ok: true, mensaje: "Tu correo ya está verificado." });

  if (!user.verifyToken || !user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
    return NextResponse.json({ mensaje: "El código expiró. Pide uno nuevo." }, { status: 400 });
  }

  if (user.verifyToken !== codigo) {
    return NextResponse.json({ mensaje: "Código incorrecto." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { confirmado: true, verifyToken: null, verifyTokenExpiry: null },
  });

  return NextResponse.json({ ok: true, mensaje: "¡Correo verificado!" });
}
