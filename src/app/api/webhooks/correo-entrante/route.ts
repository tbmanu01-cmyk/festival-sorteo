import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// Correo entrante a @tienda10k.com (p. ej. soporte@, el canal de PQRS de los
// Términos). Resend recibe el correo (MX del dominio apunta a Resend) y llama a
// este webhook con el evento `email.received`, que trae solo metadatos; el
// cuerpo se pide a la API de Resend y se reenvía al buzón del equipo.
//
// Seguridad: si RESEND_WEBHOOK_SECRET está configurado se valida la firma Svix.
// Aun sin él, solo se reenvían correos que existen de verdad en la cuenta de
// Resend (se vuelven a consultar por id) y siempre a un destino fijo.

const DESTINO = "tbmanu03@gmail.com";
const REMITENTE = "Soporte Tienda 10K <soporte@tienda10k.com>";
const API = "https://api.resend.com";

interface CorreoRecibido {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  created_at?: string;
  attachments?: { filename?: string; size?: number }[];
}

function firmaValida(cuerpo: string, headers: Headers, secreto: string) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const firmas = headers.get("svix-signature");
  if (!id || !timestamp || !firmas) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) return false;

  const clave = Buffer.from(secreto.replace(/^whsec_/, ""), "base64");
  const esperada = createHmac("sha256", clave).update(`${id}.${timestamp}.${cuerpo}`).digest();
  return firmas.split(" ").some((f) => {
    const [, valor] = f.split(",");
    if (!valor) return false;
    const recibida = Buffer.from(valor, "base64");
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  });
}

function escapar(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "Sin RESEND_API_KEY" }, { status: 500 });

  const cuerpo = await req.text();
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  if (secreto && !firmaValida(cuerpo, req.headers, secreto)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let evento: { type?: string; data?: { email_id?: string } };
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Otros eventos (entregado, rebotado…) no se procesan aquí.
  if (evento.type !== "email.received" || !evento.data?.email_id) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const res = await fetch(`${API}/emails/receiving/${encodeURIComponent(evento.data.email_id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("[correo-entrante] no se pudo leer el correo", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  const correo = (await res.json()) as CorreoRecibido;

  const fecha = correo.created_at
    ? new Date(correo.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })
    : "";
  const adjuntos = (correo.attachments ?? []).map((a) => a.filename).filter(Boolean);
  const encabezado = `
    <div style="font-family:sans-serif;font-size:13px;color:#374151;background:#f3f4f6;border-radius:8px;padding:12px 14px;margin-bottom:16px">
      <strong>Correo recibido en ${escapar(correo.to.join(", "))}</strong><br>
      De: ${escapar(correo.from)}<br>
      ${correo.cc?.length ? `CC: ${escapar(correo.cc.join(", "))}<br>` : ""}
      Fecha: ${escapar(fecha)}<br>
      ${adjuntos.length ? `Adjuntos (ver en Resend → Emails → Receiving): ${escapar(adjuntos.join(", "))}<br>` : ""}
      <span style="color:#6b7280">Responde a este correo para contestarle directamente al remitente.</span>
    </div>`;
  const contenido = correo.html
    ? correo.html
    : `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapar(correo.text ?? "(sin contenido)")}</pre>`;

  const envio = await fetch(`${API}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: REMITENTE,
      to: DESTINO,
      reply_to: correo.from,
      subject: `[Soporte] ${correo.subject || "(sin asunto)"}`,
      html: encabezado + contenido,
    }),
  });
  if (!envio.ok) {
    console.error("[correo-entrante] no se pudo reenviar", envio.status, await envio.text().catch(() => ""));
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
