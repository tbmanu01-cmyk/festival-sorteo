import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nombreSchema, apellidoSchema } from "@/lib/validaciones";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";

async function obtenerSesion() {
  return getServerSession(authOptions);
}

// ── GET /api/usuario/perfil ───────────────────────────────────────────────────
export async function GET() {
  const session = await obtenerSesion();
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const userId = (session.user as unknown as { id: string }).id;
  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      nombre: true, apellido: true, correo: true, celular: true,
      ciudad: true, departamento: true,
      banco: true, tipoCuenta: true, cuentaBancaria: true,
      saldoPuntos: true, avatar: true, limiteGastoMensual: true,
    },
  });

  if (!user) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  return NextResponse.json({ user });
}

// ── PATCH /api/usuario/perfil ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const userId = (session.user as unknown as { id: string }).id;
  const body = await req.json() as Record<string, unknown>;
  const { prisma } = await import("@/lib/prisma");

  // Validar unicidad de correo si se cambia
  if (body.correo && typeof body.correo === "string") {
    const actual = await prisma.user.findUnique({ where: { id: userId }, select: { correo: true } });
    if (body.correo !== actual?.correo) {
      const dup = await prisma.user.findFirst({ where: { correo: body.correo, id: { not: userId } } });
      if (dup) return NextResponse.json({ mensaje: "Ese correo ya está registrado." }, { status: 409 });
    }
  }

  // Validar nombre/apellido si vienen en la petición
  if (body.nombre !== undefined) {
    const r = nombreSchema.safeParse(body.nombre);
    if (!r.success) return NextResponse.json({ mensaje: r.error.issues[0].message }, { status: 400 });
    body.nombre = r.data;
  }
  if (body.apellido !== undefined) {
    const r = apellidoSchema.safeParse(body.apellido);
    if (!r.success) return NextResponse.json({ mensaje: r.error.issues[0].message }, { status: 400 });
    body.apellido = r.data;
  }

  // Campos que el usuario puede editar por sí mismo
  const camposPermitidos = [
    "nombre", "apellido", "correo", "celular",
    "ciudad", "departamento", "banco", "tipoCuenta", "cuentaBancaria",
    "avatar",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }

  // Límite de gasto mensual (juego responsable) — null/0 lo quita
  if (body.limiteGastoMensual !== undefined) {
    if (body.limiteGastoMensual === null || body.limiteGastoMensual === 0) {
      data.limiteGastoMensual = null;
    } else if (typeof body.limiteGastoMensual === "number" && body.limiteGastoMensual > 0) {
      data.limiteGastoMensual = body.limiteGastoMensual;
    } else {
      return NextResponse.json({ mensaje: "El límite debe ser un número mayor a 0, o vacío para quitarlo." }, { status: 400 });
    }
  }

  // Cambio de contraseña (requiere contraseña actual)
  if (body.nuevaPassword && typeof body.nuevaPassword === "string" && body.nuevaPassword.length >= 8) {
    if (!body.passwordActual || typeof body.passwordActual !== "string") {
      return NextResponse.json({ mensaje: "Debes ingresar tu contraseña actual para cambiarla." }, { status: 400 });
    }
    const userConPassword = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    const { compare, hash } = await import("bcryptjs");
    const valida = await compare(body.passwordActual, userConPassword!.password);
    if (!valida) {
      return NextResponse.json({ mensaje: "La contraseña actual es incorrecta." }, { status: 400 });
    }
    data.password = await hash(body.nuevaPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ mensaje: "Sin cambios que aplicar." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ mensaje: "Perfil actualizado correctamente." });
}

// ── DELETE /api/usuario/perfil — el usuario elimina su propia cuenta ─────────
// Mismo efecto que la eliminación desde el panel admin (bloquea acceso, libera
// correo/documento para re-registro, conserva historial) — nunca borra datos.
export async function DELETE(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session?.user) return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });

  const userId = (session.user as unknown as { id: string }).id;
  const ip = obtenerIP(req);
  const body = await req.json().catch(() => ({})) as { password?: string };

  if (!body.password) {
    return NextResponse.json({ mensaje: "Debes confirmar tu contraseña para eliminar la cuenta." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, correo: true, documento: true, password: true, eliminado: true },
  });
  if (!user || user.eliminado) return NextResponse.json({ mensaje: "Cuenta no encontrada." }, { status: 404 });

  const { compare } = await import("bcryptjs");
  const valida = await compare(body.password, user.password);
  if (!valida) return NextResponse.json({ mensaje: "Contraseña incorrecta." }, { status: 400 });

  const correoOriginal = user.correo;
  const prefijo = `eliminado_${user.id}_`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      activo: false,
      eliminado: true,
      eliminadoEn: new Date(),
      correo: `${prefijo}${user.correo}`,
      documento: `${prefijo}${user.documento}`,
      sessionVersion: { increment: 1 },
    },
  });

  await registrarAuditoria({
    userId,
    accion: "USUARIO_ELIMINO_SU_CUENTA",
    detalle: `Cuenta ${correoOriginal} eliminada por el propio usuario desde su perfil.`,
    ip,
  });

  return NextResponse.json({ mensaje: "Tu cuenta fue eliminada." });
}
