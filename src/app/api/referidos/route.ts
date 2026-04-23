import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function generarCodigoRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  type UserRow = { codigoRef: string | null };
  const [usuario] = await prisma.$queryRaw<UserRow[]>`
    SELECT "codigoRef" FROM users WHERE id = ${userId} LIMIT 1
  `;

  let codigoRef = usuario?.codigoRef ?? null;

  // Generar código si el usuario no tiene uno
  if (!codigoRef) {
    for (let i = 0; i < 10; i++) {
      const candidato = generarCodigoRef();
      const [dup] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${candidato} LIMIT 1
      `;
      if (!dup) { codigoRef = candidato; break; }
    }
    if (codigoRef) {
      await prisma.$executeRaw`UPDATE users SET "codigoRef" = ${codigoRef} WHERE id = ${userId}`;
    }
  }

  type RefRow = { id: string; referidoNombre: string; fecha: Date; compro: boolean };
  const referidos = await prisma.$queryRaw<RefRow[]>`
    SELECT r.id, u.nombre AS "referidoNombre", r.fecha, r.compro
    FROM referidos r
    JOIN users u ON u.id = r."referidoId"
    WHERE r."referidorId" = ${userId}
    ORDER BY r.fecha DESC
  `;

  const comprados = referidos.filter((r) => r.compro).length;
  const progreso = comprados % 5;
  const cuponesGanados = Math.floor(comprados / 5);

  type CuponRow = { id: string; codigo: string; usado: boolean; fechaCreacion: Date; fechaUso: Date | null };
  const cupones = await prisma.$queryRaw<CuponRow[]>`
    SELECT id, codigo, usado, "fechaCreacion", "fechaUso"
    FROM cupones
    WHERE "usuarioId" = ${userId}
    ORDER BY "fechaCreacion" DESC
  `;

  return NextResponse.json({
    codigoRef,
    referidos: referidos.map((r) => ({
      ...r,
      fecha: r.fecha instanceof Date ? r.fecha.toISOString() : r.fecha,
    })),
    totalReferidos: referidos.length,
    comprados,
    progreso,
    cuponesGanados,
    cupones: cupones.map((c) => ({
      ...c,
      fechaCreacion: c.fechaCreacion instanceof Date ? c.fechaCreacion.toISOString() : c.fechaCreacion,
      fechaUso: c.fechaUso instanceof Date ? c.fechaUso.toISOString() : c.fechaUso,
    })),
    cuponesDisponibles: cupones.filter((c) => !c.usado).length,
  });
}
