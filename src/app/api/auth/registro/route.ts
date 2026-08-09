import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";
import { checkRateLimit } from "@/lib/rateLimit";
import { AVATAR_PRESETS } from "@/lib/avatares";

function generarCodigoRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: máx 5 registros por IP cada hora
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = checkRateLimit(`registro:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { mensaje: "Demasiados registros desde esta red. Intenta más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const refCode = typeof body.refCode === "string" ? body.refCode.trim().toUpperCase() : null;

    const resultado = registroSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json(
        { mensaje: "Datos inválidos", errores: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      nombre, apellido, documento, correo, celular,
      ciudad, departamento, banco, tipoCuenta, cuentaBancaria, password,
    } = resultado.data;

    const bcrypt = (await import("bcryptjs")).default;
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

    // Registro cerrado: solo se puede entrar con un código de referido de un
    // usuario existente. Se valida ANTES de crear el usuario para no dejar
    // cuentas huérfanas.
    if (!refCode) {
      return NextResponse.json(
        { mensaje: "Necesitas un código de invitación válido para registrarte." },
        { status: 400 }
      );
    }
    const [referidorValido] = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE "codigoRef" = ${refCode} LIMIT 1
    `;
    if (!referidorValido) {
      return NextResponse.json(
        { mensaje: "Ese código de referido no existe. Verifica que esté bien escrito." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique referral code
    let codigoRef: string | null = null;
    for (let i = 0; i < 10; i++) {
      const candidato = generarCodigoRef();
      const [dup] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${candidato} LIMIT 1
      `;
      if (!dup) { codigoRef = candidato; break; }
    }

    const avatarPorDefecto = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].id;

    const nuevoId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO users (
        id, nombre, apellido, documento, correo, celular,
        ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
        password, rol, "saldoPuntos", activo, confirmado, "fechaRegistro", "codigoRef", avatar
      ) VALUES (
        ${nuevoId}, ${nombre}, ${apellido}, ${documento}, ${correo}, ${celular},
        ${ciudad}, ${departamento}, ${banco}, ${tipoCuenta}, ${cuentaBancaria},
        ${passwordHash}, 'USER'::"Rol", 0, true, false, NOW(), ${codigoRef}, ${avatarPorDefecto}
      )
    `;

    // Vincula al nuevo usuario bajo su referidor — ya se validó arriba que
    // el código de referido es válido antes de llegar hasta acá.
    const refId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
      VALUES (${refId}, ${referidorValido.id}, ${nuevoId}, NOW(), false)
      ON CONFLICT ("referidoId") DO NOTHING
    `;

    // Enviar código de verificación (6 dígitos, 10 min) — más robusto que un
    // link: no depende de que sobreviva un clic real ni el escaneo previo
    // que hacen algunos clientes de correo.
    const codigoVerificacion = String(Math.floor(100000 + Math.random() * 900000));
    const verifyExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await (await import("@/lib/prisma")).prisma.user.update({
      where: { id: nuevoId },
      data: { verifyToken: codigoVerificacion, verifyTokenExpiry: verifyExpiry },
    });
    // No bloqueamos la respuesta del registro por el correo, pero sí lo
    // esperamos y registramos el error real (antes era fire-and-forget con
    // .catch(console.error) sobre una función que nunca lanzaba en fallos
    // de la API de Resend — ver enviarCorreo() en src/lib/email.ts).
    import("@/lib/email").then(({ enviarCodigoVerificacion }) =>
      enviarCodigoVerificacion({ correo, nombre, codigo: codigoVerificacion, expiraMin: 10 })
    ).catch((error) => {
      console.error(`Error enviando código de verificación a ${correo}:`, error);
    });

    return NextResponse.json({ mensaje: "Cuenta creada exitosamente. Revisa tu correo para verificar tu cuenta." }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor" }, { status: 500 });
  }
}
