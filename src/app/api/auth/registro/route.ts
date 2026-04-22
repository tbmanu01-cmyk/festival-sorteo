import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";

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

    await prisma.user.create({
      data: {
        nombre, apellido, documento, correo, celular,
        ciudad, departamento, banco, tipoCuenta, cuentaBancaria,
        password: passwordHash,
      },
    });

    return NextResponse.json({ mensaje: "Cuenta creada exitosamente" }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor" }, { status: 500 });
  }
}
