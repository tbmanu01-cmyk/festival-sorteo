import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";
import { crearNotificacion } from "@/lib/notificaciones";
import { checkRateLimit } from "@/lib/rateLimit";

const MONTO_MINIMO = 100_000;
const EXPIRY_MIN = 15;

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  const retiros = await prisma.retiro.findMany({
    where: { userId },
    select: { id: true, monto: true, estado: true, fecha: true, cuentaDestino: true, confirmado: true },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ retiros });
}

export async function POST(req: NextRequest) {
  const ip = obtenerIP(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const userId = (session.user as unknown as { id: string }).id;

  // Rate limit: máx 3 solicitudes por usuario cada 15 minutos
  const rl = checkRateLimit(`retiro:${userId}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { mensaje: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` },
      { status: 429 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json() as { monto?: unknown };
  const monto = Number(body.monto);

  if (!Number.isFinite(monto) || monto < MONTO_MINIMO) {
    return NextResponse.json(
      { mensaje: `El monto mínimo de retiro es $${MONTO_MINIMO.toLocaleString("es-CO")}.` },
      { status: 400 }
    );
  }

  const config = await prisma.config.findUnique({ where: { id: "singleton" }, select: { retirosDisponiblesDesde: true } });
  const { estaEnFreezeRetiros } = await import("@/lib/retirosFreeze");
  if (estaEnFreezeRetiros(config?.retirosDisponiblesDesde ?? null)) {
    return NextResponse.json(
      {
        mensaje: `Los retiros están pausados tras la última selección. Se reabren el ${config!.retirosDisponiblesDesde!.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}.`,
        codigo: "RETIROS_PAUSADOS",
        disponibleDesde: config!.retirosDisponiblesDesde!.toISOString(),
      },
      { status: 423 }
    );
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { saldoPuntos: true, cuentaBancaria: true, banco: true, tipoCuenta: true, nombre: true, correo: true, confirmado: true },
  });

  if (!usuario) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  if (!usuario.confirmado) {
    return NextResponse.json(
      { mensaje: "Debes verificar tu correo electrónico antes de solicitar un retiro.", codigo: "EMAIL_NO_VERIFICADO" },
      { status: 403 }
    );
  }
  if (!usuario.cuentaBancaria || !usuario.banco) {
    return NextResponse.json(
      { mensaje: "No tienes una cuenta bancaria registrada. Actualiza tu perfil." },
      { status: 422 }
    );
  }
  if (usuario.saldoPuntos < monto) {
    return NextResponse.json({ mensaje: "Saldo insuficiente." }, { status: 422 });
  }

  // Solo un retiro pendiente de verificación a la vez
  const pendiente = await prisma.retiro.findFirst({
    where: { userId, confirmado: false, confirmacionExpiry: { gt: new Date() } },
  });
  if (pendiente) {
    return NextResponse.json(
      { mensaje: "Ya tienes un retiro pendiente de verificación. Ingresa el código que te enviamos.", retiroId: pendiente.id },
      { status: 409 }
    );
  }

  // Límite: máx 1 retiro confirmado cada 24 horas
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const retiroReciente = await prisma.retiro.findFirst({
    where: { userId, confirmado: true, fecha: { gte: hace24h } },
  });
  if (retiroReciente) {
    return NextResponse.json(
      { mensaje: "Ya realizaste un retiro en las últimas 24 horas. Intenta mañana." },
      { status: 429 }
    );
  }

  const cuentaDestino = [usuario.banco, usuario.tipoCuenta, usuario.cuentaBancaria]
    .filter(Boolean).join(" — ");

  const codigo = generarCodigo();
  const expiry = new Date(Date.now() + EXPIRY_MIN * 60 * 1000);

  const retiro = await prisma.retiro.create({
    data: {
      userId,
      monto,
      cuentaDestino,
      estado: "PENDIENTE",
      confirmado: false,
      confirmacionToken: codigo,
      confirmacionExpiry: expiry,
    },
  });

  await registrarAuditoria({
    userId,
    accion: "RETIRO_SOLICITADO",
    detalle: `Monto: $${monto.toLocaleString("es-CO")} COP — esperando código de verificación`,
    ip,
  });

  // Enviar código por email (await obligatorio en serverless — fire-and-forget no llega a ejecutarse)
  try {
    const { enviarCodigoRetiro } = await import("@/lib/email");
    await enviarCodigoRetiro({
      correo: usuario.correo,
      nombre: usuario.nombre,
      monto,
      codigo,
      expiraMin: EXPIRY_MIN,
    });
  } catch (err) {
    console.error("Email código retiro error:", err);
  }

  return NextResponse.json({
    ok: true,
    retiroId: retiro.id,
    mensaje: `Te enviamos un código de 6 dígitos a ${usuario.correo}. Tienes ${EXPIRY_MIN} minutos para ingresarlo.`,
  });
}
