import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

// Distribución fija del margen (convenio): 35% comprador · 25% N1 · 15% N2 · 25% plataforma
const FRAC_COMPRADOR = 0.35;
const FRAC_NIVEL1    = 0.25;
const FRAC_NIVEL2    = 0.15;

function generarCodigo(): string {
  return `BONO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Rate limit: máx 10 compras de bonos por usuario cada hora
  const emailKey = session.user.email;
  const rl = checkRateLimit(`bono-compra:${emailKey}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas compras. Intenta en ${rl.retryAfter} segundos.` },
      { status: 429 }
    );
  }

  const { id: bonoId } = await params;
  const { prisma } = await import("@/lib/prisma");

  const config = await prisma.config.findUnique({ where: { id: "singleton" } });
  if (config && !config.tiendaActiva) {
    return NextResponse.json({ error: "La tienda de bonos no está disponible por el momento." }, { status: 403 });
  }

  const [bono, comprador] = await Promise.all([
    prisma.bono.findUnique({ where: { id: bonoId } }),
    prisma.user.findUnique({
      where: { correo: session.user.email },
      select: { id: true, saldoPuntos: true, confirmado: true },
    }),
  ]);

  if (!bono || !bono.activo) {
    return NextResponse.json({ error: "Bono no disponible" }, { status: 404 });
  }
  if (!comprador) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (!comprador.confirmado) {
    return NextResponse.json({ error: "Debes verificar tu correo antes de comprar.", codigo: "EMAIL_NO_VERIFICADO" }, { status: 403 });
  }
  if (bono.stock <= 0) {
    return NextResponse.json({ error: "Sin stock disponible" }, { status: 400 });
  }

  const pagoConSaldo = comprador.saldoPuntos >= bono.precio;

  // Buscar cadena de referidos (nivel 1 y nivel 2 del comprador)
  const nivel1Ref = await prisma.referido.findUnique({
    where: { referidoId: comprador.id },
    select: { referidorId: true },
  });

  const nivel1Id = nivel1Ref?.referidorId ?? null;

  const nivel2Ref = nivel1Id
    ? await prisma.referido.findUnique({
        where: { referidoId: nivel1Id },
        select: { referidorId: true },
      })
    : null;

  const nivel2Id = nivel2Ref?.referidorId ?? null;

  const margen = bono.valorFace - bono.precio;
  const cashbackComprador = margen * FRAC_COMPRADOR;
  const cashbackNivel1    = margen * FRAC_NIVEL1;
  const cashbackNivel2    = margen * FRAC_NIVEL2;
  const codigo = generarCodigo();

  await prisma.$transaction(async (tx) => {
    // Descontar precio atómicamente — el WHERE saldoPuntos >= precio previene race conditions
    if (pagoConSaldo) {
      const deducido = await tx.user.updateMany({
        where: { id: comprador.id, saldoPuntos: { gte: bono.precio } },
        data: { saldoPuntos: { decrement: bono.precio } },
      });
      if (deducido.count === 0) throw new Error("Saldo insuficiente al momento de procesar");
      await tx.transaccion.create({
        data: {
          userId: comprador.id,
          tipo: "COMPRA_BONO",
          monto: -bono.precio,
          descripcion: `Compra ${bono.nombre}`,
          referencia: codigo,
        },
      });
    }

    // Cashback al comprador (7%)
    await tx.user.update({
      where: { id: comprador.id },
      data: { saldoPuntos: { increment: cashbackComprador } },
    });
    await tx.transaccion.create({
      data: {
        userId: comprador.id,
        tipo: "CASHBACK_BONO",
        monto: cashbackComprador,
        descripcion: `Cashback ${Math.round(FRAC_COMPRADOR * 100)}% margen — ${bono.nombre}`,
        referencia: codigo,
      },
    });

    // Cashback nivel 1 (5%)
    if (nivel1Id) {
      await tx.user.update({
        where: { id: nivel1Id },
        data: { saldoPuntos: { increment: cashbackNivel1 } },
      });
      await tx.transaccion.create({
        data: {
          userId: nivel1Id,
          tipo: "CASHBACK_BONO",
          monto: cashbackNivel1,
          descripcion: `Comisión red ${Math.round(FRAC_NIVEL1 * 100)}% margen — ${bono.nombre}`,
          referencia: codigo,
        },
      });
    }

    // Cashback nivel 2 (3%)
    if (nivel2Id) {
      await tx.user.update({
        where: { id: nivel2Id },
        data: { saldoPuntos: { increment: cashbackNivel2 } },
      });
      await tx.transaccion.create({
        data: {
          userId: nivel2Id,
          tipo: "CASHBACK_BONO",
          monto: cashbackNivel2,
          descripcion: `Comisión red ${Math.round(FRAC_NIVEL2 * 100)}% margen — ${bono.nombre}`,
          referencia: codigo,
        },
      });
    }

    // Registrar la compra
    await tx.bonoCompra.create({
      data: {
        bonoId: bono.id,
        userId: comprador.id,
        precio: bono.precio,
        cashbackComprador,
        nivel1Id,
        cashbackNivel1: nivel1Id ? cashbackNivel1 : null,
        nivel2Id,
        cashbackNivel2: nivel2Id ? cashbackNivel2 : null,
        codigoRedención: codigo,
      },
    });

    // Reducir stock
    await tx.bono.update({
      where: { id: bono.id },
      data: { stock: { decrement: 1 } },
    });
  });

  return NextResponse.json({
    ok: true,
    codigo,
    cashbackRecibido: cashbackComprador,
    pagoConSaldo,
    mensaje: `¡Bono adquirido! Código: ${codigo}. Recibiste $${cashbackComprador.toLocaleString("es-CO")} COP de cashback en tu billetera.`,
  });
}
