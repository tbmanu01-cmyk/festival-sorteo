// Alertas de seguridad por correo a todos los administradores — eventos
// críticos que hoy solo quedaban en el AuditLog sin que nadie los vigilara
// activamente: cuenta bloqueada por intentos fallidos, retiro grande
// aprobado, cambio de rol de usuario.

export async function enviarAlertaSeguridad(opts: { titulo: string; detalle: string }) {
  try {
    const { prisma } = await import("./prisma");
    const admins = await prisma.user.findMany({
      where: { rol: "ADMIN", activo: true },
      select: { correo: true },
    });

    const { enviarAlertaAdmin } = await import("./email");
    await Promise.all(
      admins.map((a) =>
        enviarAlertaAdmin({ correo: a.correo, titulo: opts.titulo, detalle: opts.detalle }).catch((e) =>
          console.error(`Error enviando alerta de seguridad a ${a.correo}:`, e)
        )
      )
    );
  } catch (e) {
    console.error("Error en enviarAlertaSeguridad:", e);
  }
}
