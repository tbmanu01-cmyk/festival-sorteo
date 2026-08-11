import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Endpoint temporal de diagnóstico: muestra el código 2FA vigente del admin
// que hace la petición, para poder probar el flujo de login sin acceso al
// correo real. Se borra apenas se termine de verificar en vivo.
export async function GET() {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorCode: true, twoFactorExpiry: true },
  });

  return NextResponse.json(user);
}
