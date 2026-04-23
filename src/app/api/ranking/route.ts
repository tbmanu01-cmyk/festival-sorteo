import { NextResponse } from "next/server";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");

  type RankRow = {
    nombre: string;
    ciudad: string;
    totalCajas: bigint;
  };

  const rows = await prisma.$queryRaw<RankRow[]>`
    SELECT u.nombre, u.ciudad, COUNT(c.id) AS "totalCajas"
    FROM users u
    JOIN cajas c ON c."userId" = u.id AND c.estado = 'VENDIDA'
    GROUP BY u.id, u.nombre, u.ciudad
    ORDER BY "totalCajas" DESC
    LIMIT 20
  `;

  return NextResponse.json({
    ranking: rows.map((r, i) => ({
      posicion: i + 1,
      nombre: r.nombre,
      ciudad: r.ciudad,
      totalCajas: Number(r.totalCajas),
      esStar: Number(r.totalCajas) >= 10,
    })),
  });
}
