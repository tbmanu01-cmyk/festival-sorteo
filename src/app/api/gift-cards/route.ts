import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const giftCards = await prisma.giftCard.findMany({
    where: { propietarioId: userId },
    orderBy: { creadaEn: "desc" },
  });

  return NextResponse.json({ giftCards });
}
