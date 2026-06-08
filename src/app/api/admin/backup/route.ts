import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { rol?: string }).rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [
    usuarios, cajas, transacciones, sorteos, premios, retiros, config,
    sorteoAnticipados, referidos, cupones, giftCards, granSorteos,
    sorteosPreviosGran, notificaciones, conceptosRetencion, bonos, bonoCompras,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.caja.findMany(),
    prisma.transaccion.findMany(),
    prisma.sorteo.findMany(),
    prisma.premio.findMany(),
    prisma.retiro.findMany(),
    prisma.config.findFirst(),
    prisma.sorteoAnticipado.findMany(),
    prisma.referido.findMany(),
    prisma.cupon.findMany(),
    prisma.giftCard.findMany(),
    prisma.granSorteo.findMany(),
    prisma.sorteoPrevioGran.findMany(),
    prisma.notificacion.findMany(),
    prisma.conceptoRetencion.findMany(),
    prisma.bono.findMany(),
    prisma.bonoCompra.findMany(),
  ]);

  const backup = {
    version: "2.0",
    fecha: new Date().toISOString(),
    proyecto: "Club 10K",
    resumen: {
      usuarios: usuarios.length,
      cajas: cajas.length,
      transacciones: transacciones.length,
      retiros: retiros.length,
      bonos: bonos.length,
      bonoCompras: bonoCompras.length,
      referidos: referidos.length,
      giftCards: giftCards.length,
    },
    tablas: {
      config,
      usuarios,
      referidos,
      cajas,
      transacciones,
      sorteos,
      premios,
      retiros,
      sorteoAnticipados,
      granSorteos,
      sorteosPreviosGran,
      cupones,
      giftCards,
      notificaciones,
      conceptosRetencion,
      bonos,
      bonoCompras,
    },
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-club10k-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
