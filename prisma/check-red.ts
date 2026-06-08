import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const top = await prisma.referido.groupBy({
    by: ["referidorId"],
    _count: { referidoId: true },
    orderBy: { _count: { referidoId: "desc" } },
    take: 8,
  });

  console.log("\nTop usuarios con más referidos directos:\n");
  for (const r of top) {
    const u = await prisma.user.findUnique({
      where: { id: r.referidorId },
      select: { correo: true, nombre: true, apellido: true },
    });
    console.log(`  ${r._count.referidoId} referidos — ${u?.nombre} ${u?.apellido} (${u?.correo})`);
  }

  // Buscar el admin también
  const admin = await prisma.user.findUnique({
    where: { correo: "admin@festival.com" },
    select: { id: true },
  });
  if (admin) {
    const refAdmin = await prisma.referido.count({ where: { referidorId: admin.id } });
    console.log(`\n  Admin tiene: ${refAdmin} referidos directos`);
  }
}

main().finally(() => prisma.$disconnect());
