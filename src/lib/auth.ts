import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) return null;

        const bcrypt = (await import("bcryptjs")).default;
        const { prisma } = await import("./prisma");

        const user = await prisma.user.findUnique({
          where: { correo: credentials.correo },
          select: {
            id: true, correo: true, nombre: true, apellido: true,
            password: true, rol: true, activo: true,
            loginIntentos: true, bloqueadoHasta: true,
          },
        });

        if (!user || !user.activo) return null;

        // Verificar si la cuenta está bloqueada
        if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
          return null;
        }

        const passwordValida = await bcrypt.compare(credentials.password, user.password);

        if (!passwordValida) {
          // Incrementar contador de intentos fallidos
          const nuevosIntentos = (user.loginIntentos ?? 0) + 1;
          const bloquear = nuevosIntentos >= MAX_INTENTOS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginIntentos: nuevosIntentos,
              ...(bloquear && {
                bloqueadoHasta: new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000),
              }),
            },
          });

          // Registrar intento fallido en auditoría (fire and forget)
          prisma.auditLog.create({
            data: {
              userId: user.id,
              accion: "LOGIN_FALLIDO",
              detalle: bloquear
                ? `Cuenta bloqueada por ${MAX_INTENTOS} intentos fallidos`
                : `Intento ${nuevosIntentos}/${MAX_INTENTOS}`,
            },
          }).catch(() => undefined);

          return null;
        }

        // Login exitoso — resetear contador
        if ((user.loginIntentos ?? 0) > 0 || user.bloqueadoHasta) {
          await prisma.user.update({
            where: { id: user.id },
            data: { loginIntentos: 0, bloqueadoHasta: null },
          });
        }

        // Registrar login exitoso en auditoría (fire and forget)
        prisma.auditLog.create({
          data: { userId: user.id, accion: "LOGIN_OK" },
        }).catch(() => undefined);

        return {
          id: user.id,
          email: user.correo,
          name: `${user.nombre} ${user.apellido}`,
          rol: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = (user as unknown as { rol: string }).rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { rol: string }).rol = token.rol as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
};
