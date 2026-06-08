/**
 * Genera 800 usuarios ficticios en la red de MANUEL FREITAS (tbmanu03@gmail.com)
 * Estructura: 66 familias completas (792) + 1 familia parcial (8) = 800 usuarios
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CORREO_MANUEL = "tbmanu03@gmail.com";
const TOTAL_USUARIOS = 800;
const FAMILIAS_COMPLETAS = Math.floor(TOTAL_USUARIOS / 12); // 66
const RESTANTES = TOTAL_USUARIOS % 12;                      // 8  → 3 hijos + 5 nietos

const CIUDADES = ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Bucaramanga","Pereira","Manizales","Cúcuta","Ibagué"];
const BANCOS   = ["Bancolombia","Davivienda","BBVA","Banco de Bogotá","Nequi","Daviplata"];

const NOMBRES = [
  "Juan","Carlos","Andrés","Luis","Jorge","Miguel","José","Sebastián","Alejandro","Daniel",
  "David","Diego","Felipe","Nicolás","Camilo","Santiago","Mauricio","Hernán","Oscar","Edgar",
  "Fabio","Mario","Wilmar","Jhon","Steven","Yeison","Cristian","Edwin","Ferney","Jhonatan",
  "Bryan","Kevin","Freddy","Iván","Álvaro","Gerardo","Ramiro","Nelson","Fabián","Julio",
  "María","Ana","Catalina","Laura","Valentina","Luisa","Diana","Carolina","Adriana","Paola",
  "Sandra","Liliana","Viviana","Marcela","Alejandra","Natalia","Daniela","Juliana","Vanessa",
  "Yuliana","Yessica","Gloria","Carmen","Rosa","Elizabeth","Martha","Claudia","Amparo","Leidy",
  "Lina","Johana","Lorena","Milena","Angela","Patricia","Olga","Esperanza","Andrea","Mónica",
];

const APELLIDOS = [
  "García","Martínez","López","González","Rodríguez","Hernández","Pérez","Ramírez","Torres","Vargas",
  "Morales","Castillo","Jiménez","Reyes","Ortiz","Silva","Ramos","Rojas","Cruz","Medina",
  "Suárez","Díaz","Sánchez","Betancur","Mosquera","Palacios","Orozco","Zapata","Cárdenas","Buitrago",
  "Ríos","Arbeláez","Ochoa","Zuluaga","Giraldo","Vélez","Gutiérrez","Mejía","Osorio","Castaño",
  "Arango","Quintero","Posada","Londoño","Hurtado","Agudelo","Herrera","Serrano","Molina","Cano",
  "Pulido","Escobar","Pineda","Acosta","Flórez","Naranjo","Parra","Castro","Arias","Salazar",
  "Gómez","Valencia","Cardona","Duque","Bedoya","Montoya","Correa","Muñoz","Franco","Gaviria",
];

function uid()        { return crypto.randomUUID(); }
function rand(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
function celular()    { return "3" + String(Math.floor(100_000_000 + Math.random() * 900_000_000)); }
function doc()        { return String(Math.floor(10_000_000 + Math.random() * 90_000_000)); }
function codigoRef()  {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function correoM(n)   { return `ficticiom${n}@red.test`; }

async function crearUsuario(num, daysAgo) {
  const id  = uid();
  const ref = codigoRef();
  await prisma.$executeRaw`
    INSERT INTO users (
      id, nombre, apellido, documento, correo, celular,
      ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
      password, rol, "saldoPuntos", activo, confirmado,
      "fechaRegistro", "codigoRef"
    ) VALUES (
      ${id},
      ${rand(NOMBRES)},
      ${rand(APELLIDOS)},
      ${doc()},
      ${correoM(num)},
      ${celular()},
      ${rand(CIUDADES)},
      ${"Cundinamarca"},
      ${rand(BANCOS)},
      ${"AHORROS"},
      ${String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000))},
      ${PASS_HASH},
      'USER'::"Rol",
      0, true, true,
      NOW() - (${daysAgo} || ' days')::interval,
      ${ref}
    )
    ON CONFLICT DO NOTHING
  `;
  return id;
}

let PASS_HASH = "";

async function main() {
  const manuel = await prisma.user.findUnique({ where: { correo: CORREO_MANUEL } });
  if (!manuel) { console.error("❌ Usuario no encontrado:", CORREO_MANUEL); process.exit(1); }
  console.log(`✅ Manuel encontrado: ${manuel.nombre} ${manuel.apellido} (${manuel.id})`);

  const bcrypt = require("bcryptjs");
  PASS_HASH = await bcrypt.hash("Ficticio123!", 10);
  console.log("🔑 Hash generado");

  let contador = 0;
  const inicio = Date.now();

  // ── 66 familias completas ──────────────────────────────────────────────────
  for (let familia = 1; familia <= FAMILIAS_COMPLETAS; familia++) {
    const hijosIds = [];

    for (let h = 0; h < 3; h++) {
      const num = ++contador;
      const id  = await crearUsuario(num, familia * 30 + h);
      await prisma.referido.create({ data: { referidorId: manuel.id, referidoId: id, compro: true } });
      hijosIds.push(id);
    }

    for (const hijoId of hijosIds) {
      for (let n = 0; n < 3; n++) {
        const num = ++contador;
        const id  = await crearUsuario(num, familia * 10 + n);
        await prisma.referido.create({ data: { referidorId: hijoId, referidoId: id, compro: true } });
      }
    }

    if (familia % 10 === 0) {
      const seg = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(`  📦 ${familia}/${FAMILIAS_COMPLETAS} familias completas (${contador} usuarios) — ${seg}s`);
    }
  }

  // ── Familia parcial (8 usuarios restantes) ────────────────────────────────
  // 8 = 3 hijos + 5 nietos  →  hijo1:3 nietos · hijo2:2 nietos · hijo3:0 nietos
  console.log(`\n  🔧 Creando familia parcial (${RESTANTES} usuarios)...`);

  const hijosParcialesIds = [];
  for (let h = 0; h < 3; h++) {
    const num = ++contador;
    const id  = await crearUsuario(num, 10 + h);
    await prisma.referido.create({ data: { referidorId: manuel.id, referidoId: id, compro: true } });
    hijosParcialesIds.push(id);
  }

  // nietos por hijo según los restantes después de los 3 hijos
  const repartir = [3, 2, 0]; // 5 nietos total = 3+2+0
  for (let hi = 0; hi < hijosParcialesIds.length; hi++) {
    for (let n = 0; n < repartir[hi]; n++) {
      const num = ++contador;
      const id  = await crearUsuario(num, 5 + n);
      await prisma.referido.create({ data: { referidorId: hijosParcialesIds[hi], referidoId: id, compro: true } });
    }
  }

  const seg = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`\n✅ Listo: ${contador} usuarios creados en ${seg}s`);
  console.log(`   ${FAMILIAS_COMPLETAS} familias completas + 1 familia parcial en la red de Manuel Freitas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
