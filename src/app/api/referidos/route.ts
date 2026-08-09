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

  type RefRow = { id: string; referidoNombre: string; fecha: Date; compro: boolean; totalMembresias: bigint };
  const referidos = await prisma.$queryRaw<RefRow[]>`
    SELECT r.id, u.nombre AS "referidoNombre", r.fecha, r.compro,
           COUNT(c.id) AS "totalMembresias"
    FROM referidos r
    JOIN users u ON u.id = r."referidoId"
    LEFT JOIN cajas c ON c."userId" = r."referidoId" AND c.estado = 'VENDIDA'
    WHERE r."referidorId" = ${userId}
    GROUP BY r.id, u.nombre, r.fecha, r.compro
    ORDER BY r.fecha DESC
  `;

  // Total de membresías compradas por TODOS los referidos
  const config = await prisma.config.findUnique({ where: { id: "singleton" } });
  const mpgc = config?.membresiasPorGiftCard ?? 5;
  const totalMembresias = referidos.reduce((s, r) => s + Number(r.totalMembresias), 0);
  const progreso = totalMembresias % mpgc;
  const gcGanadas = Math.floor(totalMembresias / mpgc);

  // Progreso por compras propias — sistema independiente del de referidos,
  // ambos alimentan gift cards vía emitirGiftCardsPorMembresias()
  const comprasPropias = await prisma.caja.count({ where: { userId, estado: "VENDIDA" } });

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
      id: r.id,
      referidoNombre: r.referidoNombre,
      fecha: r.fecha instanceof Date ? r.fecha.toISOString() : r.fecha,
      compro: r.compro,
      totalMembresias: Number(r.totalMembresias),
    })),
    totalReferidos: referidos.length,
    comprados: referidos.filter((r) => r.compro).length,
    totalMembresias,
    progreso,
    cuponesGanados: gcGanadas,
    comprasPropias,
    mpgc,
    cupones: cupones.map((c) => ({
      ...c,
      fechaCreacion: c.fechaCreacion instanceof Date ? c.fechaCreacion.toISOString() : c.fechaCreacion,
      fechaUso: c.fechaUso instanceof Date ? c.fechaUso.toISOString() : c.fechaUso,
    })),
    cuponesDisponibles: cupones.filter((c) => !c.usado).length,
  });
}
