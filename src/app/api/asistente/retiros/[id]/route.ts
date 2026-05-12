import { NextRequest, NextResponse } from "next/server";
import { verificarAsistente } from "@/lib/admin";
import { obtenerIP, registrarAuditoria } from "@/lib/auditoria";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verificarAsistente();
  if (!session) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const ip = obtenerIP(req);
  const asistenteId = (session.user as unknown as { id: string }).id;
  const { id } = await params;

  const body = await req.json() as {
    accion: "pre-aprobar" | "rechazar";
    conceptosIds?: string[];
    motivoRechazo?: string;
  };

  const { accion } = body;

  if (!["pre-aprobar", "rechazar"].includes(accion)) {
    return NextResponse.json({ mensaje: "Acción inválida." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const retiro = await prisma.retiro.findUnique({ where: { id } });
  if (!retiro) return NextResponse.json({ mensaje: "Retiro no encontrado." }, { status: 404 });
  if (retiro.estado !== "PENDIENTE") {
    return NextResponse.json({ mensaje: "Este retiro ya fue procesado." }, { status: 409 });
  }

  if (accion === "pre-aprobar") {
    const conceptosIds = body.conceptosIds ?? [];
    let retencionTotal = 0;
    let porcentajeTotal = 0;
    let detalle: { nombre: string; porcentaje: number; monto: number }[] = [];

    if (conceptosIds.length > 0) {
      const conceptos = await prisma.conceptoRetencion.findMany({
        where: { id: { in: conceptosIds }, activo: true },
      });

      detalle = conceptos.map((c) => {
        const monto = Math.round(retiro.monto * (c.porcentaje / 100));
        return { nombre: c.nombre, porcentaje: c.porcentaje, monto };
      });

      porcentajeTotal = detalle.reduce((s, c) => s + c.porcentaje, 0);
      retencionTotal = detalle.reduce((s, c) => s + c.monto, 0);
    }

    const montoNeto = retiro.monto - retencionTotal;
    const notaRetencion = detalle.length > 0
      ? detalle.map((c) => `${c.nombre} (${c.porcentaje}%)`).join(", ")
      : null;

    await prisma.retiro.update({
      where: { id },
      data: {
        estado: "PRE_APROBADO",
        preAprobadoPorId: asistenteId,
        preAprobadoEn: new Date(),
        retencion: retencionTotal > 0 ? retencionTotal : null,
        porcentajeRetencion: porcentajeTotal > 0 ? porcentajeTotal : null,
        notaRetencion,
        montoNeto,
        retencionDetalle: detalle.length > 0 ? detalle : undefined,
      },
    });

    await registrarAuditoria({
      userId: asistenteId,
      accion: "RETIRO_PRE_APROBADO",
      detalle: `Retiro ${id} de $${retiro.monto.toLocaleString("es-CO")} pre-aprobado. ${
        detalle.length > 0
          ? `Retenciones: ${notaRetencion}. Total retenido: $${retencionTotal.toLocaleString("es-CO")}. Neto: $${montoNeto.toLocaleString("es-CO")}`
          : "Sin retenciones."
      }`,
      ip,
    });

    return NextResponse.json({ mensaje: "Retiro pre-aprobado y enviado al administrador." });
  }

  // rechazar
  const usuario = await prisma.user.findUnique({
    where: { id: retiro.userId },
    select: { nombre: true, correo: true },
  });

  await prisma.$transaction([
    prisma.retiro.update({
      where: { id },
      data: { estado: "RECHAZADO", motivoRechazo: body.motivoRechazo?.trim() || null },
    }),
    prisma.user.update({
      where: { id: retiro.userId },
      data: { saldoPuntos: { increment: retiro.monto } },
    }),
  ]);

  await registrarAuditoria({
    userId: asistenteId,
    accion: "RETIRO_RECHAZADO",
    detalle: `Retiro ${id} de $${retiro.monto.toLocaleString("es-CO")} rechazado por asistente. Saldo devuelto.`,
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
  }

  return NextResponse.json({ mensaje: "Retiro rechazado y saldo devuelto al usuario." });
}
