import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verificarAdmin();
  if (!session) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const ip = obtenerIP(req);
  const adminId = (session.user as unknown as { id: string }).id;
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

    await registrarAuditoria({
      userId: adminId,
      accion: "RETIRO_APROBADO",
      detalle: `Retiro ${id} de $${retiro.monto.toLocaleString("es-CO")} aprobado para usuario ${retiro.userId}`,
      ip,
    });

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
    await prisma.$transaction([
      prisma.retiro.update({ where: { id }, data: { estado: "RECHAZADO" } }),
      prisma.user.update({
        where: { id: retiro.userId },
        data: { saldoPuntos: { increment: retiro.monto } },
      }),
    ]);

    await registrarAuditoria({
      userId: adminId,
      accion: "RETIRO_RECHAZADO",
      detalle: `Retiro ${id} de $${retiro.monto.toLocaleString("es-CO")} rechazado, saldo devuelto a ${retiro.userId}`,
      ip,
    });

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

  return NextResponse.json({
    mensaje: accion === "aprobar" ? "Retiro aprobado." : "Retiro rechazado y saldo devuelto.",
  });
}
