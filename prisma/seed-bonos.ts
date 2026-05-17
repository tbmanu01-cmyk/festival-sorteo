import "dotenv/config";
import { PrismaClient, TipoTransaccion } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const ADMIN_EMAIL = "admin@festival.com";

// ─── Bonos de cadenas de prueba ───────────────────────────────────────────────
const BONOS_DEMO = [
  {
    nombre: "Bono Éxito $100.000",
    cadena: "Éxito",
    valorFace: 100_000,
    precio: 100_000,
    stock: 200,
    descripcion: "Bono de compra válido en cualquier sede Éxito a nivel nacional. Canjeable en productos de supermercado, ropa, electrodomésticos y más.",
    imagen: null,
  },
  {
    nombre: "Bono Jumbo $100.000",
    cadena: "Jumbo",
    valorFace: 100_000,
    precio: 100_000,
    stock: 150,
    descripcion: "Bono de compra Jumbo válido en todas las sedes del país. Ideal para mercado, productos frescos y hogar.",
    imagen: null,
  },
  {
    nombre: "Bono Carulla $100.000",
    cadena: "Carulla",
    valorFace: 100_000,
    precio: 100_000,
    stock: 100,
    descripcion: "Bono Carulla para compras de supermercado premium. Válido en todas las tiendas Carulla de Colombia.",
    imagen: null,
  },
  {
    nombre: "Bono D1 $50.000",
    cadena: "D1",
    valorFace: 50_000,
    precio: 50_000,
    stock: 300,
    descripcion: "Bono de compra D1 para productos de primera necesidad a precios bajos. Válido en todas las tiendas D1.",
    imagen: null,
  },
  {
    nombre: "Bono Alkosto $200.000",
    cadena: "Alkosto",
    valorFace: 200_000,
    precio: 200_000,
    stock: 80,
    descripcion: "Bono Alkosto para electrodomésticos, tecnología y hogar. Uno de los mejores bonos para compras grandes.",
    imagen: null,
  },
];

// ─── Crear bonos ──────────────────────────────────────────────────────────────
async function crearBonos() {
  console.log("🏷️  Creando bonos de prueba...");

  const existentes = await prisma.bono.count();
  if (existentes > 0) {
    console.log(`   Ya existen ${existentes} bonos. Omitiendo creación.`);
    return;
  }

  for (const b of BONOS_DEMO) {
    await prisma.bono.create({ data: b });
  }
  console.log(`   ✓ ${BONOS_DEMO.length} bonos creados`);
}

// ─── Crear familias ficticias ─────────────────────────────────────────────────
async function crearFamilias() {
  console.log("\n👨‍👩‍👧‍👦 Creando familias ficticias para pruebas...");

  // Tomar usuarios sin referido (no tienen entrada como referidoId)
  const todosLosUsers = await prisma.user.findMany({
    where: { correo: { not: ADMIN_EMAIL }, rol: "USER", activo: true },
    select: { id: true, nombre: true, apellido: true },
    take: 60,
  });

  const yaReferidos = await prisma.referido.findMany({
    select: { referidoId: true },
  });
  const yaReferidosSet = new Set(yaReferidos.map((r) => r.referidoId));

  const sinReferido = todosLosUsers.filter((u) => !yaReferidosSet.has(u.id));
  console.log(`   Usuarios sin referido disponibles: ${sinReferido.length}`);

  if (sinReferido.length < 13) {
    console.log("   No hay suficientes usuarios sin referido para crear familias.");
    return;
  }

  // Estructura: cabeza → 3 hijos → cada hijo tiene hasta 3 nietos
  // Familia 1: usuarios 0 como cabeza, 1-3 como hijos, 4-12 como nietos
  // Familia 2: cabeza 0 misma, hijos 13-15, nietos 16-24 (si hay suficientes)

  const cabeza = sinReferido[0];
  let idx = 1;
  let familiasCreadas = 0;
  let relacionesCreadas = 0;

  while (idx + 3 <= sinReferido.length && familiasCreadas < 3) {
    const hijos = sinReferido.slice(idx, idx + 3);
    idx += 3;

    for (const hijo of hijos) {
      // Verificar que no exista ya la relación
      const existe = await prisma.referido.findUnique({
        where: { referidoId: hijo.id },
      });
      if (!existe) {
        await prisma.referido.create({
          data: {
            referidorId: cabeza.id,
            referidoId: hijo.id,
            compro: true,
            fecha: new Date(Date.now() - Math.random() * 30 * 864e5),
          },
        });
        relacionesCreadas++;
      }

      // Nietos: 3 por cada hijo
      const nietos = sinReferido.slice(idx, idx + 3);
      idx += 3;

      for (const nieto of nietos) {
        if (!nieto) continue;
        const existeNieto = await prisma.referido.findUnique({
          where: { referidoId: nieto.id },
        });
        if (!existeNieto) {
          await prisma.referido.create({
            data: {
              referidorId: hijo.id,
              referidoId: nieto.id,
              compro: true,
              fecha: new Date(Date.now() - Math.random() * 20 * 864e5),
            },
          });
          relacionesCreadas++;
        }
      }
    }

    familiasCreadas++;
    console.log(
      `   ✓ Familia ${familiasCreadas} de ${cabeza.nombre} ${cabeza.apellido}: 3 hijos + nietos creados`
    );
  }

  console.log(
    `\n   ✓ ${familiasCreadas} familias creadas | ${relacionesCreadas} relaciones registradas`
  );
  console.log(`   Cabeza de familia: ${cabeza.nombre} ${cabeza.apellido} (${cabeza.id})`);
}

// ─── Crear compras de bonos de prueba ─────────────────────────────────────────
async function crearComprasBonos() {
  console.log("\n🛒 Creando compras de bonos de prueba con cashback...");

  const bonos = await prisma.bono.findMany({ where: { activo: true }, take: 3 });
  if (bonos.length === 0) { console.log("   No hay bonos disponibles."); return; }

  // Tomar usuarios que tienen referidor (para que el cashback fluya)
  const referidos = await prisma.referido.findMany({
    take: 6,
    include: {
      referido: { select: { id: true, saldoPuntos: true } },
      referidor: { select: { id: true } },
    },
  });

  if (referidos.length === 0) { console.log("   No hay referidos para simular compras."); return; }

  let comprasCreadas = 0;

  for (const ref of referidos.slice(0, 4)) {
    const comprador = ref.referido;
    const nivel1 = ref.referidor;
    const bono = bonos[comprasCreadas % bonos.length];

    // Buscar nivel 2 (referidor del nivel 1)
    const nivel2Ref = await prisma.referido.findUnique({
      where: { referidoId: nivel1.id },
      select: { referidorId: true },
    });

    const cashbackComprador = bono.precio * 0.07;
    const cashbackNivel1 = bono.precio * 0.05;
    const cashbackNivel2 = bono.precio * 0.03;

    const codigo = `BONO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await prisma.$transaction([
      // Registro de compra
      prisma.bonoCompra.create({
        data: {
          bonoId: bono.id,
          userId: comprador.id,
          precio: bono.precio,
          cashbackComprador,
          nivel1Id: nivel1.id,
          cashbackNivel1,
          nivel2Id: nivel2Ref?.referidorId ?? null,
          cashbackNivel2: nivel2Ref ? cashbackNivel2 : null,
          codigoRedención: codigo,
        },
      }),
      // Cashback al comprador
      prisma.transaccion.create({
        data: {
          userId: comprador.id,
          tipo: TipoTransaccion.CASHBACK_BONO,
          monto: cashbackComprador,
          descripcion: `Cashback 7% — ${bono.nombre}`,
          referencia: codigo,
        },
      }),
      prisma.user.update({
        where: { id: comprador.id },
        data: { saldoPuntos: { increment: cashbackComprador } },
      }),
      // Cashback nivel 1
      prisma.transaccion.create({
        data: {
          userId: nivel1.id,
          tipo: TipoTransaccion.CASHBACK_BONO,
          monto: cashbackNivel1,
          descripcion: `Comisión red 5% — ${bono.nombre}`,
          referencia: codigo,
        },
      }),
      prisma.user.update({
        where: { id: nivel1.id },
        data: { saldoPuntos: { increment: cashbackNivel1 } },
      }),
    ]);

    // Cashback nivel 2 si existe (fuera de la transacción para simplificar)
    if (nivel2Ref?.referidorId) {
      await prisma.transaccion.create({
        data: {
          userId: nivel2Ref.referidorId,
          tipo: TipoTransaccion.CASHBACK_BONO,
          monto: cashbackNivel2,
          descripcion: `Comisión red 3% — ${bono.nombre}`,
          referencia: codigo,
        },
      });
      await prisma.user.update({
        where: { id: nivel2Ref.referidorId },
        data: { saldoPuntos: { increment: cashbackNivel2 } },
      });
    }

    comprasCreadas++;
    console.log(
      `   ✓ Compra ${comprasCreadas}: ${bono.nombre} | cashback $${cashbackComprador.toLocaleString("es-CO")} → comprador, $${cashbackNivel1.toLocaleString("es-CO")} → nivel 1${nivel2Ref ? `, $${cashbackNivel2.toLocaleString("es-CO")} → nivel 2` : ""}`
    );
  }

  console.log(`\n   ✓ ${comprasCreadas} compras de bonos creadas con cashback distribuido`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱  Seed Bonos — Sistema multinivel de cashback\n");

  await crearBonos();
  await crearFamilias();
  await crearComprasBonos();

  console.log("\n✅  Seed de bonos completado\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
