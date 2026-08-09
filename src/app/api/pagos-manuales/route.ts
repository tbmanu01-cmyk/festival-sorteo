import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const body = await req.json() as {
      numeroCaja: string;
      tier: string;
      nombrePagador: string;
      refBancaria: string;
      comprobanteUrl?: string;
      notas?: string;
    };

    const { numeroCaja, tier, nombrePagador, refBancaria, comprobanteUrl, notas } = body;

    if (!numeroCaja || !/^\d{4}$/.test(numeroCaja)) {
      return NextResponse.json({ mensaje: "Número de membresía inválido." }, { status: 400 });
    }
    if (!tier) {
      return NextResponse.json({ mensaje: "Falta el parámetro tier." }, { status: 400 });
    }
    if (!nombrePagador?.trim()) {
      return NextResponse.json({ mensaje: "El nombre del titular es obligatorio." }, { status: 400 });
    }
    if (!refBancaria?.trim()) {
      return NextResponse.json({ mensaje: "La referencia de la transacción es obligatoria." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");

    const usuarioCheck = await prisma.user.findUnique({
      where: { id: userId },
      select: { confirmado: true, nombre: true, correo: true },
    });
    if (!usuarioCheck?.confirmado) {
      return NextResponse.json(
        { mensaje: "Debes verificar tu correo electrónico antes de comprar una membresía.", codigo: "EMAIL_NO_VERIFICADO" },
        { status: 403 }
      );
    }

    // Verificar que no tenga ya un pago pendiente para esta caja
    const pagoExistente = await prisma.pagoManual.findFirst({
      where: { usuarioId: userId, numeroCaja, estado: "PENDIENTE" },
    });
    if (pagoExistente) {
      return NextResponse.json(
        { mensaje: "Ya tienes un pago pendiente para esta membresía. Espera a que sea revisado." },
        { status: 409 }
      );
    }

    const tipoMembresia = await prisma.tipoMembresia.findUnique({ where: { slug: tier } });
    if (!tipoMembresia) {
      return NextResponse.json({ mensaje: "Tipo de membresía no encontrado." }, { status: 404 });
    }
    const monto = tipoMembresia.precio;

    const referencia = `PM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    await prisma.pagoManual.create({
      data: {
        referencia,
        usuarioId: userId,
        numeroCaja,
        tipoMembresiaId: tipoMembresia.id,
        monto,
        nombrePagador: nombrePagador.trim(),
        refBancaria: refBancaria.trim(),
        comprobanteUrl: comprobanteUrl?.trim() || null,
        notas: notas?.trim() || null,
      },
    });

    // Emails — fire and forget
    Promise.resolve().then(async () => {
      const { enviarComprobanteRecibido } = await import("@/lib/email");
      await enviarComprobanteRecibido({
        correo: usuarioCheck.correo,
        nombre: usuarioCheck.nombre,
        numeroCaja,
        referencia,
        monto,
      }).catch((e) => console.error("Email comprobante recibido error:", e));

      // Notificar al admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const { Resend } = await import("resend");
        const r = new Resend(process.env.RESEND_API_KEY);
        await r.emails.send({
          from: process.env.EMAIL_FROM ?? "Tienda 10K <noreply@tienda10k.com>",
          to: adminEmail,
          subject: `Nuevo pago pendiente: membresía #${numeroCaja} — Tienda 10K`,
          html: `<p>Nuevo pago manual pendiente de aprobación.</p><p><strong>Usuario:</strong> ${usuarioCheck.nombre} (${usuarioCheck.correo})</p><p><strong>Membresía:</strong> #${numeroCaja}</p><p><strong>Monto:</strong> $${monto.toLocaleString("es-CO")} COP</p><p><strong>Ref bancaria:</strong> ${refBancaria}</p><p><a href="https://tienda10k.com/admin/pagos-manuales">Ver en el panel →</a></p>`,
        }).catch((e) => console.error("Email admin pago manual error:", e));
      }
    }).catch(() => undefined);

    return NextResponse.json({ mensaje: "Comprobante enviado. Te notificaremos cuando sea aprobado.", referencia });
  } catch (error) {
    console.error("POST /api/pagos-manuales error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
