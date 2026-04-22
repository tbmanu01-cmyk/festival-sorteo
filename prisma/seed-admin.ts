import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log("👤 Creando usuario administrador...");

  const correo = "admin@festival.com";
  const existente = await prisma.user.findUnique({ where: { correo } });

  if (existente) {
    console.log("ℹ️  El administrador ya existe.");
    return;
  }

  const passwordHash = await bcrypt.hash("Admin123!", 12);

  await prisma.user.create({
    data: {
      nombre: "Admin",
      apellido: "Festival",
      documento: "0000000000",
      correo,
      celular: "3000000000",
      ciudad: "Bogotá",
      departamento: "Bogotá D.C.",
      banco: "Bancolombia",
      tipoCuenta: "AHORROS",
      cuentaBancaria: "0000000000",
      password: passwordHash,
      rol: "ADMIN",
      confirmado: true,
    },
  });

  console.log("✅ Administrador creado:");
  console.log("   Email:    admin@festival.com");
  console.log("   Password: Admin123!");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
