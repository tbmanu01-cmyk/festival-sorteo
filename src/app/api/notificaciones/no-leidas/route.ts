import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ count: 0 });

  const { prisma } = await import("@/lib/prisma");
  const userId  = (session.user as unknown as { id: string }).id;
  const rol     = (session.user as unknown as { rol?: string }).rol ?? "USER";
  const esStaff = rol === "ADMIN" || rol === "ASISTENTE";

  const count = await prisma.notificacion.count({
    where: {
      OR: [
        { usuarioId: userId },
        { paraUsuarios: true },
        ...(esStaff ? [{ paraAdmins: true }] : []),
      ],
      lecturas: { none: { usuarioId: userId } },
    },
  });

  return NextResponse.json({ count });
}
