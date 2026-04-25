import "dotenv/config";
import {
  PrismaClient,
  CategoriaPremio,
  TipoTransaccion,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// ─── Usuarios protegidos ──────────────────────────────────────────────────────
const PROTECTED = ["admin@festival.com", "manuel@prueba.com"];

// ─── Datos colombianos ────────────────────────────────────────────────────────
const NM = [
  "Carlos","Andrés","Juan","Miguel","Luis","Jorge","David","Daniel",
  "Eduardo","Alejandro","Felipe","Sebastián","José","Santiago","Jhon",
  "Diego","Camilo","Roberto","Guillermo","Ricardo","Mauricio","Iván",
  "Cristian","Fabio","Oscar","Pedro","Fernando","Rafael","Ernesto","Héctor",
];
const NF = [
  "María","Ana","Laura","Carolina","Valentina","Juliana","Catalina","Paola",
  "Marcela","Sandra","Diana","Patricia","Adriana","Natalia","Gabriela","Sofía",
  "Isabella","Camila","Luisa","Mónica","Gloria","Claudia","Alejandra","Fernanda",
  "Ángela","Liliana","Viviana","Beatriz","Esperanza","Rosa",
];
const AP = [
  "García","Rodríguez","Martínez","López","González","Pérez","Sánchez","Romero",
  "Torres","Flores","Medina","Herrera","Gómez","Castro","Vargas","Moreno",
  "Ramos","Mendoza","Reyes","Cruz","Ortega","Díaz","Suárez","Cárdenas",
  "Ramírez","Jiménez","Mora","Silva","Guerrero","Pardo","Nieto","Rojas",
  "Ospina","Valencia","Zapata","Cortés","Acosta","Gutiérrez","Pineda","Castaño",
];
const CIUDADES: [string, string][] = [
  ["Bogotá","Bogotá D.C."],["Medellín","Antioquia"],["Cali","Valle del Cauca"],
  ["Barranquilla","Atlántico"],["Cartagena","Bolívar"],["Bucaramanga","Santander"],
  ["Manizales","Caldas"],["Pereira","Risaralda"],["Santa Marta","Magdalena"],
  ["Cúcuta","Norte de Santander"],["Ibagué","Tolima"],["Villavicencio","Meta"],
  ["Pasto","Nariño"],["Montería","Córdoba"],["Neiva","Huila"],
];
const BANCOS = [
  "Bancolombia","Davivienda","Banco de Bogotá","BBVA","Nequi",
  "Banco Popular","Scotiabank Colpatria","Banco Caja Social","Banco AV Villas",
];
const PREFIJOS = [
  "300","301","302","304","305","310","311","312","313",
  "314","315","316","317","318","319","320","321","322",
];
const DOMINIOS = ["gmail.com","hotmail.com","outlook.com"];
const CUENTAS = ["AHORROS","CORRIENTE"];

// ─── Utilidades ───────────────────────────────────────────────────────────────
const rand = (a: number, b: number) =>
  Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function mkEmail(n: string, a: string, used: Set<string>): string {
  const base = `${norm(n)}.${norm(a)}`;
  let email = `${base}@${pick(DOMINIOS)}`;
  let i = 1;
  while (used.has(email)) email = `${base}${i++}@${pick(DOMINIOS)}`;
  used.add(email);
  return email;
}

function mkDoc(used: Set<string>): string {
  let d: string;
  do { d = String(rand(10_000_000, 1_099_999_999)); } while (used.has(d));
  used.add(d);
  return d;
}

function mkRef(used: Set<string>): string {
  let c: string;
  do { c = Math.random().toString(36).substring(2, 10).toUpperCase(); }
  while (used.has(c));
  used.add(c);
  return c;
}

function randBetween(a: Date, b: Date): Date {
  return new Date(a.getTime() + Math.random() * (b.getTime() - a.getTime()));
}

// ─── Limpieza ────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log("🗑️  Limpiando datos de prueba anteriores...");
  const testUsers = await prisma.user.findMany({
    where: { correo: { notIn: PROTECTED } },
    select: { id: true },
  });
  const ids = testUsers.map((u) => u.id);

  await prisma.premio.deleteMany();
  await prisma.retiro.deleteMany({ where: { userId: { in: ids } } });
  await prisma.transaccion.deleteMany({ where: { userId: { in: ids } } });
  await prisma.cupon.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.referido.deleteMany({
    where: { OR: [{ referidorId: { in: ids } }, { referidoId: { in: ids } }] },
  });
  await prisma.caja.updateMany({
    where: { userId: { in: ids } },
    data: { userId: null, estado: "DISPONIBLE", fechaCompra: null, idCompra: null },
  });
  await prisma.sorteo.deleteMany();
  await prisma.sorteoAnticipado.deleteMany();
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`   Eliminados ${ids.length} usuarios y sus datos asociados.`);
}

// ─── Crear 120 usuarios ───────────────────────────────────────────────────────
async function createUsers(hash: string): Promise<string[]> {
  console.log("👥 Creando 120 usuarios ficticios colombianos...");
  const usedEmails = new Set(PROTECTED);
  const usedDocs = new Set(["0000000000"]);
  const usedRefs = new Set<string>();
  const ids: string[] = [];

  for (let i = 0; i < 120; i++) {
    const male = Math.random() < 0.5;
    const nombre = pick(male ? NM : NF);
    const ap1 = pick(AP);
    const ap2 = pick(AP);
    const [ciudad, departamento] = pick(CIUDADES);

    const user = await prisma.user.create({
      data: {
        nombre,
        apellido: `${ap1} ${ap2}`,
        documento: mkDoc(usedDocs),
        correo: mkEmail(nombre, ap1, usedEmails),
        celular: pick(PREFIJOS) + String(rand(1_000_000, 9_999_999)),
        ciudad,
        departamento,
        banco: pick(BANCOS),
        tipoCuenta: pick(CUENTAS),
        cuentaBancaria: String(rand(1_000_000_000, 99_999_999_999)),
        whatsapp:
          Math.random() < 0.7
            ? pick(PREFIJOS) + String(rand(1_000_000, 9_999_999))
            : null,
        password: hash,
        saldoPuntos: 0,
        activo: true,
        confirmado: true,
        codigoRef: mkRef(usedRefs),
      },
      select: { id: true },
    });
    ids.push(user.id);
    if ((i + 1) % 30 === 0) process.stdout.write(`\r   ${i + 1}/120`);
  }
  console.log("\n   ✓ 120 usuarios creados (contraseña: Test123!)");
  return ids;
}

// ─── Asignar cajas ────────────────────────────────────────────────────────────
type CajaInfo = { numero: string; fecha: Date };

async function assignCajas(
  userIds: string[]
): Promise<Map<string, CajaInfo[]>> {
  console.log("📦 Asignando cajas a usuarios...");

  const shuffled = [...userIds].sort(() => Math.random() - 0.5);

  // Distribution: 24 top, 36 medium, 36 occasional, 24 none
  const segments: [number, number, number][] = [
    [24, 10, 20],
    [36, 3, 9],
    [36, 1, 2],
    [24, 0, 0],
  ];
  const plan: { userId: string; count: number }[] = [];
  let si = 0;
  for (const [n, min, max] of segments) {
    for (let i = 0; i < n; i++) {
      plan.push({
        userId: shuffled[si++],
        count: min === 0 ? 0 : rand(min, max),
      });
    }
  }

  const needed = plan.reduce((s, p) => s + p.count, 0);
  const pool = (
    await prisma.caja.findMany({
      where: { estado: "DISPONIBLE" },
      select: { id: true, numero: true },
      take: needed + 300,
    })
  ).sort(() => Math.random() - 0.5);

  const start = daysAgo(60);
  const now = new Date();
  const result = new Map<string, CajaInfo[]>();
  let pi = 0;

  for (const { userId, count } of plan) {
    const list: CajaInfo[] = [];
    for (let i = 0; i < count && pi < pool.length; i++) {
      const caja = pool[pi++];
      const fecha = randBetween(start, now);
      const idCompra = `ORD-${fecha
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      await prisma.caja.update({
        where: { id: caja.id },
        data: { userId, estado: "VENDIDA", fechaCompra: fecha, idCompra },
      });
      await prisma.transaccion.create({
        data: {
          userId,
          tipo: TipoTransaccion.COMPRA,
          monto: 10000,
          descripcion: `Compra caja #${caja.numero}`,
          fecha,
          referencia: caja.numero,
        },
      });
      list.push({ numero: caja.numero, fecha });
    }
    result.set(userId, list);
  }

  const total = [...result.values()].reduce((s, v) => s + v.length, 0);
  const conCajas = [...result.values()].filter((v) => v.length > 0).length;
  console.log(`   ✓ ${total} cajas asignadas a ${conCajas} usuarios`);
  return result;
}

// ─── Crear 3 sorteos pasados ──────────────────────────────────────────────────
async function createSorteos(userCajas: Map<string, CajaInfo[]>) {
  console.log("🎰 Creando 3 sorteos ejecutados...");
  const PRECIO = 10000;

  const defs: [string, number][] = [
    ["Sorteo #1", 45],
    ["Sorteo #2", 30],
    ["Sorteo #3", 15],
  ];

  for (const [label, dback] of defs) {
    const fechaSorteo = daysAgo(dback);

    // Cajas vendidas antes de este sorteo
    const vendidas: { userId: string; numero: string }[] = [];
    for (const [uid, cajas] of userCajas) {
      for (const c of cajas) {
        if (c.fecha < fechaSorteo) vendidas.push({ userId: uid, numero: c.numero });
      }
    }

    if (vendidas.length === 0) {
      console.log(`   ⚠ ${label}: sin cajas vendidas antes de la fecha`);
      continue;
    }

    // Elegir número ganador de las cajas vendidas (garantiza ganador 4 cifras)
    const ng = pick(vendidas).numero;
    const totalVendidas = vendidas.length;
    const totalRecaudo = totalVendidas * PRECIO;
    const fondoPremios = totalRecaudo * 0.6;
    const ganancia = totalRecaudo * 0.4;

    const sorteo = await prisma.sorteo.create({
      data: {
        fecha: fechaSorteo,
        numeroGanador: ng,
        estado: "FINALIZADO",
        totalVendidas,
        totalRecaudo,
        ganancia,
        fondoPremios,
        configuracion: { precioCaja: PRECIO, margenGanancia: 0.4 },
      },
    });

    // Ganadores por categoría (cada caja gana solo la más alta aplicable)
    const categorias: {
      cat: CategoriaPremio;
      pct: number;
      test: (n: string) => boolean;
    }[] = [
      {
        cat: CategoriaPremio.CUATRO_CIFRAS,
        pct: 0.35,
        test: (n) => n === ng,
      },
      {
        cat: CategoriaPremio.TRES_CIFRAS,
        pct: 0.15,
        test: (n) => n !== ng && n.slice(1) === ng.slice(1),
      },
      {
        cat: CategoriaPremio.DOS_CIFRAS,
        pct: 0.1,
        test: (n) => n.slice(1) !== ng.slice(1) && n.slice(2) === ng.slice(2),
      },
      {
        cat: CategoriaPremio.UNA_CIFRA,
        pct: 0.05,
        test: (n) => n.slice(2) !== ng.slice(2) && n.slice(3) === ng.slice(3),
      },
    ];

    let premiosCreados = 0;
    for (const { cat, pct, test } of categorias) {
      const winners = vendidas.filter((v) => test(v.numero));
      const monto = Math.round(fondoPremios * pct);
      const fechaPremio = new Date(fechaSorteo.getTime() + 3_600_000);

      for (const w of winners) {
        await prisma.premio.create({
          data: { sorteoId: sorteo.id, userId: w.userId, categoria: cat, monto, pagado: true },
        });
        await prisma.transaccion.create({
          data: {
            userId: w.userId,
            tipo: TipoTransaccion.PREMIO,
            monto,
            descripcion: `Premio ${cat.replace(/_/g, " ")} — Ganador ${ng}`,
            fecha: fechaPremio,
            referencia: sorteo.id,
          },
        });
        await prisma.user.update({
          where: { id: w.userId },
          data: { saldoPuntos: { increment: monto } },
        });
        premiosCreados++;
      }
    }

    console.log(
      `   ✓ ${label}: nro ganador ${ng} | ${vendidas.length} cajas | ${premiosCreados} premios`
    );
  }
}

// ─── 2 selecciones anticipadas ejecutadas ─────────────────────────────────────
async function createAnticipadas(
  userIds: string[],
  userCajas: Map<string, CajaInfo[]>
) {
  console.log("⚡ Creando 2 selecciones anticipadas ejecutadas...");

  const defs = [
    {
      dback: 20,
      nombre: "Selección Anticipada Abril — Efectivo",
      descripcion: "Premio especial para compradores activos",
      premioDescripcion: "$100.000",
      premioValor: 100000,
    },
    {
      dback: 10,
      nombre: "Selección Anticipada Abril — Electrodoméstico",
      descripcion: "Premio electrodoméstico sorpresa",
      premioDescripcion: "Licuadora",
      premioValor: null,
    },
  ];

  for (const d of defs) {
    const fecha = daysAgo(d.dback);
    const elegibles = userIds.filter((id) => (userCajas.get(id) ?? []).length > 0);
    const ganadores = [...elegibles]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    const ganadoresJson = ganadores.map((uid) => {
      const cajas = userCajas.get(uid)!;
      return { userId: uid, cajaNro: pick(cajas).numero };
    });

    await prisma.sorteoAnticipado.create({
      data: {
        nombre: d.nombre,
        descripcion: d.descripcion,
        premioDescripcion: d.premioDescripcion,
        premioValor: d.premioValor,
        cantidadGanadores: 5,
        soloVendidas: true,
        minCajas: 0,
        fecha,
        estado: "EJECUTADO",
        ganadores: ganadoresJson,
      },
    });
    console.log(`   ✓ ${d.nombre}: ${ganadores.length} ganadores`);
  }
}

// ─── Sistema de referidos y cupones ──────────────────────────────────────────
async function createReferidos(
  userIds: string[],
  userCajas: Map<string, CajaInfo[]>
) {
  console.log("🔗 Creando referidos y cupones...");

  const shuffled = [...userIds].sort(() => Math.random() - 0.5);
  const nReferrers = Math.floor(userIds.length * 0.3); // 30%
  const referrers = shuffled.slice(0, nReferrers);
  const remainingPool = new Set(shuffled.slice(nReferrers));

  let refCount = 0;
  const usedCodes = new Set<string>();

  for (const referidorId of referrers) {
    const available = [...remainingPool];
    if (available.length === 0) break;
    const qty = Math.min(rand(1, 5), available.length);
    const selected = available.sort(() => Math.random() - 0.5).slice(0, qty);

    for (const referidoId of selected) {
      remainingPool.delete(referidoId);
      const compro = (userCajas.get(referidoId) ?? []).length > 0;
      await prisma.referido.create({
        data: {
          referidorId,
          referidoId,
          compro,
          fecha: daysAgo(rand(1, 55)),
        },
      });
      refCount++;
    }
  }

  // Cupones: 1 por cada 5 referidos que compraron
  let cuponCount = 0;
  for (const referidorId of referrers) {
    const purchased = await prisma.referido.count({
      where: { referidorId, compro: true },
    });
    const qty = Math.floor(purchased / 5);
    for (let i = 0; i < qty; i++) {
      let codigo: string;
      do {
        codigo = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      } while (usedCodes.has(codigo));
      usedCodes.add(codigo);

      const usado = Math.random() < 0.4;
      const fechaCreacion = daysAgo(rand(5, 30));
      await prisma.cupon.create({
        data: {
          usuarioId: referidorId,
          codigo,
          usado,
          fechaCreacion,
          fechaUso: usado ? new Date(fechaCreacion.getTime() + rand(1, 5) * 864e5) : null,
        },
      });
      cuponCount++;
    }
  }

  console.log(`   ✓ ${refCount} relaciones de referidos | ${cuponCount} cupones generados`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱  Seed realista — Cajas Sorpresa 10K\n");
  console.log("   Simulando 2 meses de operación...\n");

  const testCount = await prisma.user.count({
    where: { correo: { notIn: PROTECTED } },
  });

  const force = process.argv.includes("--force");

  if (testCount > 0 && !force) {
    console.log(`ℹ️  Ya existen ${testCount} usuarios de prueba en la BD.`);
    console.log("   Ejecuta con --force para limpiar y recrear todo.\n");
    console.log("   Ejemplo: npx tsx prisma/seed-realistic.ts --force\n");
    return;
  }

  if (testCount > 0) await cleanup();

  const hash = await bcrypt.hash("Test123!", 12);

  const userIds = await createUsers(hash);
  const userCajas = await assignCajas(userIds);
  await createSorteos(userCajas);
  await createAnticipadas(userIds, userCajas);
  await createReferidos(userIds, userCajas);

  const cajaStats = [...userCajas.values()].map((v) => v.length);
  const conCajas = cajaStats.filter((n) => n > 0).length;
  const totalCajas = cajaStats.reduce((s, n) => s + n, 0);

  console.log("\n✅  Seed completado exitosamente:\n");
  console.log(`   Usuarios creados  : 120`);
  console.log(`   Con cajas         : ${conCajas} usuarios / ${totalCajas} cajas asignadas`);
  console.log(`   Sorteos ejecutados: 3 (hace 45, 30 y 15 días)`);
  console.log(`   Anticipadas       : 2 (hace 20 y 10 días)`);
  console.log(`   Contraseña test   : Test123!`);
  console.log(`   Protegidos        : ${PROTECTED.join(", ")}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
