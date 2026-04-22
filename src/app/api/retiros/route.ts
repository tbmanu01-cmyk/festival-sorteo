import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MONTO_MINIMO = 10_000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const retiros = await prisma.retiro.findMany({
    where: { userId },
    select: { id: true, monto: true, estado: true, fecha: true, cuentaDestino: true },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ retiros });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const body = await req.json() as { monto?: unknown };
  const monto = Number(body.monto);

  if (!Number.isFinite(monto) || monto < MONTO_MINIMO) {
    return NextResponse.json(
      { mensaje: `El monto mínimo de retiro es $${MONTO_MINIMO.toLocaleString("es-CO")}.` },
      { status: 400 }
    );
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { saldoPuntos: true, cuentaBancaria: true, banco: true, tipoCuenta: true },
  });

  if (!usuario) {
    return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  }
  if (!usuario.cuentaBancaria || !usuario.banco) {
    return NextResponse.json(
      { mensaje: "No tienes una cuenta bancaria registrada. Contacta al administrador." },
      { status: 422 }
    );
  }
  if (usuario.saldoPuntos < monto) {
    return NextResponse.json({ mensaje: "Saldo insuficiente." }, { status: 422 });
  }

  const cuentaDestino = [usuario.banco, usuario.tipoCuenta, usuario.cuentaBancaria]
    .filter(Boolean)
    .join(" — ");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { saldoPuntos: { decrement: monto } },
    }),
    prisma.retiro.create({
      data: { userId, monto, cuentaDestino, estado: "PENDIENTE" },
    }),
    prisma.transaccion.create({
      data: {
        userId,
        tipo: "RETIRO",
        monto: -monto,
        descripcion: `Solicitud de retiro — $${monto.toLocaleString("es-CO")}`,
      },
    }),
  ]);

  return NextResponse.json({
    mensaje: "Solicitud enviada. El administrador la procesará pronto.",
  });
}
