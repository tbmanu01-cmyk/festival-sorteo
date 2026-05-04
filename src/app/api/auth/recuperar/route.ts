import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";

const RESP_OK = { mensaje: "Si el correo existe, recibirás un enlace en breve." };
const LIMITE_MINUTOS = 15;

export async function POST(req: NextRequest) {
  const ip = obtenerIP(req);
  try {
    const { correo } = await req.json() as { correo?: string };
    if (!correo) return NextResponse.json({ mensaje: "Correo requerido." }, { status: 400 });

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { correo: correo.toLowerCase().trim() },
      select: { id: true, nombre: true, correo: true, resetSolicitadoEn: true },
    });

    // Respuesta siempre igual para no revelar si el correo existe
    if (!user) return NextResponse.json(RESP_OK);

    // Rate limit: máximo 1 solicitud cada 15 minutos por cuenta
    if (user.resetSolicitadoEn) {
      const diff = Date.now() - user.resetSolicitadoEn.getTime();
      if (diff < LIMITE_MINUTOS * 60 * 1000) {
        await registrarAuditoria({
          userId: user.id,
          accion: "RECUPERACION_BLOQUEADA",
          detalle: `Rate limit activo — solicitud demasiado reciente`,
          ip,
        });
        return NextResponse.json(RESP_OK); // No revelar el bloqueo
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
        resetSolicitadoEn: new Date(),
      },
    });

    const base = process.env.NEXTAUTH_URL ?? "https://festival-sorteo.vercel.app";
    const enlace = `${base}/resetear-password?token=${token}`;

    const { enviarRecuperacionPassword } = await import("@/lib/email");
    await enviarRecuperacionPassword({ correo: user.correo, nombre: user.nombre, enlace });

    await registrarAuditoria({
      userId: user.id,
      accion: "RECUPERACION_SOLICITADA",
      detalle: "Enlace de recuperación enviado",
      ip,
    });

    return NextResponse.json(RESP_OK);
  } catch (error) {
    console.error("POST recuperar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
