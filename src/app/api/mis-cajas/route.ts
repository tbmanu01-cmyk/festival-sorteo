import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MINUTOS_RESERVA = 15;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const userId = (session.user as unknown as { id: string }).id;

  // Liberar reservas propias vencidas
  const expiradas = new Date(Date.now() - MINUTOS_RESERVA * 60 * 1000);
  await prisma.caja.updateMany({
    where: { userId, estado: "RESERVADA", fechaCompra: { lt: expiradas } },
    data: { estado: "DISPONIBLE", userId: null, fechaCompra: null, idCompra: null },
  });

  const [reservadas, vendidas, premios, retiros, usuario, todasAnticipadas] = await Promise.all([
    prisma.caja.findMany({
      where: { userId, estado: "RESERVADA" },
      select: { numero: true, fechaCompra: true },
      orderBy: { fechaCompra: "asc" },
    }),
    prisma.caja.findMany({
      where: { userId, estado: "VENDIDA" },
      select: { numero: true, fechaCompra: true, idCompra: true },
      orderBy: { fechaCompra: "desc" },
    }),
    prisma.premio.findMany({
      where: { userId },
      select: { categoria: true, monto: true, pagado: true },
    }),
    prisma.retiro.findMany({
      where: { userId },
      select: { id: true, monto: true, estado: true, fecha: true, cuentaDestino: true },
      orderBy: { fecha: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { nombre: true, saldoPuntos: true, banco: true, tipoCuenta: true, cuentaBancaria: true },
    }),
    prisma.sorteoAnticipado.findMany({
      where: { estado: "EJECUTADO" },
      select: { id: true, nombre: true, premioDescripcion: true, premioValor: true, fecha: true, ganadores: true },
    }).catch(() => [] as never[]),
  ]);

  const expiraMs = MINUTOS_RESERVA * 60 * 1000;
  const reservadasConExpiry = reservadas.map((r) => ({
    ...r,
    expira: r.fechaCompra
      ? new Date(r.fechaCompra.getTime() + expiraMs).toISOString()
      : null,
  }));

  type GanadorJSON = { userId: string; nombre: string; apellido: string; correo: string; numeroCaja: string };
  const anticipadasGanadas = todasAnticipadas
    .filter((a) => {
      const gs = a.ganadores as GanadorJSON[] | null;
      return Array.isArray(gs) && gs.some((g) => g.userId === userId);
    })
    .map((a) => {
      const gs = a.ganadores as GanadorJSON[];
      const miGanador = gs.find((g) => g.userId === userId);
      return {
        id: a.id,
        nombre: a.nombre,
        premioDescripcion: a.premioDescripcion,
        premioValor: a.premioValor,
        fecha: a.fecha,
        numeroCaja: miGanador?.numeroCaja ?? null,
      };
    });

  return NextResponse.json({
    reservadas: reservadasConExpiry,
    vendidas,
    premios,
    retiros,
    saldoPuntos: usuario?.saldoPuntos ?? 0,
    nombre: usuario?.nombre ?? "",
    banco: usuario?.banco ?? null,
    tipoCuenta: usuario?.tipoCuenta ?? null,
    cuentaBancaria: usuario?.cuentaBancaria ?? null,
    anticipadasGanadas,
  });
}
