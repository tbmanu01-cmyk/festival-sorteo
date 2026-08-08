// Reutilizado por /api/chat, /api/chat/mensaje y /api/chat/solicitar-asesor
// para resolver "la conversación activa de este usuario" con una sola regla
// consistente: si la última conversación nunca escaló a un asesor y lleva
// más de HORAS_INACTIVIDAD_BOT sin movimiento, se da por abandonada — se
// cierra sola y el usuario arranca una conversación nueva la próxima vez
// que escriba. Las conversaciones que sí escalaron (ESPERANDO_ASESOR /
// EN_ATENCION) nunca expiran solas; solo un admin las cierra a mano.
export const HORAS_INACTIVIDAD_BOT = 48;

// `include` se reenvía tal cual a Prisma por si el caller necesita traer
// relaciones (mensajes, asesor, etc.) en la misma consulta.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function obtenerConversacionActiva(prisma: any, usuarioId: string, include?: Record<string, unknown>) {
  const conversacion = await prisma.chatConversacion.findFirst({
    where: { usuarioId, estado: { not: "CERRADA" } },
    orderBy: { updatedAt: "desc" },
    ...(include ? { include } : {}),
  });

  if (!conversacion) return null;

  if (!conversacion.escalada) {
    const limite = new Date(Date.now() - HORAS_INACTIVIDAD_BOT * 60 * 60 * 1000);
    if (conversacion.updatedAt < limite) {
      await prisma.chatConversacion.update({ where: { id: conversacion.id }, data: { estado: "CERRADA" } });
      return null;
    }
  }

  return conversacion;
}
