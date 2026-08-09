import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

// Devuelve la temporada abierta (fin = null) de un tier específico. Si no
// existe ninguna (primera vez que corre ese tier), crea su temporada #1.
export async function obtenerOCrearTemporadaActual(tx: Tx, tipoMembresiaId: string) {
  const abierta = await tx.temporada.findFirst({
    where: { tipoMembresiaId, fin: null },
    orderBy: { numero: "desc" },
  });
  if (abierta) return abierta;

  const ultima = await tx.temporada.findFirst({
    where: { tipoMembresiaId },
    orderBy: { numero: "desc" },
  });
  return tx.temporada.create({ data: { tipoMembresiaId, numero: (ultima?.numero ?? 0) + 1 } });
}
