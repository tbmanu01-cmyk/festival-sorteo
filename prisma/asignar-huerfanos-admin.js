/**
 * Migración: asigna todos los usuarios huérfanos (sin referidor) como hijos del admin.
 * Huérfano = usuario USER sin ningún registro en referidos.referidoId apuntándole.
 * El admin no tiene límite de familias — es la raíz de toda la red.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Encontrar el admin
  const admin = await prisma.user.findFirst({
    where: { rol: "ADMIN" },
    select: { id: true, nombre: true, correo: true },
  });
  if (!admin) { console.error("❌ No hay usuario ADMIN en la base de datos."); process.exit(1); }
  console.log(`✅ Admin: ${admin.nombre} (${admin.correo}) — id: ${admin.id}`);

  // 2. Encontrar todos los usuarios huérfanos (sin referido que les apunte)
  const huerfanos = await prisma.$queryRaw`
    SELECT u.id, u.nombre, u.apellido, u.correo
    FROM users u
    WHERE u.rol = 'USER'::"Rol"
      AND u.id != ${admin.id}
      AND NOT EXISTS (
        SELECT 1 FROM referidos r WHERE r."referidoId" = u.id
      )
    ORDER BY u."fechaRegistro" ASC
  `;

  console.log(`\n🔍 ${huerfanos.length} usuarios huérfanos encontrados (sin referidor).`);
  if (huerfanos.length === 0) {
    console.log("   Nada que hacer — todos los usuarios ya tienen referidor.");
    return;
  }

  // 3. Para cada huérfano, crear Referido con referidorId = admin
  console.log(`\n🔗 Vinculando huérfanos al admin...`);
  let vinculados = 0;
  let yaExistian = 0;

  for (const u of huerfanos) {
    // Verificar si ya tiene compra (para establecer compro correctamente)
    const [{ compras }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS compras FROM cajas WHERE "userId" = ${u.id} AND estado = 'VENDIDA'::"EstadoCaja"
    `;
    const compro = Number(compras) > 0;

    const refId = require("crypto").randomUUID();
    const filas = await prisma.$executeRaw`
      INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
      VALUES (${refId}, ${admin.id}, ${u.id}, NOW(), ${compro})
      ON CONFLICT ("referidoId") DO NOTHING
    `;

    if (Number(filas) > 0) {
      vinculados++;
      if (vinculados <= 10 || vinculados % 50 === 0) {
        console.log(`   → ${u.nombre} ${u.apellido} (${u.correo}) — compro: ${compro}`);
      }
    } else {
      yaExistian++;
    }
  }

  console.log(`\n✅ Listo:`);
  console.log(`   ${vinculados} usuarios vinculados como hijos del admin`);
  if (yaExistian > 0) console.log(`   ${yaExistian} ya tenían referido (se omitieron)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
