import { NextRequest, NextResponse } from "next/server";
import { registroSchema } from "@/lib/validaciones";
import { checkRateLimit } from "@/lib/rateLimit";

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
    const refCode   = typeof body.refCode   === "string" ? body.refCode.trim().toUpperCase()   : null;
    const slotToken = typeof body.slotToken === "string" ? body.slotToken.trim()               : null;

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

    // Obtener admin para auto-asignación de usuarios sin código
    const adminUser = await prisma.user.findFirst({ where: { rol: "ADMIN" }, select: { id: true } });

    // Slot replacement: link new user into an existing reserved slot
    if (slotToken) {
      const ahora = new Date();
      const slot = await prisma.referido.findFirst({
        where: { slotToken, slotExpiry: { gt: ahora } },
      });
      if (slot) {
        await prisma.referido.update({
          where: { id: slot.id },
          data: { referidoId: nuevoId, slotToken: null, slotExpiry: null, compro: false, fecha: new Date() },
        });
      }
    } else if (refCode) {
      // Normal referral: check capacity before linking
      const MAX_HIJOS_L1 = 300; // 100 familias × 3 hijos
      const [referidor] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE "codigoRef" = ${refCode} AND id != ${nuevoId} LIMIT 1
      `;
      if (referidor) {
        const hijosCount = await prisma.referido.count({ where: { referidorId: referidor.id } });

        if (hijosCount >= MAX_HIJOS_L1) {
          // Árbol lleno — registrar usuario igualmente pero sin vincular a esta red
        } else {
          // Verificar progresión de familia: nueva familia solo abre cuando la anterior está completa
          let puedeVincular = true;
          if (hijosCount > 0 && hijosCount % 3 === 0) {
            const ultimosTres = await prisma.referido.findMany({
              where: { referidorId: referidor.id },
              orderBy: { fecha: "asc" },
              skip: hijosCount - 3,
              take: 3,
              select: { referidoId: true },
            });
            for (const hijo of ultimosTres) {
              const nietos = await prisma.referido.count({ where: { referidorId: hijo.referidoId } });
              if (nietos < 3) { puedeVincular = false; break; }
            }
          }

          if (puedeVincular) {
            const refId = crypto.randomUUID();
            await prisma.$executeRaw`
              INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
              VALUES (${refId}, ${referidor.id}, ${nuevoId}, NOW(), false)
              ON CONFLICT ("referidoId") DO NOTHING
            `;
          } else if (adminUser) {
            // Árbol del referidor lleno o familia incompleta → cae bajo el admin
            const refId = crypto.randomUUID();
            await prisma.$executeRaw`
              INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
              VALUES (${refId}, ${adminUser.id}, ${nuevoId}, NOW(), false)
              ON CONFLICT ("referidoId") DO NOTHING
            `;
          }
        }
      }
    } else if (adminUser) {
      // Sin código de referido → hijo directo del admin
      const refId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO referidos (id, "referidorId", "referidoId", fecha, compro)
        VALUES (${refId}, ${adminUser.id}, ${nuevoId}, NOW(), false)
        ON CONFLICT ("referidoId") DO NOTHING
      `;
    }

    // Enviar correo de verificación
    const verifyToken  = crypto.randomUUID();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await (await import("@/lib/prisma")).prisma.user.update({
      where: { id: nuevoId },
      data: { verifyToken, verifyTokenExpiry: verifyExpiry },
    });
    const base   = process.env.NEXTAUTH_URL ?? "https://tienda10k.com";
    const enlace = `${base}/api/auth/verificar-correo?token=${verifyToken}`;
    // No bloqueamos la respuesta del registro por el correo, pero sí lo
    // esperamos y registramos el error real (antes era fire-and-forget con
    // .catch(console.error) sobre una función que nunca lanzaba en fallos
    // de la API de Resend — ver enviarCorreo() en src/lib/email.ts).
    import("@/lib/email").then(({ enviarVerificacionCorreo }) =>
      enviarVerificacionCorreo({ correo, nombre, enlace })
    ).catch((error) => {
      console.error(`Error enviando correo de verificación a ${correo}:`, error);
    });

    return NextResponse.json({ mensaje: "Cuenta creada exitosamente. Revisa tu correo para verificar tu cuenta." }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor" }, { status: 500 });
  }
}
