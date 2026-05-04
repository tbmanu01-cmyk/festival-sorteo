import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { correo } = await req.json() as { correo?: string };
    if (!correo) return NextResponse.json({ mensaje: "Correo requerido." }, { status: 400 });

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({ where: { correo: correo.toLowerCase().trim() } });

    // Siempre responder OK para no revelar si el correo existe
    if (!user) {
      return NextResponse.json({ mensaje: "Si el correo existe, recibirás un enlace en breve." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const base = process.env.NEXTAUTH_URL ?? "https://festival-sorteo.vercel.app";
    const enlace = `${base}/resetear-password?token=${token}`;

    const { enviarRecuperacionPassword } = await import("@/lib/email");
    await enviarRecuperacionPassword({ correo: user.correo, nombre: user.nombre, enlace });

    return NextResponse.json({ mensaje: "Si el correo existe, recibirás un enlace en breve." });
  } catch (error) {
    console.error("POST recuperar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
