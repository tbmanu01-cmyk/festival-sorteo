import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const adminId = (session?.user as unknown as { id: string } | undefined)?.id;

  const { id } = await params;
  const body = await req.json() as { accion: "aprobar" | "rechazar"; motivoRechazo?: string };

  if (!["aprobar", "rechazar"].includes(body.accion)) {
    return NextResponse.json({ mensaje: "Acción inválida." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const pago = await prisma.pagoManual.findUnique({
    where: { id },
    include: { usuario: { select: { nombre: true, correo: true, confirmado: true } } },
  });

  if (!pago) return NextResponse.json({ mensaje: "Pago no encontrado." }, { status: 404 });
  if (pago.estado !== "PENDIENTE") {
    return NextResponse.json({ mensaje: "Este pago ya fue procesado." }, { status: 409 });
  }

  if (body.accion === "rechazar") {
    await prisma.pagoManual.update({
      where: { id },
      data: { estado: "RECHAZADO", motivoRechazo: body.motivoRechazo || null, aprobadoPorId: adminId, aprobadoEn: new Date() },
    });

    import("@/lib/email").then(({ enviarPagoManualRechazado }) =>
      enviarPagoManualRechazado({
        correo: pago.usuario.correo,
        nombre: pago.usuario.nombre,
        numeroCaja: pago.numeroCaja,
        motivo: body.motivoRechazo,
      }).catch((e) => console.error("Email rechazo error:", e))
    );

    return NextResponse.json({ mensaje: "Pago rechazado y usuario notificado." });
  }

  if (!pago.tipoMembresiaId) {
    return NextResponse.json({ mensaje: "Este pago no tiene tipo de membresía asociado." }, { status: 409 });
  }

  // APROBAR — verificar que la caja siga disponible o reservada por este usuario
  const caja = await prisma.caja.findUnique({
    where: { cajaTierNumero: { tipoMembresiaId: pago.tipoMembresiaId, numero: pago.numeroCaja } },
  });
  if (!caja) {
    return NextResponse.json({ mensaje: "Membresía no encontrada en el sistema." }, { status: 404 });
  }
  if (caja.estado === "VENDIDA") {
    return NextResponse.json(
      { mensaje: `La membresía #${pago.numeroCaja} ya fue vendida a otro usuario. Rechaza este pago y contacta al cliente.` },
      { status: 409 }
    );
  }

  const { confirmarCompraMembresia } = await import("@/lib/confirmarCompra");
  try {
    await confirmarCompraMembresia({
      usuarioId: pago.usuarioId,
      numeroCaja: pago.numeroCaja,
      tipoMembresiaId: pago.tipoMembresiaId,
      monto: pago.monto,
      descripcionTransaccion: `Membresía #${pago.numeroCaja} — pago por transferencia (${pago.referencia})`,
      referenciaTransaccion: pago.referencia,
    });
  } catch (e) {
    return NextResponse.json({ mensaje: e instanceof Error ? e.message : "Error al activar la membresía." }, { status: 409 });
  }

  await prisma.pagoManual.update({
    where: { id },
    data: { estado: "APROBADO", aprobadoPorId: adminId, aprobadoEn: new Date() },
  });

  return NextResponse.json({ mensaje: `¡Membresía #${pago.numeroCaja} aprobada y activada!` });
}
