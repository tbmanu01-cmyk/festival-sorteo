import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as { rol?: string } | null;
    const esAdmin = token?.rol === "ADMIN";
    const esRutaAdmin = req.nextUrl.pathname.startsWith("/admin");

    // Si intenta acceder a /admin sin ser ADMIN → redirige al dashboard
    if (esRutaAdmin && !esAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Si no hay token (no autenticado), redirige al login
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  // Protege páginas de usuario y admin (no afecta rutas /api/*)
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
