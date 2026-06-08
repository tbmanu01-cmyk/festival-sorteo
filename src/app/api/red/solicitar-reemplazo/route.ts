import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const yo = await prisma.user.findUnique({
    where: { correo: session.user.email },
    select: { id: true },
  });
  if (!yo) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { referidoId?: string };
  if (!body.referidoId) {
    return NextResponse.json({ mensaje: "Falta referidoId." }, { status: 400 });
  }

  // Buscar el registro Referido correspondiente al usuario a reemplazar
  const slot = await prisma.referido.findFirst({
    where: { referidoId: body.referidoId },
    select: { id: true, referidorId: true, compro: true },
  });

  if (!slot) {
    return NextResponse.json({ mensaje: "Slot no encontrado." }, { status: 404 });
  }

  if (slot.compro) {
    return NextResponse.json({ mensaje: "Este miembro ya realizó una compra y no puede ser reemplazado." }, { status: 409 });
  }

  // Autorización: el usuario debe ser el referidor directo (L1) o el abuelo (L2)
  const esReferidorDirecto = slot.referidorId === yo.id;
  let esAbuelo = false;
  if (!esReferidorDirecto) {
    // Comprobar si el referidor del slot es un referido directo de yo (relación abuelo → nieto)
    const eslabonMedio = await prisma.referido.findFirst({
      where: { referidorId: yo.id, referidoId: slot.referidorId },
      select: { id: true },
    });
    esAbuelo = !!eslabonMedio;
  }

  if (!esReferidorDirecto && !esAbuelo) {
    return NextResponse.json({ mensaje: "No tienes permiso para reemplazar este slot." }, { status: 403 });
  }

  // Verificar que el usuario a reemplazar no tiene referidos propios (nietos del slot)
  const tieneReferidos = await prisma.referido.findFirst({
    where: { referidorId: body.referidoId },
    select: { id: true },
  });
  if (tieneReferidos) {
    return NextResponse.json(
      { mensaje: "Este miembro ya tiene personas en su red y no puede ser reemplazado." },
      { status: 409 }
    );
  }

  // Generar token de slot con 72h de expiración
  const slotToken  = crypto.randomUUID();
  const slotExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await prisma.referido.update({
    where: { id: slot.id },
    data: { slotToken, slotExpiry },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";
  const link = `${base}/registro?slot=${slotToken}`;

  return NextResponse.json({ link, expira: slotExpiry.toISOString() });
}
