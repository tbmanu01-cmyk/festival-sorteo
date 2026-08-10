import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Endpoint temporal de un solo uso: agrega la columna fechaNacimiento (nullable)
// a la tabla users. Se borra después de ejecutarse una vez en producción.
export async function POST() {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "fechaNacimiento" TIMESTAMP;`
  );

  return NextResponse.json({ mensaje: "Columna fechaNacimiento agregada (o ya existía)." });
}
