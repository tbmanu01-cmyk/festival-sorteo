import nodemailer from "nodemailer";

function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM =
  process.env.EMAIL_FROM ?? `"Festival Sorteo" <${process.env.EMAIL_USER ?? "no-reply@festival.com"}>`;

function base(cuerpo: string, colorCabecera = "#1B4F8A") {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:24px auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <tr><td style="background:${colorCabecera};padding:28px 32px;">
    <p style="margin:0;color:#F5A623;font-size:22px;font-weight:900;letter-spacing:1px;">🎁 Festival Sorteo Escolar</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:32px;">
    ${cuerpo}
  </td></tr>
  <tr><td style="background:#f0f0f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;color:#999;font-size:12px;">Este mensaje fue generado automáticamente. No respondas a este correo.</p>
  </td></tr>
</table>
</body></html>`;
}

function fila(label: string, valor: string) {
  return `<tr>
    <td style="padding:8px 0;color:#666;font-size:14px;">${label}</td>
    <td style="padding:8px 0;font-weight:700;color:#1B4F8A;font-size:14px;">${valor}</td>
  </tr>`;
}

// ── Comprobante de compra ─────────────────────────────────────────────────

export async function enviarComprobante(opts: {
  correo: string;
  nombre: string;
  numeroCaja: string;
  idCompra: string;
  fecha: Date;
  precio: number;
}) {
  const { correo, nombre, numeroCaja, idCompra, fecha, precio } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">¡Compra exitosa! 🎉</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, tu número ha sido registrado.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Número de caja", `<span style="font-size:28px;color:#1B4F8A;font-weight:900;">#${numeroCaja}</span>`)}
      ${fila("Referencia", `<code style="font-size:12px;color:#888;">${idCompra}</code>`)}
      ${fila("Fecha", fecha.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }))}
      ${fila("Valor pagado", `$${precio.toLocaleString("es-CO")} COP`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Guarda esta referencia. El resultado del sorteo se basará en la Lotería de Bogotá.
      ¡Mucha suerte! 🍀
    </p>`;
  await crearTransporter().sendMail({
    from: FROM,
    to: correo,
    subject: `¡Compra exitosa! Caja #${numeroCaja} — Festival Sorteo`,
    html: base(cuerpo),
  });
}

// ── Notificación de premio ────────────────────────────────────────────────

const NOMBRE_CATEGORIA: Record<string, string> = {
  CUATRO_CIFRAS: "4 cifras exactas 🏆",
  TRES_CIFRAS:   "3 últimas cifras 🥈",
  DOS_CIFRAS:    "2 últimas cifras 🥉",
  UNA_CIFRA:     "1 última cifra 🎁",
};

export async function enviarPremio(opts: {
  correo: string;
  nombre: string;
  categoria: string;
  monto: number;
  numeroGanador: string;
}) {
  const { correo, nombre, categoria, monto, numeroGanador } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">¡Ganaste un premio!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ¡felicitaciones!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Número ganador del sorteo", `<span style="font-size:24px;font-weight:900;color:#1B4F8A;">${numeroGanador}</span>`)}
      ${fila("Categoría", NOMBRE_CATEGORIA[categoria] ?? categoria)}
      ${fila("Premio acreditado", `<span style="font-size:20px;font-weight:900;color:#F5A623;">$${monto.toLocaleString("es-CO")} COP</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Tu saldo ha sido acreditado en tu cuenta. Puedes solicitar el retiro
      directamente desde tu panel en <strong>Mi cuenta → Saldo disponible</strong>.
    </p>`;
  await crearTransporter().sendMail({
    from: FROM,
    to: correo,
    subject: `¡Ganaste $${monto.toLocaleString("es-CO")} en el Festival Sorteo! 🏆`,
    html: base(cuerpo, "#1B4F8A"),
  });
}

// ── Retiro aprobado ───────────────────────────────────────────────────────

export async function enviarRetiroAprobado(opts: {
  correo: string;
  nombre: string;
  monto: number;
  cuentaDestino: string;
}) {
  const { correo, nombre, monto, cuentaDestino } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#16a34a;font-size:22px;">Retiro aprobado ✅</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, tu solicitud fue procesada.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Monto a transferir", `<span style="font-size:20px;font-weight:900;color:#16a34a;">$${monto.toLocaleString("es-CO")} COP</span>`)}
      ${fila("Cuenta de destino", cuentaDestino)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      El pago será efectuado en las próximas <strong>24–48 horas hábiles</strong>.
      Si tienes dudas, contacta al administrador del festival.
    </p>`;
  await crearTransporter().sendMail({
    from: FROM,
    to: correo,
    subject: "Tu retiro fue aprobado — Festival Sorteo",
    html: base(cuerpo, "#16a34a"),
  });
}

// ── Retiro rechazado ──────────────────────────────────────────────────────

export async function enviarRetiroRechazado(opts: {
  correo: string;
  nombre: string;
  monto: number;
}) {
  const { correo, nombre, monto } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#dc2626;font-size:22px;">Solicitud de retiro rechazada</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, te informamos que tu solicitud no fue aprobada en esta ocasión.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Monto devuelto a tu saldo", `<span style="font-weight:900;color:#1B4F8A;">$${monto.toLocaleString("es-CO")} COP</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      El saldo fue devuelto a tu cuenta y puedes volver a solicitarlo.
      Comunícate con el administrador si necesitas más información.
    </p>`;
  await crearTransporter().sendMail({
    from: FROM,
    to: correo,
    subject: "Solicitud de retiro rechazada — Festival Sorteo",
    html: base(cuerpo, "#dc2626"),
  });
}
