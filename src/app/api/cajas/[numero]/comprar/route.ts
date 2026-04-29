import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const PRECIO_CAJA = 10_000;


export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "Debes iniciar sesión." }, { status: 401 });
    }

    const { numero } = await params;
    if (!/^\d{4}$/.test(numero)) {
      return NextResponse.json({ mensaje: "Número inválido." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const userId = (session.user as unknown as { id: string }).id;

    const caja = await prisma.caja.findUnique({ where: { numero } });
    if (!caja) return NextResponse.json({ mensaje: "Caja no encontrada." }, { status: 404 });

    // Permitir comprar si está DISPONIBLE o RESERVADA por el mismo usuario
    const esReservadaMia = caja.estado === "RESERVADA" && caja.userId === userId;
    if (caja.estado !== "DISPONIBLE" && !esReservadaMia) {
      return NextResponse.json(
        { mensaje: "Esta caja ya está comprada o reservada por otro usuario." },
        { status: 409 }
      );
    }

    const idCompra = `COMPRA-${userId}-${Date.now()}`;

    const [cajaActualizada] = await prisma.$transaction([
      prisma.caja.update({
        where: { numero },
        data: { estado: "VENDIDA", userId, fechaCompra: new Date(), idCompra },
      }),
      prisma.transaccion.create({
        data: {
          userId,
          tipo: "COMPRA",
          monto: -PRECIO_CAJA,
          descripcion: `Compra de caja #${numero}`,
          referencia: idCompra,
        },
      }),
    ]);

    // Email comprobante — fire and forget
    prisma.user.findUnique({ where: { id: userId }, select: { nombre: true, correo: true } })
      .then((u) => {
        if (!u) return;
        import("@/lib/email").then(({ enviarComprobante }) =>
          enviarComprobante({
            correo: u.correo,
            nombre: u.nombre,
            numeroCaja: numero,
            idCompra,
            fecha: new Date(),
            precio: PRECIO_CAJA,
          }).catch((err) => console.error("Email comprobante error:", err))
        );
      })
      .catch(() => undefined);

    // Referidos: marcar compra y emitir cupones si corresponde — fire and forget
    Promise.resolve().then(async () => {
      type RefRow = { id: string; referidorId: string; compro: boolean };
      const [ref] = await prisma.$queryRaw<RefRow[]>`
        SELECT id, "referidorId", compro FROM referidos WHERE "referidoId" = ${userId} LIMIT 1
      `;
      if (!ref || ref.compro) return;

      // ¿Es la primera compra del referido?
      const cajasCount = await prisma.caja.count({ where: { userId, estado: "VENDIDA" } });
      if (cajasCount !== 1) return; // solo en la primera compra

      await prisma.$executeRaw`UPDATE referidos SET compro = true WHERE id = ${ref.id}`;

      // Contar referidos comprados del referidor
      const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM referidos WHERE "referidorId" = ${ref.referidorId} AND compro = true
      `;
      const totalNum = Number(total);
      if (totalNum > 0 && totalNum % 5 === 0) {
        const cuponId = crypto.randomUUID();
        const cuponCodigo = `LIBRE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        await prisma.$executeRaw`
          INSERT INTO cupones (id, "usuarioId", codigo, usado, "fechaCreacion")
          VALUES (${cuponId}, ${ref.referidorId}, ${cuponCodigo}, false, NOW())
        `;
      }
    }).catch((err) => console.error("Referidos post-compra error:", err));

    return NextResponse.json({
      mensaje: `¡Caja ${numero} comprada exitosamente!`,
      caja: cajaActualizada,
      referencia: idCompra,
    });
  } catch (error) {
    console.error("POST comprar error:", error);
    return NextResponse.json({ mensaje: "Error interno del servidor." }, { status: 500 });
  }
}
