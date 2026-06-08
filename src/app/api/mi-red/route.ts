import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface MiembroRed {
  id: string;
  nombre: string;
  apellido: string;
  fechaRegistro: string;
  ciudad: string;
  avatar?: string | null;
}

interface Familia {
  numero: number;
  hijos: (MiembroRed | null)[];
  nietos: (MiembroRed | null)[][];
  totalMiembros: number;
  completa: boolean;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const yo = await prisma.user.findUnique({
    where: { correo: session.user.email },
    select: { id: true, nombre: true, apellido: true, ciudad: true, fechaRegistro: true, codigoRef: true, avatar: true },
  });
  if (!yo) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Todos mis referidos directos (nivel 1), ordenados por fecha de registro
  const referidosDirectos = await prisma.referido.findMany({
    where: { referidorId: yo.id },
    orderBy: { fecha: "asc" },
    include: {
      referido: {
        select: { id: true, nombre: true, apellido: true, fechaRegistro: true, ciudad: true, codigoRef: true, avatar: true },
      },
    },
  });

  const hijos = referidosDirectos.map((r) => ({
    id: r.referido.id,
    nombre: r.referido.nombre,
    apellido: r.referido.apellido,
    fechaRegistro: r.referido.fechaRegistro.toISOString(),
    ciudad: r.referido.ciudad,
    codigoRef: r.referido.codigoRef,
    avatar: r.referido.avatar,
    refId: r.id,
    compro: r.compro,
  }));

  // Para cada hijo, buscar sus referidos directos (nietos míos)
  const nietosMap: Record<string, MiembroRed[]> = {};
  for (const hijo of hijos) {
    const refs = await prisma.referido.findMany({
      where: { referidorId: hijo.id },
      orderBy: { fecha: "asc" },
      include: {
        referido: {
          select: { id: true, nombre: true, apellido: true, fechaRegistro: true, ciudad: true, codigoRef: true, avatar: true },
        },
      },
    });
    nietosMap[hijo.id] = refs.map((r) => ({
      id: r.referido.id,
      nombre: r.referido.nombre,
      apellido: r.referido.apellido,
      fechaRegistro: r.referido.fechaRegistro.toISOString(),
      ciudad: r.referido.ciudad,
      codigoRef: r.referido.codigoRef,
      avatar: r.referido.avatar,
      refId: r.id,
      compro: r.compro,
    }));
  }

  // Agrupar en familias: cada familia tiene 3 slots nivel 1 y hasta 9 nietos (3 por hijo)
  // Familia se considera completa cuando los 3 hijos tienen cada uno 3 nietos (12 total)
  const familias: Familia[] = [];
  let idxHijo = 0;
  let familiaNum = 1;

  // Crear familias mientras haya hijos
  while (idxHijo < hijos.length || familias.length === 0) {
    const hijosBloque = hijos.slice(idxHijo, idxHijo + 3);
    idxHijo += 3;

    // 3 slots de nivel 1 (rellenar con null si no hay)
    const slotsHijos: (MiembroRed | null)[] = [
      hijosBloque[0] ?? null,
      hijosBloque[1] ?? null,
      hijosBloque[2] ?? null,
    ];

    // Para cada slot hijo, 3 slots de nietos
    const slotsNietos: (MiembroRed | null)[][] = slotsHijos.map((hijo) => {
      if (!hijo) return [null, null, null];
      const nietos = (nietosMap[hijo.id] ?? []).slice(0, 3);
      return [
        nietos[0] ?? null,
        nietos[1] ?? null,
        nietos[2] ?? null,
      ];
    });

    const totalMiembros =
      slotsHijos.filter(Boolean).length +
      slotsNietos.flat().filter(Boolean).length;

    const completa =
      slotsHijos.every(Boolean) &&
      slotsNietos.every((row) => row.every(Boolean));

    familias.push({
      numero: familiaNum++,
      hijos: slotsHijos,
      nietos: slotsNietos,
      totalMiembros,
      completa,
    });

    // Solo crear más familias si la actual está completa y hay más hijos
    if (!completa || idxHijo >= hijos.length) break;
  }

  const totalMiembros = familias.reduce((s, f) => s + f.totalMiembros, 0);

  return NextResponse.json({
    yo: {
      id: yo.id,
      nombre: yo.nombre,
      apellido: yo.apellido,
      ciudad: yo.ciudad,
      fechaRegistro: yo.fechaRegistro.toISOString(),
      codigoRef: yo.codigoRef,
      avatar: yo.avatar,
    },
    familias,
    totalFamilias: familias.length,
    totalMiembros,
  });
}
