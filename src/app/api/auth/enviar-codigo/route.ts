import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";

function normalizarWhatsapp(val: string): string {
  const digits = val.replace(/[\s\-\(\)+]/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("573")) return `+${digits}`;
  return `+${digits}`;
}

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const resultado = registroSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { mensaje: "Datos inválidos", errores: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { correo, documento, whatsapp } = resultado.data;
    const { prisma } = await import("@/lib/prisma");

    const existente = await prisma.user.findFirst({
      where: { OR: [{ correo }, { documento }] },
    });
    if (existente) {
      const campo = existente.correo === correo ? "correo electrónico" : "documento";
      return NextResponse.json(
        { mensaje: `Ya existe una cuenta con ese ${campo}.` },
        { status: 409 }
      );
    }

    const numero = normalizarWhatsapp(whatsapp);
    const codigo = generarCodigo();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

    const verificacion = await prisma.verificacionWhatsApp.create({
      data: { numero, codigo, expiraEn },
    });

    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${numero}`,
        body: `Tu código de verificación para Cajas Sorpresa 10K es: ${codigo}. Válido por 10 minutos. No lo compartas con nadie.`,
      });
    } catch (twilioError) {
      // Limpiar el registro si Twilio falla para no dejar códigos huérfanos
      await prisma.verificacionWhatsApp.delete({ where: { id: verificacion.id } }).catch(() => {});
      console.error("Error Twilio:", twilioError);
      return NextResponse.json(
        { mensaje: "Error al enviar el mensaje de WhatsApp. Verifica que el número esté registrado en WhatsApp." },
        { status: 500 }
      );
    }

    return NextResponse.json({ verificacionId: verificacion.id });
  } catch (error) {
    console.error("Error enviando código WhatsApp:", error);
    return NextResponse.json(
      { mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
