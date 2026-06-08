/**
 * Actualiza los usuarios ficticios (@red.test) con nombres y apellidos colombianos reales.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const NOMBRES = [
  "Juan","Carlos","Andrés","Luis","Jorge","Miguel","José","Sebastián","Alejandro","Daniel",
  "David","Diego","Felipe","Nicolás","Camilo","Santiago","Mauricio","Hernán","Oscar","Edgar",
  "Fabio","Mario","Wilmar","Jhon","Steven","Yeison","Cristian","Edwin","Ferney","Jhonatan",
  "Bryan","Kevin","Freddy","Iván","Álvaro","Gerardo","Ramiro","Nelson","Fabián","Julio",
  "Henry","Dario","Rubén","Pedro","Esteban","Rodrigo","Gustavo","Antonio","Francisco","Sergio",
  "María","Ana","Catalina","Laura","Valentina","Luisa","Diana","Carolina","Adriana","Paola",
  "Sandra","Liliana","Viviana","Marcela","Alejandra","Natalia","Daniela","Juliana","Vanessa",
  "Yuliana","Yessica","Gloria","Carmen","Rosa","Elizabeth","Martha","Claudia","Amparo","Leidy",
  "Lina","Johana","Lorena","Milena","Angela","Patricia","Olga","Nidia","Esperanza","Consuelo",
  "Berenice","Erika","Shirley","Andrea","Mónica","Luz","Marta","Yolanda","Flor","Isabella",
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

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const ficticios = await prisma.$queryRaw`
    SELECT id FROM users WHERE correo LIKE '%@red.test'
  `;

  console.log(`🔄 Actualizando ${ficticios.length} usuarios ficticios...`);
  const inicio = Date.now();

  for (const u of ficticios) {
    const nombre   = rand(NOMBRES);
    const apellido = rand(APELLIDOS);
    await prisma.$executeRaw`UPDATE users SET nombre = ${nombre}, apellido = ${apellido} WHERE id = ${u.id}`;
  }

  console.log(`✅ ${ficticios.length} usuarios actualizados en ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
