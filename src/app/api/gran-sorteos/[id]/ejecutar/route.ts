import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  type GsRow = {
    id: string;
    nombre: string;
    premioDescripcion: string;
    estado: string;
  };

  const [gs] = await prisma.$queryRaw<GsRow[]>`
    SELECT id, nombre, "premioDescripcion", estado::text
    FROM grandes_sorteos WHERE id = ${id} LIMIT 1
  `;

  if (!gs) {
    return NextResponse.json({ mensaje: "Gran Sorteo no encontrado." }, { status: 404 });
  }
  if (gs.estado === "FINALIZADO") {
    return NextResponse.json({ mensaje: "Este Gran Sorteo ya fue ejecutado." }, { status: 409 });
  }

  type CajaRow = {
    id: string;
    numero: string;
    userId: string;
    nombre: string;
    apellido: string;
    correo: string;
  };

  const cajas = await prisma.$queryRaw<CajaRow[]>`
    SELECT c.id, c.numero, c."userId",
           u.nombre, u.apellido, u.correo
    FROM cajas c
    JOIN users u ON u.id = c."userId"
    WHERE c."granSorteoId" = ${id}
      AND c.estado = 'VENDIDA'
      AND c."userId" IS NOT NULL
  `;

  if (cajas.length === 0) {
    return NextResponse.json(
      { mensaje: "No hay cajas vendidas para este Gran Sorteo." },
      { status: 400 }
    );
  }

  const idx = Math.floor(Math.random() * cajas.length);
  const cajaGanadora = cajas[idx];
  const numeroGanador = cajaGanadora.numero;

  const ganadores = [{
    userId: cajaGanadora.userId,
    nombre: cajaGanadora.nombre,
    apellido: cajaGanadora.apellido,
    correo: cajaGanadora.correo,
    numeroCaja: cajaGanadora.numero,
  }];

  await prisma.$executeRaw`
    UPDATE grandes_sorteos
    SET estado = 'FINALIZADO'::"EstadoSorteo",
        "numeroGanador" = ${numeroGanador},
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({
    mensaje: "¡Gran Sorteo ejecutado exitosamente!",
    numeroGanador,
    ganadores,
  });
}
