import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Endpoint temporal de un solo uso: agrega la columna sessionVersion a la
// tabla users. Se borra después de ejecutarse una vez en producción.
export async function POST() {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;`
  );

  return NextResponse.json({ mensaje: "Columna sessionVersion agregada (o ya existía)." });
}
