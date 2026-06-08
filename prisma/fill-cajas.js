// Llena los 10,000 slots de membresías (0000-9999) que falten en la BD.
// Cajas ya existentes (RESERVADA / VENDIDA) NO se tocan.
// Uso: node prisma/fill-cajas.js
const { PrismaClient } = require("../node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Consultando cajas existentes...");
  const existentes = await prisma.caja.findMany({ select: { numero: true } });
  const set = new Set(existentes.map((c) => c.numero));

  const faltantes = [];
  for (let i = 0; i <= 9999; i++) {
    const num = String(i).padStart(4, "0");
    if (!set.has(num)) faltantes.push({ numero: num, estado: "DISPONIBLE" });
  }

  console.log(`✅ Existentes: ${set.size} | Faltantes: ${faltantes.length}`);

  if (faltantes.length === 0) {
    console.log("Nada que hacer, todas las cajas ya existen.");
    return;
  }

  const LOTE = 500;
  let creadas = 0;
  for (let i = 0; i < faltantes.length; i += LOTE) {
    await prisma.caja.createMany({
      data: faltantes.slice(i, i + LOTE),
      skipDuplicates: true,
    });
    creadas += Math.min(LOTE, faltantes.length - i);
    console.log(`  Creadas ${creadas} / ${faltantes.length}...`);
  }

  console.log(`\n🎉 Listo. ${faltantes.length} cajas DISPONIBLES añadidas.`);
  const total = await prisma.caja.count();
  console.log(`   Total en BD: ${total} cajas (debería ser 10.000)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
