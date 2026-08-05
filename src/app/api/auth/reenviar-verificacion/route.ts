import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const userId = (session.user as unknown as { id: string }).id;

  const rl = checkRateLimit(`reenviar-verify:${userId}`, 3, 60 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json({ mensaje: "Ya enviamos varios correos. Revisa tu bandeja de spam." }, { status: 429 });

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { confirmado: true, nombre: true, correo: true },
  });

  if (!user) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  if (user.confirmado) return NextResponse.json({ mensaje: "Tu correo ya está verificado." }, { status: 409 });

  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { verifyToken: codigo, verifyTokenExpiry: expiry },
  });

  try {
    const { enviarCodigoVerificacion } = await import("@/lib/email");
    await enviarCodigoVerificacion({ correo: user.correo, nombre: user.nombre, codigo, expiraMin: 10 });
  } catch (error) {
    console.error("Error enviando código de verificación:", error);
    return NextResponse.json(
      { mensaje: "No pudimos enviar el correo. Intenta de nuevo en unos minutos o contáctanos." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, mensaje: "Código enviado. Revisa tu bandeja (y spam) — válido por 10 minutos." });
}
