import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";

function generarCodigoRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
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

    const nuevoId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO users (
        id, nombre, apellido, documento, correo, celular,
        ciudad, departamento, banco, "tipoCuenta", "cuentaBancaria",
        password, rol, "saldoPuntos", activo, confirmado, "fechaRegistro", "codigoRef"
      ) VALUES (
        ${nuevoId}, ${nombre}, ${apellido}, ${documento}, ${correo}, ${celular},
        ${ciudad}, ${departamento}, ${banco}, ${tipoCuenta}, ${cuentaBancaria},
        ${passwordHash}, 'USER'::"Rol", 0, true, false, NOW(), ${codigoRef}
      )
    `;

    // Register referral if valid refCode was provided
    if (refCode) {
      const [referidor] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${refCode} AND id != ${nuevoId} LIMIT 1
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
    console.error("Error en registro:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor" }, { status: 500 });
  }
}
