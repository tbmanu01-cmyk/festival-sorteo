// npx node prisma/seed.js
const { PrismaClient } = require("../node_modules/@prisma/client");
const bcrypt = require("../node_modules/bcryptjs");

const prisma = new PrismaClient();

const NOMBRES = ["Santiago","Valentina","Sebastián","Camila","Mateo","Sara","Nicolás","Mariana","Alejandro","Laura","Daniel","Isabella","Andrés","Daniela","David","Sofía","Juan","Natalia","Carlos","Paula","Felipe","Andrea","Miguel","Juliana","Diego","Manuela","Esteban","María","Gabriel","Luisa","Ricardo","Alejandra","Fernando","Catalina","Javier","Diana","Sergio","Paola","Mauricio","Tatiana","Cristian","Leidy","Oswaldo","Melissa","Jhon","Carolina","Wilson","Gloria","Héctor","Adriana"];
const APELLIDOS = ["García","Rodríguez","Martínez","López","González","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Morales","Jiménez","Herrera","Medina","Castro","Vargas","Romero","Gómez","Díaz","Reyes","Suárez","Mendoza","Ruiz","Álvarez","Ortega","Guerrero","Muñoz","Salazar","Rojas","Patiño","Cárdenas","Castaño","Ospina","Valencia","Ríos","Londoño","Arango","Acosta","Mejía"];
const CIUDADES = [["Bogotá","Cundinamarca"],["Medellín","Antioquia"],["Cali","Valle del Cauca"],["Barranquilla","Atlántico"],["Cartagena","Bolívar"],["Bucaramanga","Santander"],["Pereira","Risaralda"],["Manizales","Caldas"],["Ibagué","Tolima"],["Cúcuta","Norte de Santander"],["Villavicencio","Meta"],["Pasto","Nariño"],["Armenia","Quindío"],["Montería","Córdoba"],["Neiva","Huila"]];
const BANCOS = ["Bancolombia","Davivienda","BBVA","Banco de Bogotá","Nequi","Daviplata","Banco Popular","Colpatria","AV Villas"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function doc() { return String(randInt(10000000, 1999999999)); }
function cel() { return "3" + String(randInt(100000000, 299999999)); }

async function main() {
  console.log("🌱 Iniciando seed de 200 usuarios de prueba...");

  const hash = await bcrypt.hash("Test123!", 10);
  const usuarios = [];

  for (let i = 1; i <= 200; i++) {
    const nombre = rand(NOMBRES);
    const apellido = rand(APELLIDOS);
    const [ciudad, depto] = rand(CIUDADES);
    const correo = `usuario${i}@prueba.com`;

    try {
      const u = await prisma.user.create({
        data: {
          nombre,
          apellido,
          documento: doc(),
          correo,
          celular: cel(),
          ciudad,
          departamento: depto,
          banco: rand(BANCOS),
          tipoCuenta: rand(["Ahorros", "Corriente"]),
          cuentaBancaria: String(randInt(1000000000, 9999999999)),
          password: hash,
          rol: "USER",
          activo: true,
          saldoPuntos: rand([0, 0, 0, randInt(50000, 500000)]),
        },
      });
      usuarios.push(u);
      if (i % 50 === 0) console.log(`  ✓ ${i}/200 usuarios creados`);
    } catch {
      // documento duplicado — reintenta
      i--;
    }
  }

  // Crear árbol de referidos (los primeros 60 forman una red)
  console.log("🔗 Creando red de referidos...");
  const raices = usuarios.slice(0, 10);
  const nivel1 = usuarios.slice(10, 40);
  const nivel2 = usuarios.slice(40, 70);

  for (let i = 0; i < nivel1.length; i++) {
    const referidor = raices[i % raices.length];
    await prisma.referido.create({
      data: { referidorId: referidor.id, referidoId: nivel1[i].id },
    }).catch(() => {});
  }
  for (let i = 0; i < nivel2.length; i++) {
    const referidor = nivel1[i % nivel1.length];
    await prisma.referido.create({
      data: { referidorId: referidor.id, referidoId: nivel2[i].id },
    }).catch(() => {});
  }

  // Comprar cajas para 40 usuarios aleatorios
  console.log("🎁 Asignando cajas compradas...");
  const compradores = usuarios.slice(0, 40);
  let numeroCaja = 0;
  for (const u of compradores) {
    const cantidad = randInt(1, 15);
    for (let j = 0; j < cantidad && numeroCaja < 9999; j++) {
      numeroCaja++;
      await prisma.caja.create({
        data: {
          numero: String(numeroCaja).padStart(4, "0"),
          estado: "VENDIDA",
          userId: u.id,
          fechaCompra: new Date(Date.now() - randInt(0, 30) * 86400000),
        },
      }).catch(() => {});
    }
  }

  console.log("✅ Seed completado.");
  console.log(`   👤 200 usuarios | contraseña: Test123!`);
  console.log(`   🔗 Red de referidos: 10 raíces → 30 nivel1 → 30 nivel2`);
  console.log(`   🎁 ~40 usuarios con cajas compradas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
