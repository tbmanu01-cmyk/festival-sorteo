import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// Revalida el usuario contra la BD en vez de confiar solo en el JWT: si un
// admin cambia el rol, desactiva la cuenta, o fuerza cierre de sesión de
// alguien (sessionVersion incrementado), el próximo llamado a un endpoint
// /api/admin o /api/asistente de esa persona se rechaza de inmediato, sin
// esperar a que su token expire o se renueve solo.
async function usuarioVigente(sessionUserId: string, sessionVersionToken: unknown) {
  const { prisma } = await import("./prisma");
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { rol: true, activo: true, sessionVersion: true },
  });
  if (!user || !user.activo) return null;
  if (user.sessionVersion !== sessionVersionToken) return null;
  return user;
}

export async function verificarAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const { id, sessionVersion } = session.user as { id?: string; sessionVersion?: number };
  if (!id) return null;
  const user = await usuarioVigente(id, sessionVersion);
  if (!user || user.rol !== "ADMIN") return null;
  return session;
}

export async function verificarAsistente() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const { id, sessionVersion } = session.user as { id?: string; sessionVersion?: number };
  if (!id) return null;
  const user = await usuarioVigente(id, sessionVersion);
  if (!user || (user.rol !== "ASISTENTE" && user.rol !== "ADMIN")) return null;
  return session;
}
