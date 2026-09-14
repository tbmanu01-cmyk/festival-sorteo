import { NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Mismo criterio que /api/cron/backup: nunca exponer hash de contraseña ni
// tokens/códigos de sesión, 2FA o recuperación, ni siquiera a un admin.
const USER_SELECT = {
  id: true, nombre: true, apellido: true, documento: true, correo: true,
  celular: true, ciudad: true, departamento: true, fechaNacimiento: true,
  cuentaBancaria: true, banco: true, tipoCuenta: true, whatsapp: true,
  avatar: true, rol: true, saldoPuntos: true, activo: true, confirmado: true,
  eliminado: true, eliminadoEn: true, fechaRegistro: true, codigoRef: true,
  loginIntentos: true, bloqueadoHasta: true, sessionVersion: true,
} as const;

export async function GET() {
  if (!(await verificarAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const [
    usuarios, cajas, transacciones, sorteos, premios, retiros, config,
    sorteoAnticipados, referidos, cupones, giftCards, granSorteos,
    sorteosPreviosGran, notificaciones, conceptosRetencion,
  ] = await Promise.all([
    prisma.user.findMany({ select: USER_SELECT }),
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
  ]);

  const backup = {
    version: "3.0",
    fecha: new Date().toISOString(),
    proyecto: "Tienda 10K",
    resumen: {
      usuarios: usuarios.length,
      cajas: cajas.length,
      transacciones: transacciones.length,
      retiros: retiros.length,
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
