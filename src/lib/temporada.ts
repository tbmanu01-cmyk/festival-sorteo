import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

// Devuelve la temporada abierta (fin = null). Si no existe ninguna (primera
// vez que corre el sistema), crea la temporada #1.
export async function obtenerOCrearTemporadaActual(tx: Tx) {
  const abierta = await tx.temporada.findFirst({ where: { fin: null }, orderBy: { numero: "desc" } });
  if (abierta) return abierta;

  const ultima = await tx.temporada.findFirst({ orderBy: { numero: "desc" } });
  return tx.temporada.create({ data: { numero: (ultima?.numero ?? 0) + 1 } });
}
