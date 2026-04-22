import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const LOTE = 500;

async function main() {
  console.log("🌱 Iniciando seed de cajas...");

  const existentes = await prisma.caja.count();
  if (existentes > 0) {
    console.log(`ℹ️  Ya existen ${existentes} cajas. Ejecuta con --force para recrear.`);
    if (!process.argv.includes("--force")) {
      await prisma.$disconnect();
      return;
    }
    console.log("🗑️  Eliminando cajas existentes...");
    await prisma.caja.deleteMany();
  }

  console.log("📦 Creando 10,000 cajas (0000 - 9999)...");

  for (let inicio = 0; inicio < 10000; inicio += LOTE) {
    const fin = Math.min(inicio + LOTE, 10000);
    const cajas = Array.from({ length: fin - inicio }, (_, i) => ({
      numero: String(inicio + i).padStart(4, "0"),
    }));

    await prisma.caja.createMany({ data: cajas, skipDuplicates: true });
    process.stdout.write(`\r   Progreso: ${fin}/10000 cajas`);
  }

  console.log("\n✅ ¡Listo! 10,000 cajas creadas exitosamente.");
  const total = await prisma.caja.count();
  console.log(`   Total en BD: ${total} cajas`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
