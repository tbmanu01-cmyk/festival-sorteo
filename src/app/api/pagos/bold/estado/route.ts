import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
  }
  const userId = (session.user as unknown as { id: string }).id;

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ mensaje: "Falta orderId." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const pago = await prisma.pagoBold.findUnique({ where: { orderId }, include: { tipoMembresia: { select: { slug: true } } } });
  if (!pago || pago.usuarioId !== userId) {
    return NextResponse.json({ mensaje: "No encontrado." }, { status: 404 });
  }

  return NextResponse.json({ estado: pago.estado, numeroCaja: pago.numeroCaja, tier: pago.tipoMembresia?.slug ?? null });
}
