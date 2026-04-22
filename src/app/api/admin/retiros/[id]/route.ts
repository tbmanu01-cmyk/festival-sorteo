import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const { accion } = await req.json() as { accion: "aprobar" | "rechazar" };

  if (!["aprobar", "rechazar"].includes(accion)) {
    return NextResponse.json({ mensaje: "Acción inválida." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) return NextResponse.json({ mensaje: "Retiro no encontrado." }, { status: 404 });
  if (retiro.estado !== "PENDIENTE") {
    return NextResponse.json({ mensaje: "Este retiro ya fue procesado." }, { status: 409 });
  }

  // Obtener datos del usuario para el email
  const usuario = await prisma.user.findUnique({
    where: { id: retiro.userId },
    select: { nombre: true, correo: true },
  });

  if (accion === "aprobar") {
    await prisma.$transaction([
      prisma.retiro.update({ where: { id }, data: { estado: "PAGADO" } }),
      prisma.transaccion.create({
        data: {
          userId: retiro.userId,
          tipo: "RETIRO",
          monto: -retiro.monto,
          descripcion: `Retiro aprobado — $${retiro.monto.toLocaleString("es-CO")}`,
          referencia: id,
        },
      }),
    ]);
    if (usuario) {
      import("@/lib/email").then(({ enviarRetiroAprobado }) =>
        enviarRetiroAprobado({
          correo: usuario.correo,
          nombre: usuario.nombre,
          monto: retiro.monto,
          cuentaDestino: retiro.cuentaDestino,
        }).catch((err) => console.error("Email retiro aprobado error:", err))
      );
    }
  } else {
    // Rechazar: devolver saldo al usuario
    await prisma.$transaction([
      prisma.retiro.update({ where: { id }, data: { estado: "RECHAZADO" } }),
      prisma.user.update({
        where: { id: retiro.userId },
        data: { saldoPuntos: { increment: retiro.monto } },
      }),
    ]);
    if (usuario) {
      import("@/lib/email").then(({ enviarRetiroRechazado }) =>
        enviarRetiroRechazado({
          correo: usuario.correo,
          nombre: usuario.nombre,
          monto: retiro.monto,
        }).catch((err) => console.error("Email retiro rechazado error:", err))
      );
    }
  }

  return NextResponse.json({ mensaje: accion === "aprobar" ? "Retiro aprobado." : "Retiro rechazado y saldo devuelto." });
}
