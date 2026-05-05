import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

  // Campos que el usuario puede editar por sí mismo
  const camposPermitidos = [
    "nombre", "apellido", "correo", "celular",
    "ciudad", "departamento", "banco", "tipoCuenta", "cuentaBancaria",
  ];

  const data: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (body[campo] !== undefined) data[campo] = body[campo];
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
