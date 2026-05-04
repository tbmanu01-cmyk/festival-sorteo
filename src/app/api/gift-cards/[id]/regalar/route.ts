import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as { correo?: string };
  const correoDestino = (body.correo ?? "").trim().toLowerCase();

  if (!correoDestino) {
    return NextResponse.json({ mensaje: "Debes indicar el correo del destinatario." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const gc = await prisma.giftCard.findUnique({ where: { id } });
  if (!gc) return NextResponse.json({ mensaje: "Gift card no encontrada." }, { status: 404 });
  if (gc.propietarioId !== userId) return NextResponse.json({ mensaje: "No autorizado." }, { status: 403 });
  if (gc.estado !== "DISPONIBLE") {
    return NextResponse.json({ mensaje: "Esta gift card ya fue utilizada." }, { status: 409 });
  }

  const destinatario = await prisma.user.findUnique({
    where: { correo: correoDestino },
    select: { id: true, nombre: true },
  });
  if (!destinatario) {
    return NextResponse.json({ mensaje: "No encontramos ningún usuario con ese correo." }, { status: 404 });
  }
  if (destinatario.id === userId) {
    return NextResponse.json({ mensaje: "No puedes regalar una gift card a ti mismo." }, { status: 400 });
  }

  // Marcar la original como regalada y crear una nueva para el destinatario
  const nuevoCodigo = `GC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await prisma.$transaction([
    prisma.giftCard.update({
      where: { id },
      data: { estado: "REGALADA", usadaEn: new Date(), nota: `Regalada a ${correoDestino}` },
    }),
    prisma.giftCard.create({
      data: {
        codigo: nuevoCodigo,
        valor: gc.valor,
        propietarioId: destinatario.id,
        nota: `Recibida como regalo`,
      },
    }),
  ]);

  return NextResponse.json({
    mensaje: `Gift card enviada a ${destinatario.nombre} correctamente.`,
  });
}
