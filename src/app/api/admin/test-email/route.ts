import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export async function POST() {
  if (!await verificarAdmin()) {
    return NextResponse.json({ mensaje: "Acceso denegado." }, { status: 403 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = process.env.EMAIL_FROM ?? "Club 10K <noreply@tienda10k.com>";

  // Intentar enviar a tbmanu01@gmail.com
  const { data, error } = await resend.emails.send({
    from,
    to: "tbmanu01@gmail.com",
    subject: "Test Club 10K — diagnóstico",
    html: "<p>Si recibes este correo, el email está funcionando ✅</p>",
  });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
