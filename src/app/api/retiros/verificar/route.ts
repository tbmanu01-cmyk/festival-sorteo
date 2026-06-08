import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";
import { crearNotificacion } from "@/lib/notificaciones";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = obtenerIP(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const userId = (session.user as unknown as { id: string }).id;

  // Rate limit: máx 5 intentos de código por usuario cada 15 minutos
  const rl = checkRateLimit(`retiro-otp:${userId}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { mensaje: `Demasiados intentos. Espera ${rl.retryAfter} segundos.` },
      { status: 429 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json() as { retiroId?: string; codigo?: string };
  const { retiroId, codigo } = body;

  if (!retiroId || !codigo) {
    return NextResponse.json({ mensaje: "Datos incompletos." }, { status: 400 });
  }

  const retiro = await prisma.retiro.findFirst({
    where: { id: retiroId, userId, confirmado: false },
  });

  if (!retiro) {
    return NextResponse.json({ mensaje: "Solicitud no encontrada." }, { status: 404 });
  }
  if (!retiro.confirmacionExpiry || retiro.confirmacionExpiry < new Date()) {
    await prisma.retiro.delete({ where: { id: retiro.id } });
    return NextResponse.json({ mensaje: "El código expiró. Genera una nueva solicitud." }, { status: 410 });
  }
  if (retiro.confirmacionToken !== codigo.trim()) {
    return NextResponse.json({ mensaje: "Código incorrecto. Verifica e intenta de nuevo." }, { status: 400 });
  }

  // Descontar saldo atómicamente — previene race conditions
  const deducido = await prisma.user.updateMany({
    where: { id: userId, saldoPuntos: { gte: retiro.monto } },
    data: { saldoPuntos: { decrement: retiro.monto } },
  });

  if (deducido.count === 0) {
    await prisma.retiro.delete({ where: { id: retiro.id } });
    return NextResponse.json({ mensaje: "Saldo insuficiente al momento de procesar." }, { status: 422 });
  }

  // Confirmar retiro y registrar transacción
  await prisma.$transaction([
    prisma.retiro.update({
      where: { id: retiro.id },
      data: { confirmado: true, confirmacionToken: null, confirmacionExpiry: null },
    }),
    prisma.transaccion.create({
      data: {
        userId,
        tipo: "RETIRO",
        monto: -retiro.monto,
        descripcion: `Retiro verificado — $${retiro.monto.toLocaleString("es-CO")} COP`,
      },
    }),
  ]);

  await registrarAuditoria({
    userId,
    accion: "RETIRO_CONFIRMADO",
    detalle: `Monto: $${retiro.monto.toLocaleString("es-CO")} COP verificado con código OTP`,
    ip,
  });

  // Notificar admins
  Promise.resolve().then(async () => {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { nombre: true, apellido: true } });
    const nombre = u ? `${u.nombre} ${u.apellido}` : "Un usuario";
    await crearNotificacion(prisma, {
      tipo: "RETIRO",
      titulo: "Retiro verificado — listo para procesar",
      cuerpo: `${nombre} verificó su retiro de $${retiro.monto.toLocaleString("es-CO")} COP.`,
      paraAdmins: true,
    });
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    mensaje: "Retiro verificado. El administrador lo procesará pronto.",
  });
}
