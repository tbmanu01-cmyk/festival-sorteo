import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const gc = await prisma.giftCard.findUnique({ where: { id } });
  if (!gc) return NextResponse.json({ mensaje: "Gift card no encontrada." }, { status: 404 });
  if (gc.propietarioId !== userId) return NextResponse.json({ mensaje: "No autorizado." }, { status: 403 });
  if (gc.estado !== "DISPONIBLE") {
    return NextResponse.json({ mensaje: "Esta gift card ya fue utilizada." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.giftCard.update({
      where: { id },
      data: { estado: "RETIRADA", usadaEn: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { saldoPuntos: { increment: gc.valor } },
    }),
    prisma.transaccion.create({
      data: {
        userId,
        tipo: "RECARGA",
        monto: gc.valor,
        descripcion: `Gift card ${gc.codigo} convertida a saldo`,
      },
    }),
  ]);

  return NextResponse.json({
    mensaje: `$${gc.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP agregados a tu saldo.`,
    valor: gc.valor,
  });
}
