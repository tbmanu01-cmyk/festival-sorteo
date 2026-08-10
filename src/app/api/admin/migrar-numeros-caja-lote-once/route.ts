import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

// Endpoint temporal de un solo uso: agrega la columna numerosCaja (array,
// default vacío) a la tabla pagos_bold. Se borra después de ejecutarse una
// vez en producción.
export async function POST() {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE pagos_bold ADD COLUMN IF NOT EXISTS "numerosCaja" TEXT[] NOT NULL DEFAULT '{}';`
  );

  return NextResponse.json({ mensaje: "Columna numerosCaja agregada (o ya existía)." });
}
