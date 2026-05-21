import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { prisma } = await import("@/lib/prisma");

  const usuario = await prisma.user.findUnique({
    where: { correo: session.user.email },
    select: { id: true },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const [compras, cashbackRecibido] = await Promise.all([
    prisma.bonoCompra.findMany({
      where: { userId: usuario.id },
      orderBy: { fecha: "desc" },
      take: 20,
      include: {
        bono: { select: { nombre: true, cadena: true, valorFace: true } },
      },
    }),
    prisma.transaccion.findMany({
      where: { userId: usuario.id, tipo: "CASHBACK_BONO" },
      orderBy: { fecha: "desc" },
      take: 20,
      select: { monto: true, descripcion: true, fecha: true, referencia: true },
    }),
  ]);

  const totalCashback = cashbackRecibido.reduce((s, t) => s + t.monto, 0);

  return NextResponse.json({ compras, cashbackRecibido, totalCashback });
}
