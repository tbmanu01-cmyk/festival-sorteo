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

  const token  = crypto.randomUUID();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { verifyToken: token, verifyTokenExpiry: expiry },
  });

  const base   = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";
  const enlace = `${base}/api/auth/verificar-correo?token=${token}`;

  try {
    const { enviarVerificacionCorreo } = await import("@/lib/email");
    await enviarVerificacionCorreo({ correo: user.correo, nombre: user.nombre, enlace });
  } catch (error) {
    console.error("Error enviando correo de verificación:", error);
    return NextResponse.json(
      { mensaje: "No pudimos enviar el correo. Intenta de nuevo en unos minutos o contáctanos." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, mensaje: "Correo de verificación enviado. Revisa tu bandeja (y spam)." });
}
