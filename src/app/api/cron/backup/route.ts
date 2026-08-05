import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [
    usuarios, cajas, transacciones, sorteos, premios, retiros, config,
    sorteoAnticipados, referidos, cupones, giftCards, granSorteos,
    sorteosPreviosGran, notificaciones, conceptosRetencion, bonos, bonoCompras,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.caja.findMany(),
    prisma.transaccion.findMany(),
    prisma.sorteo.findMany(),
    prisma.premio.findMany(),
    prisma.retiro.findMany(),
    prisma.config.findFirst(),
    prisma.sorteoAnticipado.findMany(),
    prisma.referido.findMany(),
    prisma.cupon.findMany(),
    prisma.giftCard.findMany(),
    prisma.granSorteo.findMany(),
    prisma.sorteoPrevioGran.findMany(),
    prisma.notificacion.findMany(),
    prisma.conceptoRetencion.findMany(),
    prisma.bono.findMany(),
    prisma.bonoCompra.findMany(),
  ]);

  const backup = {
    version: "2.0",
    fecha: new Date().toISOString(),
    proyecto: "Tienda 10K — Backup Diario Automático",
    resumen: {
      usuarios: usuarios.length,
      cajas: cajas.length,
      transacciones: transacciones.length,
      retiros: retiros.length,
      bonos: bonos.length,
      bonoCompras: bonoCompras.length,
      referidos: referidos.length,
      giftCards: giftCards.length,
    },
    tablas: {
      config,
      usuarios,
      referidos,
      cajas,
      transacciones,
      sorteos,
      premios,
      retiros,
      sorteoAnticipados,
      granSorteos,
      sorteosPreviosGran,
      cupones,
      giftCards,
      notificaciones,
      conceptosRetencion,
      bonos,
      bonoCompras,
    },
  };

  const json = JSON.stringify(backup, null, 2);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Tienda 10K" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER!,
    subject: `[Backup] Tienda 10K — ${new Date().toLocaleDateString("es-CO")}`,
    html: `
      <h2>Backup diario automático — Tienda 10K</h2>
      <p>Fecha: <strong>${new Date().toLocaleString("es-CO")}</strong></p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Usuarios</td><td><strong>${backup.resumen.usuarios}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Membresías</td><td><strong>${backup.resumen.cajas}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Transacciones</td><td><strong>${backup.resumen.transacciones}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Retiros</td><td><strong>${backup.resumen.retiros}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Bonos</td><td><strong>${backup.resumen.bonos}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Compras bonos</td><td><strong>${backup.resumen.bonoCompras}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Referidos</td><td><strong>${backup.resumen.referidos}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Gift cards</td><td><strong>${backup.resumen.giftCards}</strong></td></tr>
      </table>
      <p style="margin-top:16px">El archivo JSON completo con <strong>todas las tablas</strong> está adjunto.</p>
    `,
    attachments: [
      {
        filename: `backup-club10k-${new Date().toISOString().slice(0, 10)}.json`,
        content: json,
        contentType: "application/json",
      },
    ],
  });

  return NextResponse.json({ ok: true, resumen: backup.resumen });
}
