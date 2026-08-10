import { NextRequest, NextResponse } from "next/server";

interface EventoBold {
  type: "SALE_APPROVED" | "SALE_REJECTED" | "VOID_APPROVED" | "VOID_REJECTED";
  data: {
    payment_id: string;
    amount: { currency: string; total: number };
    metadata?: { reference?: string };
  };
}

// Lógica compartida entre /api/webhooks/bold (producción) y
// /api/webhooks/bold-test (webhooks de prueba de Bold) — Bold exige URLs
// distintas para cada ambiente, pero ambas validan/activan igual.
export async function manejarWebhookBold(req: NextRequest) {
  const rawBody = await req.text();
  const firma = req.headers.get("x-bold-signature");

  const { verificarFirmaWebhookBold } = await import("@/lib/bold");
  if (!verificarFirmaWebhookBold(rawBody, firma)) {
    console.error("Webhook Bold: firma inválida");
    return NextResponse.json({ mensaje: "Firma inválida." }, { status: 401 });
  }

  let evento: EventoBold;
  try {
    evento = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ mensaje: "JSON inválido." }, { status: 400 });
  }

  const orderId = evento.data?.metadata?.reference;
  if (!orderId) {
    return NextResponse.json({ mensaje: "Sin referencia de orden, ignorado." }, { status: 200 });
  }

  const { prisma } = await import("@/lib/prisma");
  const pago = await prisma.pagoBold.findUnique({ where: { orderId } });
  if (!pago) {
    console.error("Webhook Bold: orden no encontrada", orderId);
    return NextResponse.json({ mensaje: "Orden no encontrada." }, { status: 200 });
  }
  if (pago.estado !== "PENDIENTE") {
    return NextResponse.json({ mensaje: "Ya procesado." }, { status: 200 });
  }

  if (evento.type === "SALE_APPROVED") {
    // El monto/moneda reportados por Bold deben coincidir con lo que se firmó al crear la orden
    if (evento.data.amount.total !== pago.monto || evento.data.amount.currency !== pago.moneda) {
      console.error("Webhook Bold: monto/moneda no coinciden", orderId, evento.data.amount, pago.monto, pago.moneda);
      return NextResponse.json({ mensaje: "Monto no coincide." }, { status: 200 });
    }

    if (!pago.tipoMembresiaId) {
      console.error("Webhook Bold: orden sin tipoMembresiaId", orderId);
      return NextResponse.json({ mensaje: "Orden sin tipo de membresía." }, { status: 200 });
    }

    const { confirmarCompraMembresia, confirmarCompraMembresiaLote } = await import("@/lib/confirmarCompra");
    try {
      if (pago.numerosCaja.length > 0) {
        await confirmarCompraMembresiaLote({
          usuarioId: pago.usuarioId,
          numeros: pago.numerosCaja,
          tipoMembresiaId: pago.tipoMembresiaId,
          montoPorUnidad: pago.monto / pago.numerosCaja.length,
          referenciaTransaccion: orderId,
        });
      } else {
        await confirmarCompraMembresia({
          usuarioId: pago.usuarioId,
          numeroCaja: pago.numeroCaja,
          tipoMembresiaId: pago.tipoMembresiaId,
          monto: pago.monto,
          descripcionTransaccion: `Membresía #${pago.numeroCaja} — pago con Bold (${evento.data.payment_id})`,
          referenciaTransaccion: orderId,
        });
      }
      await prisma.pagoBold.update({
        where: { orderId },
        data: { estado: "APROBADO", paymentId: evento.data.payment_id },
      });
    } catch (e) {
      console.error("Webhook Bold: error al confirmar compra", orderId, e);
      // No marcamos RECHAZADO aquí — puede ser que la caja se vendió por otro medio
      // entre tanto; queda PENDIENTE para revisión manual del admin.
    }
  } else if (evento.type === "SALE_REJECTED") {
    await prisma.pagoBold.update({
      where: { orderId },
      data: { estado: "RECHAZADO", paymentId: evento.data.payment_id },
    });
  }

  return NextResponse.json({ mensaje: "OK" });
}
