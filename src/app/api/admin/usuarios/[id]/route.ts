import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { registrarAuditoria, obtenerIP } from "@/lib/auditoria";

// ── GET /api/admin/usuarios/[id] ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, nombre: true, apellido: true, documento: true,
      correo: true, celular: true, ciudad: true, departamento: true,
      banco: true, tipoCuenta: true, cuentaBancaria: true,
      saldoPuntos: true, activo: true, confirmado: true, rol: true,
      fechaRegistro: true, codigoRef: true,
      loginIntentos: true, bloqueadoHasta: true,
      _count: { select: { cajas: true, retiros: true, giftCards: true } },
    },
  });

  if (!user) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });
  return NextResponse.json({ user });
}

// ── PATCH /api/admin/usuarios/[id] ───────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verificarAdmin();
  if (!session) return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });

  const ip = obtenerIP(req);
  const adminId = (session.user as unknown as { id: string }).id;
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const { prisma } = await import("@/lib/prisma");

  const userActual = await prisma.user.findUnique({ where: { id }, select: { id: true, correo: true, documento: true } });
  if (!userActual) return NextResponse.json({ mensaje: "Usuario no encontrado." }, { status: 404 });

  // ── Validar unicidad de correo y documento ──────────────────────────────
  if (body.correo && body.correo !== userActual.correo) {
    const dup = await prisma.user.findFirst({ where: { correo: body.correo as string, id: { not: id } } });
    if (dup) return NextResponse.json({ mensaje: "Ese correo ya está registrado por otro usuario." }, { status: 409 });
  }
  if (body.documento && body.documento !== userActual.documento) {
    const dup = await prisma.user.findFirst({ where: { documento: body.documento as string, id: { not: id } } });
    if (dup) return NextResponse.json({ mensaje: "Ese documento ya está registrado por otro usuario." }, { status: 409 });
  }

  // ── Construir datos a actualizar ────────────────────────────────────────
  const camposPermitidos = [
    "nombre", "apellido", "documento", "correo", "celular",
    "ciudad", "departamento", "banco", "tipoCuenta", "cuentaBancaria",
    "activo", "confirmado", "rol",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }

  // Desbloquear cuenta si se solicita
  if (body.desbloquear === true) {
    data.loginIntentos = 0;
    data.bloqueadoHasta = null;
  }

  // Nueva contraseña (opcional)
  if (body.nuevaPassword && typeof body.nuevaPassword === "string" && body.nuevaPassword.length >= 8) {
    const { hash } = await import("bcryptjs");
    data.password = await hash(body.nuevaPassword, 12);
    data.loginIntentos = 0;
    data.bloqueadoHasta = null;
  }

  if (Object.keys(data).length === 0 && !body.ajusteSaldo) {
    return NextResponse.json({ mensaje: "Sin cambios que aplicar." }, { status: 400 });
  }

  // ── Ajuste de saldo manual ──────────────────────────────────────────────
  const ajuste = Number(body.ajusteSaldo ?? 0);
  const motivoAjuste = String(body.motivoAjuste ?? "Ajuste manual por administrador");

  const ops = [];

  if (Object.keys(data).length > 0) {
    ops.push(prisma.user.update({ where: { id }, data }));
  }

  if (ajuste !== 0) {
    ops.push(
      prisma.user.update({
        where: { id },
        data: { saldoPuntos: { increment: ajuste } },
      }),
      prisma.transaccion.create({
        data: {
          userId: id,
          tipo: ajuste > 0 ? "RECARGA" : "RETIRO",
          monto: ajuste,
          descripcion: motivoAjuste,
          referencia: `ADMIN-${adminId}`,
        },
      })
    );
  }

  await prisma.$transaction(ops);

  // ── Audit log ───────────────────────────────────────────────────────────
  const cambios = Object.keys(data).filter((k) => k !== "password");
  if (body.nuevaPassword) cambios.push("password");
  if (ajuste !== 0) cambios.push(`saldo(${ajuste > 0 ? "+" : ""}${ajuste})`);

  await registrarAuditoria({
    userId: adminId,
    accion: "ADMIN_EDITO_USUARIO",
    detalle: `Usuario ${id} — campos modificados: ${cambios.join(", ")}`,
    ip,
  });

  return NextResponse.json({ mensaje: "Usuario actualizado correctamente." });
}
