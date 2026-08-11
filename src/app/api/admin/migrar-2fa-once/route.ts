import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Endpoint temporal de un solo uso: agrega las columnas twoFactorCode y
// twoFactorExpiry a la tabla users. Se borra después de ejecutarse una vez
// en producción.
export async function POST() {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorCode" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorExpiry" TIMESTAMP;`
  );

  return NextResponse.json({ mensaje: "Columnas twoFactorCode/twoFactorExpiry agregadas (o ya existían)." });
}
