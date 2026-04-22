import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function verificarAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if ((session.user as { rol?: string }).rol !== "ADMIN") return null;
  return session;
}
