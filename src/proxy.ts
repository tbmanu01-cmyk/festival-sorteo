import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const RUTAS_PROTEGIDAS = ["/dashboard", "/admin", "/asistente", "/membresias", "/probabilidades", "/ranking"];

export default async function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname, search } = req.nextUrl;

  // Dominio canónico único: www.tienda10k.com. tienda10k.com (sin www)
  // servía la app directamente en vez de redirigir, así que una sesión
  // iniciada en un dominio podía comportarse como "logueado pero
  // deslogueado" al entrar por el otro — aunque las cookies ya se
  // comparten entre ambos, forzar un solo origen elimina esa clase entera
  // de inconsistencias (NEXTAUTH_URL, validación de callback, etc.).
  if (host === "tienda10k.com") {
    return NextResponse.redirect(`https://www.tienda10k.com${pathname}${search}`, 308);
  }

  const esProtegida = RUTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (!esProtegida) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  const rol = token.rol as string | undefined;

  if (pathname.startsWith("/admin") && rol !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/asistente") && rol !== "ASISTENTE" && rol !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
