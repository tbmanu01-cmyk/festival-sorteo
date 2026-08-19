import { Resend } from "resend";

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM =
  process.env.EMAIL_FROM ?? "Tienda 10K <noreply@tienda10k.com>";

function base(cuerpo: string, colorCabecera = "#1B4F8A") {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:24px auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <tr><td style="background:${colorCabecera};padding:28px 32px;">
    <p style="margin:0;color:#F5A623;font-size:22px;font-weight:900;letter-spacing:1px;">🎁 Tienda 10K</p>
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

// El SDK de Resend NO lanza excepción en errores de la API (dominio no
// verificado, remitente rechazado, rate limit, etc.) — devuelve { data, error }
// silenciosamente. Sin este chequeo, un envío fallido se veía igual que uno
// exitoso para quien llamaba la función, y nunca quedaba rastro en los logs.
async function enviarCorreo(payload: { to: string; subject: string; html: string }) {
  const { data, error } = await resend().emails.send({ from: FROM, ...payload });
  if (error) {
    throw new Error(`Resend rechazó el envío a ${payload.to} ("${payload.subject}"): ${error.name} — ${error.message}`);
  }
  return data;
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
      ${fila("Membresía", `<span style="font-size:28px;color:#1B4F8A;font-weight:900;">#${numeroCaja}</span>`)}
      ${fila("Referencia", `<code style="font-size:12px;color:#888;">${idCompra}</code>`)}
      ${fila("Fecha", fecha.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }))}
      ${fila("Valor pagado", `$${precio.toLocaleString("es-CO")} COP`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Guarda esta referencia. El resultado se determinará mediante selección aleatoria de membresías.
      ¡Mucha suerte! 🍀
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡Membresía activada! #${numeroCaja} — Tienda 10K`,
    html: base(cuerpo),
  });
}

export async function enviarComprobanteLote(opts: {
  correo: string;
  nombre: string;
  numerosCaja: string[];
  idLote: string;
  fecha: Date;
  precioTotal: number;
}) {
  const { correo, nombre, numerosCaja, idLote, fecha, precioTotal } = opts;
  const listaNumeros = numerosCaja
    .map((n) => `<span style="display:inline-block;margin:2px 6px 2px 0;padding:4px 10px;background:#eef2ff;border-radius:6px;font-weight:900;color:#1B4F8A;">#${n}</span>`)
    .join("");
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">¡Compra exitosa! 🎉</h2>
    <p style="margin:0 0 20px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, tus ${numerosCaja.length} membresías fueron registradas.</p>
    <div style="margin:0 0 20px;">${listaNumeros}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Referencia", `<code style="font-size:12px;color:#888;">${idLote}</code>`)}
      ${fila("Fecha", fecha.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }))}
      ${fila("Cantidad", `${numerosCaja.length} membresías`)}
      ${fila("Valor pagado (total)", `$${precioTotal.toLocaleString("es-CO")} COP`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Guarda esta referencia. El resultado se determinará mediante selección aleatoria de membresías.
      ¡Mucha suerte! 🍀
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡${numerosCaja.length} membresías activadas! — Tienda 10K`,
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
      ${fila("Número ganador de la selección aleatoria", `<span style="font-size:24px;font-weight:900;color:#1B4F8A;">${numeroGanador}</span>`)}
      ${fila("Categoría", NOMBRE_CATEGORIA[categoria] ?? categoria)}
      ${fila("Premio acreditado", `<span style="font-size:20px;font-weight:900;color:#F5A623;">$${monto.toLocaleString("es-CO")} COP</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Tu saldo ha sido acreditado en tu cuenta. Puedes solicitar el retiro
      directamente desde tu panel en <strong>Mi cuenta → Saldo disponible</strong>.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡Ganaste $${monto.toLocaleString("es-CO")} en Tienda 10K! 🏆`,
    html: base(cuerpo, "#1B4F8A"),
  });
}

export async function enviarPremioGiftCard(opts: {
  correo: string;
  nombre: string;
  codigoGiftCard: string;
  valorGiftCard: number;
  numeroGanador: string;
}) {
  const { correo, nombre, codigoGiftCard, valorGiftCard, numeroGanador } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#16a34a;font-size:22px;">¡Ganaste una membresía gratis! 🎁</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ¡tu cifra coincidió!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Número ganador de la selección aleatoria", `<span style="font-size:24px;font-weight:900;color:#1B4F8A;">${numeroGanador}</span>`)}
      ${fila("Categoría", NOMBRE_CATEGORIA["UNA_CIFRA"])}
      ${fila("Tu regalo", `<span style="font-size:18px;font-weight:900;color:#16a34a;">Gift Card $${valorGiftCard.toLocaleString("es-CO")} COP</span>`)}
      ${fila("Código gift card", `<span style="font-family:monospace;font-size:20px;font-weight:900;color:#102463;letter-spacing:2px;">${codigoGiftCard}</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Esto te da una <strong>segunda oportunidad</strong> en la siguiente selección aleatoria.
      Puedes usar tu gift card al comprar tu próxima membresía en
      <strong>Mi cuenta → Membresías</strong>. ¡Buena suerte la próxima vez! 🍀
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡Ganaste una membresía gratis en Tienda 10K! 🎁`,
    html: base(cuerpo, "#16a34a"),
  });
}

// ── Gift card recibida (umbral de referidos/compras propias, o regalo) ────
// Distinta de enviarPremioGiftCard: esa es solo para el premio de 1 cifra
// del sorteo (menciona número ganador/categoría). Esta cubre los otros 2
// orígenes de gift card, que antes NO enviaban ningún correo al beneficiario.

export async function enviarGiftCardRecibida(opts: {
  correo: string;
  nombre: string;
  codigoGiftCard: string;
  valorGiftCard: number;
  motivo: string;
}) {
  const { correo, nombre, codigoGiftCard, valorGiftCard, motivo } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#16a34a;font-size:22px;">¡Recibiste una gift card! 🎁</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ${motivo}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Valor de tu gift card", `<span style="font-size:20px;font-weight:900;color:#16a34a;">$${valorGiftCard.toLocaleString("es-CO")} COP</span>`)}
      ${fila("Código gift card", `<span style="font-family:monospace;font-size:20px;font-weight:900;color:#102463;letter-spacing:2px;">${codigoGiftCard}</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Úsala al comprar tu próxima membresía, regálala a alguien más, o conviértela
      en saldo de tu cuenta desde <strong>Mi cuenta → Gift cards</strong>.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡Recibiste una gift card en Tienda 10K! 🎁`,
    html: base(cuerpo, "#16a34a"),
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
      Si tienes dudas, contacta al administrador.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: "Tu retiro fue aprobado — Tienda 10K",
    html: base(cuerpo, "#16a34a"),
  });
}

// ── Premio selección anticipada ───────────────────────────────────────────

export async function enviarPremioAnticipado(opts: {
  correo: string;
  nombre: string;
  nombreEvento: string;
  premioDescripcion: string;
  numeroCaja: string;
}) {
  const { correo, nombre, nombreEvento, premioDescripcion, numeroCaja } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">¡Ganaste en una selección anticipada! 🎉</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ¡felicitaciones!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Evento", `<strong>${nombreEvento}</strong>`)}
      ${fila("Tu número de membresía ganador", `<span style="font-size:24px;font-weight:900;color:#1B4F8A;">#${numeroCaja}</span>`)}
      ${fila("Premio", `<span style="font-size:20px;font-weight:900;color:#F5A623;">${premioDescripcion}</span>`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      El administrador se pondrá en contacto contigo para coordinar la entrega del premio.
      ¡Mucha suerte en la selección aleatoria principal también! 🍀
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `¡Ganaste en ${nombreEvento} — Tienda 10K! 🎉`,
    html: base(cuerpo, "#1B4F8A"),
  });
}

// ── Recuperación de contraseña ────────────────────────────────────────────

export async function enviarRecuperacionPassword(opts: {
  correo: string;
  nombre: string;
  enlace: string;
}) {
  const { correo, nombre, enlace } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">Recuperar contraseña</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">
      Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace es válido por <strong>1 hora</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${enlace}" style="display:inline-block;background:#1B4F8A;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;text-decoration:none;">
        Restablecer contraseña
      </a>
    </div>
    <p style="margin:0;color:#999;font-size:13px;line-height:1.6;">
      Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: "Restablece tu contraseña — Tienda 10K",
    html: base(cuerpo),
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
  await enviarCorreo({
    to: correo,
    subject: "Solicitud de retiro rechazada — Tienda 10K",
    html: base(cuerpo, "#dc2626"),
  });
}

// ── Verificación de correo al registrarse ────────────────────────────────
// Código de 6 dígitos en vez de link — un link puede quedar invalidado por
// el escaneo automático que hacen algunos clientes de correo antes de que
// el usuario le dé clic. El código lo escribe el usuario ya con sesión
// activa en la app, sin depender de que el link sobreviva ese salto.

export async function enviarCodigoVerificacion(opts: {
  correo: string;
  nombre: string;
  codigo: string;
  expiraMin: number;
}) {
  const { correo, nombre, codigo, expiraMin } = opts;
  const digitos = codigo.split("").map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f0f4ff;border:2px solid #c7d2fe;border-radius:10px;font-size:28px;font-weight:900;color:#1B4F8A;margin:0 4px;">${d}</span>`
  ).join("");

  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">Confirma tu correo 📧</h2>
    <p style="margin:0 0 20px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ingresa este código en la app para activar tu cuenta.</p>
    <div style="text-align:center;padding:24px 0;">
      <p style="margin:0 0 12px;color:#888;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Tu código</p>
      <div>${digitos}</div>
      <p style="margin:16px 0 0;color:#999;font-size:13px;">Válido por <strong>${expiraMin} minutos</strong>.</p>
    </div>
    <p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.6;text-align:center;">
      Si no creaste esta cuenta, ignora este correo.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `${codigo} es tu código para activar tu cuenta — Tienda 10K`,
    html: base(cuerpo),
  });
}

// ── Código de verificación en dos pasos (login admin) ────────────────────

export async function enviarCodigo2FA(opts: {
  correo: string;
  nombre: string;
  codigo: string;
  expiraMin: number;
}) {
  const { correo, nombre, codigo, expiraMin } = opts;
  const digitos = codigo.split("").map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f0f4ff;border:2px solid #c7d2fe;border-radius:10px;font-size:28px;font-weight:900;color:#1B4F8A;margin:0 4px;">${d}</span>`
  ).join("");

  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">Verificación en dos pasos 🔒</h2>
    <p style="margin:0 0 20px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, alguien está iniciando sesión en tu cuenta de administrador. Ingresa este código para continuar.</p>
    <div style="text-align:center;padding:24px 0;">
      <p style="margin:0 0 12px;color:#888;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Tu código</p>
      <div>${digitos}</div>
      <p style="margin:16px 0 0;color:#999;font-size:13px;">Válido por <strong>${expiraMin} minutos</strong>.</p>
    </div>
    <p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.6;text-align:center;">
      Si no fuiste tú, cambia tu contraseña de inmediato.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `${codigo} es tu código de verificación — Tienda 10K`,
    html: base(cuerpo),
  });
}

// ── Código de verificación de retiro ─────────────────────────────────────

export async function enviarCodigoRetiro(opts: {
  correo: string;
  nombre: string;
  monto: number;
  codigo: string;
  expiraMin: number;
}) {
  const { correo, nombre, monto, codigo, expiraMin } = opts;
  const digitos = codigo.split("").map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f0f4ff;border:2px solid #c7d2fe;border-radius:10px;font-size:28px;font-weight:900;color:#1B4F8A;margin:0 4px;">${d}</span>`
  ).join("");

  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">Código de verificación 🔐</h2>
    <p style="margin:0 0 20px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, ingresa este código en la app para confirmar tu retiro.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:24px;">
      ${fila("Monto", `<strong style="color:#16a34a;font-size:18px;">$${monto.toLocaleString("es-CO")} COP</strong>`)}
      ${fila("Expira en", `${expiraMin} minutos`)}
    </table>
    <div style="text-align:center;padding:24px 0;">
      <p style="margin:0 0 12px;color:#888;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Tu código</p>
      <div>${digitos}</div>
    </div>
    <p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.6;text-align:center;">Si no solicitaste este retiro, <strong>ignora este correo</strong>. Tu saldo está seguro.</p>
  `;
  await enviarCorreo({
    to: correo,
    subject: `${codigo} es tu código de retiro — Tienda 10K`,
    html: base(cuerpo, "#1B4F8A"),
  });
}

// ── Pagos manuales ────────────────────────────────────────────────────────

export async function enviarComprobanteRecibido(opts: {
  correo: string;
  nombre: string;
  numeroCaja: string;
  referencia: string;
  monto: number;
}) {
  const { correo, nombre, numeroCaja, referencia, monto } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#1B4F8A;font-size:22px;">¡Comprobante recibido! 📎</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, recibimos tu comprobante de pago. Lo revisaremos y te notificaremos pronto.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Membresía solicitada", `<span style="font-size:22px;font-weight:900;color:#1B4F8A;">#${numeroCaja}</span>`)}
      ${fila("Referencia de pago", `<code style="font-size:12px;color:#888;">${referencia}</code>`)}
      ${fila("Valor", `$${monto.toLocaleString("es-CO")} COP`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Nuestro equipo revisará tu pago en las próximas horas. Recibirás otro correo cuando sea aprobado. 🙏
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: "Comprobante recibido — Tienda 10K",
    html: base(cuerpo),
  });
}

export async function enviarPagoManualAprobado(opts: {
  correo: string;
  nombre: string;
  numeroCaja: string;
  referencia: string;
  monto: number;
}) {
  const { correo, nombre, numeroCaja, referencia, monto } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#16a34a;font-size:22px;">¡Pago aprobado! 🎉</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, tu pago fue verificado y tu membresía ya está activa.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;">
      ${fila("Membresía activada", `<span style="font-size:28px;font-weight:900;color:#1B4F8A;">#${numeroCaja}</span>`)}
      ${fila("Referencia", `<code style="font-size:12px;color:#888;">${referencia}</code>`)}
      ${fila("Valor pagado", `$${monto.toLocaleString("es-CO")} COP`)}
    </table>
    <p style="margin:24px 0 0;color:#555;font-size:14px;line-height:1.6;">
      ¡Ya estás participando en la selección aleatoria! Guarda tu número y mucha suerte. 🍀
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: "¡Tu membresía fue aprobada! — Tienda 10K",
    html: base(cuerpo, "#16a34a"),
  });
}

export async function enviarPagoManualRechazado(opts: {
  correo: string;
  nombre: string;
  numeroCaja: string;
  motivo?: string;
}) {
  const { correo, nombre, numeroCaja, motivo } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#dc2626;font-size:22px;">Pago no aprobado</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;">Hola <strong>${nombre}</strong>, no pudimos verificar tu pago para la membresía <strong>#${numeroCaja}</strong>.</p>
    ${motivo ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;color:#991b1b;font-size:14px;"><strong>Motivo:</strong> ${motivo}</div>` : ""}
    <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">
      Si crees que es un error, contacta a nuestro equipo de soporte y comparte tu comprobante.<br>
      Puedes intentar nuevamente desde <a href="https://tienda10k.com/membresias" style="color:#1B4F8A;font-weight:600;">tienda10k.com/membresias</a>
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: "Pago no aprobado — Tienda 10K",
    html: base(cuerpo, "#dc2626"),
  });
}

// ── Alerta de seguridad a administradores ─────────────────────────────────

export async function enviarAlertaAdmin(opts: {
  correo: string;
  titulo: string;
  detalle: string;
}) {
  const { correo, titulo, detalle } = opts;
  const cuerpo = `
    <h2 style="margin:0 0 4px;color:#dc2626;font-size:22px;">⚠️ Alerta de seguridad</h2>
    <p style="margin:0 0 20px;color:#555;font-size:15px;font-weight:700;">${titulo}</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;color:#7f1d1d;font-size:14px;line-height:1.6;">
      ${detalle}
    </div>
    <p style="margin:20px 0 0;color:#999;font-size:13px;line-height:1.6;">
      Revisa el log de auditoría en el panel admin si necesitas más contexto.
    </p>`;
  await enviarCorreo({
    to: correo,
    subject: `🚨 ${titulo} — Tienda 10K`,
    html: base(cuerpo, "#dc2626"),
  });
}
