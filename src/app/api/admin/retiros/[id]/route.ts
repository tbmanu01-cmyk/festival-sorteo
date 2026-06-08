import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";
import { crearNotificacion } from "@/lib/notificaciones";

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
  const { accion, motivoRechazo } = await req.json() as {
    accion: "aprobar" | "rechazar";
    motivoRechazo?: string;
  };

  if (!["aprobar", "rechazar"].includes(accion)) {
    return NextResponse.json({ mensaje: "Acción inválida." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) return NextResponse.json({ mensaje: "Retiro no encontrado." }, { status: 404 });

  if (!["PENDIENTE", "PRE_APROBADO"].includes(retiro.estado)) {
    return NextResponse.json({ mensaje: "Este retiro ya fue procesado." }, { status: 409 });
  }

  const usuario = await prisma.user.findUnique({
    where: { id: retiro.userId },
    select: { nombre: true, correo: true },
  });

  if (accion === "aprobar") {
    const montoFinal = retiro.montoNeto ?? retiro.monto;

    // Si el usuario no verificó OTP, el saldo todavía no fue deducido — hacerlo ahora
    if (!retiro.confirmado) {
      const deducido = await prisma.user.updateMany({
        where: { id: retiro.userId, saldoPuntos: { gte: retiro.monto } },
        data: { saldoPuntos: { decrement: retiro.monto } },
      });
      if (deducido.count === 0) {
        return NextResponse.json({ mensaje: "Saldo insuficiente. No se puede aprobar." }, { status: 422 });
      }
    }

    await prisma.$transaction([
      prisma.retiro.update({ where: { id }, data: { estado: "PAGADO", confirmado: true } }),
      prisma.transaccion.create({
        data: {
          userId: retiro.userId,
          tipo: "RETIRO",
          monto: -montoFinal,
          descripcion: `Retiro pagado — $${montoFinal.toLocaleString("es-CO")}${retiro.retencion ? ` (retención $${retiro.retencion.toLocaleString("es-CO")})` : ""}`,
          referencia: id,
        },
      }),
    ]);

    await registrarAuditoria({
      userId: adminId,
      accion: "RETIRO_APROBADO",
      detalle: `Retiro ${id} aprobado. Monto bruto: $${retiro.monto.toLocaleString("es-CO")}. Neto pagado: $${montoFinal.toLocaleString("es-CO")}`,
      ip,
    });

    if (usuario) {
      import("@/lib/email").then(({ enviarRetiroAprobado }) =>
        enviarRetiroAprobado({
          correo: usuario.correo,
          nombre: usuario.nombre,
          monto: montoFinal,
          cuentaDestino: retiro.cuentaDestino,
        }).catch((err) => console.error("Email retiro aprobado:", err))
      );
      crearNotificacion(prisma, {
        tipo: "RETIRO",
        titulo: "¡Retiro aprobado para consignación! 💸",
        cuerpo: `Tu retiro de $${montoFinal.toLocaleString("es-CO")} COP fue aprobado y será consignado a ${retiro.cuentaDestino}.`,
        usuarioId: retiro.userId,
      }).catch(() => undefined);
    }
  } else {
    await prisma.$transaction([
      prisma.retiro.update({
        where: { id },
        data: { estado: "RECHAZADO", motivoRechazo: motivoRechazo?.trim() || null },
      }),
      prisma.user.update({
        where: { id: retiro.userId },
        data: { saldoPuntos: { increment: retiro.monto } },
      }),
    ]);

    await registrarAuditoria({
      userId: adminId,
      accion: "RETIRO_RECHAZADO",
      detalle: `Retiro ${id} rechazado por admin. Saldo de $${retiro.monto.toLocaleString("es-CO")} devuelto.`,
      ip,
    });

    if (usuario) {
      import("@/lib/email").then(({ enviarRetiroRechazado }) =>
        enviarRetiroRechazado({
          correo: usuario.correo,
          nombre: usuario.nombre,
          monto: retiro.monto,
        }).catch((err) => console.error("Email retiro rechazado:", err))
      );
      crearNotificacion(prisma, {
        tipo: "RETIRO",
        titulo: "Solicitud de retiro rechazada",
        cuerpo: `Tu solicitud de $${retiro.monto.toLocaleString("es-CO")} COP fue rechazada${motivoRechazo ? `: ${motivoRechazo}` : ""}. El saldo fue devuelto a tu cuenta.`,
        usuarioId: retiro.userId,
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({
    mensaje: accion === "aprobar" ? "Retiro aprobado y pagado." : "Retiro rechazado y saldo devuelto.",
  });
}
