import { NextRequest, NextResponse } from "next/server";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";

export async function POST(req: NextRequest) {
  const ip = obtenerIP(req);
  try {
    const { token, password } = await req.json() as { token?: string; password?: string };
    if (!token || !password) {
      return NextResponse.json({ mensaje: "Token y contraseña son requeridos." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ mensaje: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
      select: { id: true, resetTokenExpiry: true },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      await registrarAuditoria({ accion: "RESET_TOKEN_INVALIDO", detalle: "Token expirado o no encontrado", ip });
      return NextResponse.json({ mensaje: "El enlace es inválido o ya expiró." }, { status: 400 });
    }

    const { hash } = await import("bcryptjs");
    const hashed = await hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
        resetSolicitadoEn: null,
        loginIntentos: 0,
        bloqueadoHasta: null,
      },
    });

    await registrarAuditoria({
      userId: user.id,
      accion: "PASSWORD_CAMBIADO",
      detalle: "Contraseña restablecida via enlace de recuperación",
      ip,
    });

    return NextResponse.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("POST resetear error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
