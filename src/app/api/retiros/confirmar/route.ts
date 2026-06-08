import { NextRequest, NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { obtenerIP } from "@/lib/auditoria";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/dashboard?retiro=invalido`);
  }

  const { prisma } = await import("@/lib/prisma");

  const retiro = await prisma.retiro.findUnique({
    where: { confirmacionToken: token },
    include: { user: { select: { id: true, saldoPuntos: true, nombre: true } } },
  });

  if (!retiro) {
    return NextResponse.redirect(`${baseUrl}/dashboard?retiro=invalido`);
  }
  if (retiro.confirmado) {
    return NextResponse.redirect(`${baseUrl}/dashboard?retiro=ya-confirmado`);
  }
  if (!retiro.confirmacionExpiry || retiro.confirmacionExpiry < new Date()) {
    // Limpiar retiro expirado
    await prisma.retiro.delete({ where: { id: retiro.id } });
    return NextResponse.redirect(`${baseUrl}/dashboard?retiro=expirado`);
  }

  // Descontar saldo atómicamente con validación — previene race conditions
  const actualizado = await prisma.user.updateMany({
    where: { id: retiro.userId, saldoPuntos: { gte: retiro.monto } },
    data: { saldoPuntos: { decrement: retiro.monto } },
  });

  if (actualizado.count === 0) {
    // No tenía saldo suficiente en este momento — cancelar retiro
    await prisma.retiro.update({
      where: { id: retiro.id },
      data: { estado: "RECHAZADO", motivoRechazo: "Saldo insuficiente al confirmar", confirmacionToken: null },
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?retiro=saldo-insuficiente`);
  }

  // Confirmar retiro y registrar transacción
  await prisma.$transaction([
    prisma.retiro.update({
      where: { id: retiro.id },
      data: { confirmado: true, confirmacionToken: null, confirmacionExpiry: null },
    }),
    prisma.transaccion.create({
      data: {
        userId: retiro.userId,
        tipo: "RETIRO",
        monto: -retiro.monto,
        descripcion: `Retiro confirmado — $${retiro.monto.toLocaleString("es-CO")} COP`,
      },
    }),
  ]);

  await registrarAuditoria({
    userId: retiro.userId,
    accion: "RETIRO_CONFIRMADO",
    detalle: `Monto: $${retiro.monto.toLocaleString("es-CO")} COP confirmado por enlace de correo`,
    ip: obtenerIP(req),
  });

  return NextResponse.redirect(`${baseUrl}/dashboard?retiro=confirmado`);
}
