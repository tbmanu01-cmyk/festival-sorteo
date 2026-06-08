/**
 * Asigna un avatar aleatorio (preset) a todos los usuarios ficticios (@red.test).
 * Usa un solo UPDATE en PostgreSQL con random() — muy rápido.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const AVATARES = [
  "/avatars/man_01.png",
  "/avatars/man_02.png",
  "/avatars/man_03.png",
  "/avatars/woman_01.png",
  "/avatars/woman_02.png",
  "/avatars/woman_03.png",
];

async function main() {
  // Contar usuarios antes
  const [{ total }] = await prisma.$queryRaw`
    SELECT COUNT(*) AS total FROM users WHERE correo LIKE '%@red.test'
  `;
  console.log(`🎨 Asignando avatares a ${total} usuarios ficticios...`);

  // Un solo UPDATE: elige 1 de 6 avatares al azar por fila
  const actualizado = await prisma.$executeRaw`
    UPDATE users
    SET avatar = (ARRAY[
      '/avatars/man_01.png',
      '/avatars/man_02.png',
      '/avatars/man_03.png',
      '/avatars/woman_01.png',
      '/avatars/woman_02.png',
      '/avatars/woman_03.png'
    ])[floor(random() * 6 + 1)::int]
    WHERE correo LIKE '%@red.test'
  `;

  console.log(`✅ ${actualizado} usuarios actualizados`);

  // Verificar distribución
  const dist = await prisma.$queryRaw`
    SELECT avatar, COUNT(*) AS cantidad
    FROM users
    WHERE correo LIKE '%@red.test'
    GROUP BY avatar
    ORDER BY avatar
  `;
  console.log("\n📊 Distribución:");
  for (const row of dist) {
    console.log(`   ${row.avatar.padEnd(24)} → ${row.cantidad}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
