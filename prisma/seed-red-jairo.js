/**
 * Genera 1200 usuarios ficticios en la red de JAIRO GONZALEZ
 * Estructura: 100 familias × 12 miembros (3 hijos + 9 nietos)
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CORREO_JAIRO = "tallerdigitalsas@gmail.com";
const TOTAL_FAMILIAS = 100;

const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales", "Cúcuta", "Ibagué"];
const BANCOS   = ["Bancolombia", "Davivienda", "BBVA", "Banco de Bogotá", "Nequi", "Daviplata"];

function uid() { return crypto.randomUUID(); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function celular() { return "3" + String(Math.floor(100_000_000 + Math.random() * 900_000_000)); }
function doc() { return String(Math.floor(10_000_000 + Math.random() * 90_000_000)); }
function codigoRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function main() {
  // 1 — Encontrar a Jairo
  const jairo = await prisma.user.findUnique({ where: { correo: CORREO_JAIRO } });
  if (!jairo) { console.error("❌ Usuario no encontrado:", CORREO_JAIRO); process.exit(1); }
  console.log(`✅ Jairo encontrado: ${jairo.nombre} ${jairo.apellido} (${jairo.id})`);

  // 2 — Hash fijo para todos los usuarios ficticios (password: Ficticio123!)
  const bcrypt = require("bcryptjs");
  const passHash = await bcrypt.hash("Ficticio123!", 10);
  console.log("🔑 Hash generado");

  // 3 — Crear usuarios y referidos por familias
  let contador = 0;
  const inicio = Date.now();

  for (let familia = 1; familia <= TOTAL_FAMILIAS; familia++) {
    const hijosIds = [];

    // — 3 hijos directos de Jairo —
    for (let h = 0; h < 3; h++) {
      const id  = uid();
      const num = ++contador;
      const ref = codigoRef();

      await prisma.$executeRaw`
        INSERT INTO users (
          id, nombre, apellido, documento, correo, celular,
          ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
          password, rol, "saldoPuntos", activo, confirmado,
          "fechaRegistro", "codigoRef"
        ) VALUES (
          ${id},
          ${"Ficticio"},
          ${`F${num}`},
          ${doc()},
          ${`ficticio${num}@red.test`},
          ${celular()},
          ${rand(CIUDADES)},
          ${"Cundinamarca"},
          ${rand(BANCOS)},
          ${"AHORROS"},
          ${String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000))},
          ${passHash},
          'USER'::"Rol",
          0, true, true,
          NOW() - (${familia * 30 + h} || ' days')::interval,
          ${ref}
        )
        ON CONFLICT DO NOTHING
      `;

      await prisma.referido.create({
        data: { referidorId: jairo.id, referidoId: id, compro: true },
      });

      hijosIds.push(id);
    }

    // — 3 nietos por cada hijo (9 total) —
    for (const hijoId of hijosIds) {
      for (let n = 0; n < 3; n++) {
        const id  = uid();
        const num = ++contador;
        const ref = codigoRef();

        await prisma.$executeRaw`
          INSERT INTO users (
            id, nombre, apellido, documento, correo, celular,
            ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
            password, rol, "saldoPuntos", activo, confirmado,
            "fechaRegistro", "codigoRef"
          ) VALUES (
            ${id},
            ${"Ficticio"},
            ${`F${num}`},
            ${doc()},
            ${`ficticio${num}@red.test`},
            ${celular()},
            ${rand(CIUDADES)},
            ${"Cundinamarca"},
            ${rand(BANCOS)},
            ${"AHORROS"},
            ${String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000))},
            ${passHash},
            'USER'::"Rol",
            0, true, true,
            NOW() - (${familia * 10 + n} || ' days')::interval,
            ${ref}
          )
          ON CONFLICT DO NOTHING
        `;

        await prisma.referido.create({
          data: { referidorId: hijoId, referidoId: id, compro: true },
        });
      }
    }

    if (familia % 10 === 0) {
      const seg = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(`  📦 ${familia}/100 familias (${contador} usuarios) — ${seg}s`);
    }
  }

  console.log(`\n✅ Listo: ${contador} usuarios creados en ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
  console.log(`   100 familias completas en la red de Jairo González`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
