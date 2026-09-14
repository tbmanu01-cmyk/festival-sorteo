import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Campos de User que NUNCA deben salir del servidor, ni siquiera en un
// backup dirigido a admins — hash de contraseña y cualquier token/código
// vigente de sesión, 2FA o recuperación.
const USER_SELECT = {
  id: true, nombre: true, apellido: true, documento: true, correo: true,
  celular: true, ciudad: true, departamento: true, fechaNacimiento: true,
  cuentaBancaria: true, banco: true, tipoCuenta: true, whatsapp: true,
  avatar: true, rol: true, saldoPuntos: true, activo: true, confirmado: true,
  eliminado: true, eliminadoEn: true, fechaRegistro: true, codigoRef: true,
  loginIntentos: true, bloqueadoHasta: true, sessionVersion: true,
} as const;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
    proyecto: "Tienda 10K — Backup Diario Automático",
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

  const json = JSON.stringify(backup, null, 2);
  const nombreArchivo = `backup-club10k-${new Date().toISOString().slice(0, 10)}.json`;

  const admins = await prisma.user.findMany({
    where: { rol: "ADMIN", activo: true },
    select: { correo: true },
  });

  const { enviarBackupDiario } = await import("@/lib/email");
  const resultados = await Promise.allSettled(
    admins.map((a) =>
      enviarBackupDiario({
        correo: a.correo,
        resumen: backup.resumen,
        jsonAdjunto: json,
        nombreArchivo,
      })
    )
  );

  const fallidos = resultados.filter((r) => r.status === "rejected");
  if (fallidos.length > 0) {
    console.error("[cron backup] fallos al enviar a algunos admins:", fallidos);
  }
  if (fallidos.length === resultados.length && admins.length > 0) {
    return NextResponse.json({ ok: false, error: "No se pudo enviar el backup a ningún admin." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resumen: backup.resumen, enviadoA: admins.length - fallidos.length });
}
