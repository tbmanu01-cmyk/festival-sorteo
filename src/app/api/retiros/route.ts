import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";
import { crearNotificacion } from "@/lib/notificaciones";
import { checkRateLimit } from "@/lib/rateLimit";

const MONTO_MINIMO = 100_000;
const EXPIRY_HORAS = 24;

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

  // Rate limit: máx 3 solicitudes de retiro por usuario cada 15 minutos
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

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { saldoPuntos: true, cuentaBancaria: true, banco: true, tipoCuenta: true, nombre: true, correo: true },
  });

  if (!usuario) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  if (!usuario.cuentaBancaria || !usuario.banco) {
    return NextResponse.json(
      { mensaje: "No tienes una cuenta bancaria registrada. Actualiza tu perfil." },
      { status: 422 }
    );
  }
  if (usuario.saldoPuntos < monto) {
    return NextResponse.json({ mensaje: "Saldo insuficiente." }, { status: 422 });
  }

  // Verificar que no tenga otro retiro pendiente de confirmación
  const tokenPendiente = await prisma.retiro.findFirst({
    where: {
      userId,
      confirmado: false,
      confirmacionExpiry: { gt: new Date() },
    },
  });
  if (tokenPendiente) {
    return NextResponse.json(
      { mensaje: "Ya tienes una solicitud pendiente de confirmación. Revisa tu correo." },
      { status: 409 }
    );
  }

  const cuentaDestino = [usuario.banco, usuario.tipoCuenta, usuario.cuentaBancaria]
    .filter(Boolean).join(" — ");

  const token = crypto.randomUUID();
  const expiry = new Date(Date.now() + EXPIRY_HORAS * 60 * 60 * 1000);

  // Crear retiro sin descontar saldo aún — el descuento ocurre al confirmar
  await prisma.retiro.create({
    data: {
      userId,
      monto,
      cuentaDestino,
      estado: "PENDIENTE",
      confirmado: false,
      confirmacionToken: token,
      confirmacionExpiry: expiry,
    },
  });

  await registrarAuditoria({
    userId,
    accion: "RETIRO_SOLICITADO",
    detalle: `Monto: $${monto.toLocaleString("es-CO")} COP — pendiente confirmación`,
    ip,
  });

  // Enviar email de confirmación
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";
  const enlace = `${baseUrl}/api/retiros/confirmar?token=${token}`;

  import("@/lib/email").then(({ enviarConfirmacionRetiro }) =>
    enviarConfirmacionRetiro({
      correo: usuario.correo,
      nombre: usuario.nombre,
      monto,
      enlace,
      expiraEn: EXPIRY_HORAS,
    }).catch((err) => console.error("Email confirmación retiro error:", err))
  );

  // Notificar admins (retiro pendiente de confirmación)
  Promise.resolve().then(async () => {
    await crearNotificacion(prisma, {
      tipo: "RETIRO",
      titulo: "Solicitud de retiro (pendiente confirmación)",
      cuerpo: `${usuario.nombre} solicitó un retiro de $${monto.toLocaleString("es-CO")} COP. Esperando confirmación por correo.`,
      paraAdmins: true,
    });
  }).catch(() => undefined);

  return NextResponse.json({
    mensaje: "Solicitud creada. Te enviamos un correo para confirmarla. Tienes 24 horas.",
  });
}
