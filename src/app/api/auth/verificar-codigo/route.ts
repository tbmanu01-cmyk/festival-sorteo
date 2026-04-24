import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";

function normalizarWhatsapp(val: string): string {
  const digits = val.replace(/[\s\-\(\)+]/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("573")) return `+${digits}`;
  return `+${digits}`;
}

function generarCodigoRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verificacionId, codigo, refCode, ...formData } = body;

    if (!verificacionId || !codigo) {
      return NextResponse.json(
        { mensaje: "Faltan datos de verificación." },
        { status: 400 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const verificacion = await prisma.verificacionWhatsApp.findUnique({
      where: { id: verificacionId },
    });

    if (!verificacion) {
      return NextResponse.json({ mensaje: "Verificación no encontrada." }, { status: 404 });
    }
    if (verificacion.verificado) {
      return NextResponse.json({ mensaje: "Este código ya fue utilizado." }, { status: 400 });
    }
    if (new Date() > verificacion.expiraEn) {
      return NextResponse.json(
        { mensaje: "El código ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }
    if (verificacion.codigo !== String(codigo).trim()) {
      return NextResponse.json({ mensaje: "Código incorrecto. Intenta nuevamente." }, { status: 400 });
    }

    await prisma.verificacionWhatsApp.update({
      where: { id: verificacionId },
      data: { verificado: true },
    });

    const resultado = registroSchema.safeParse(formData);
    if (!resultado.success) {
      return NextResponse.json({ mensaje: "Datos del formulario inválidos." }, { status: 400 });
    }

    const {
      nombre, apellido, documento, correo, celular, whatsapp,
      ciudad, departamento, banco, tipoCuenta, cuentaBancaria, password,
    } = resultado.data;

    const existente = await prisma.user.findFirst({
      where: { OR: [{ correo }, { documento }] },
    });
    if (existente) {
      const campo = existente.correo === correo ? "correo electrónico" : "documento";
      return NextResponse.json({ mensaje: `Ya existe una cuenta con ese ${campo}.` }, { status: 409 });
    }

    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(password, 12);
    const whatsappNormalizado = normalizarWhatsapp(whatsapp);

    let codigoRef: string | null = null;
    for (let i = 0; i < 10; i++) {
      const candidato = generarCodigoRef();
      const [dup] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${candidato} LIMIT 1
      `;
      if (!dup) { codigoRef = candidato; break; }
    }

    const nuevoId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO users (
        id, nombre, apellido, documento, correo, celular, whatsapp,
        ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
        password, rol, "saldoPuntos", activo, confirmado, "fechaRegistro", "codigoRef"
      ) VALUES (
        ${nuevoId}, ${nombre}, ${apellido}, ${documento}, ${correo}, ${celular}, ${whatsappNormalizado},
        ${ciudad}, ${departamento}, ${banco}, ${tipoCuenta}, ${cuentaBancaria},
        ${passwordHash}, 'USER'::"Rol", 0, true, false, NOW(), ${codigoRef}
      )
    `;

    const refCodeClean = typeof refCode === "string" ? refCode.trim().toUpperCase() : null;
    if (refCodeClean) {
      const [referidor] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${refCodeClean} AND id != ${nuevoId} LIMIT 1
      `;
      if (referidor) {
        const refId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
          VALUES (${refId}, ${referidor.id}, ${nuevoId}, NOW(), false)
          ON CONFLICT ("referidoId") DO NOTHING
        `;
      }
    }

    return NextResponse.json({ mensaje: "Cuenta creada exitosamente" }, { status: 201 });
  } catch (error) {
    console.error("Error en verificación:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor" }, { status: 500 });
  }
}
