import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const RUTAS_PROTEGIDAS = ["/dashboard", "/admin", "/asistente", "/membresias", "/probabilidades", "/ranking"];

// Nonce por request para la CSP — reemplaza 'unsafe-inline'/'unsafe-eval' en
// script-src (que antes permitían ejecutar CUALQUIER script inyectado, la
// forma más común de explotar un XSS). Next.js detecta automáticamente el
// nonce en la cabecera CSP de la respuesta y lo aplica a sus propios scripts
// inline (hidratación/RSC) sin configuración adicional. style-src se queda
// con 'unsafe-inline' a propósito — la app usa `style={{...}}` extensivamente
// en decenas de componentes, y removerlo requeriría reescribirlos todos; el
// riesgo de inyección de CSS es mucho menor que el de scripts.
function construirCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://checkout.bold.co`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = construirCsp(nonce);

  const esProtegida = RUTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(r + "/"));

  function conCsp(res: NextResponse) {
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("x-nonce", nonce);
    return res;
  }

  if (!esProtegida) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    return conCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return conCsp(NextResponse.redirect(signInUrl));
  }

  const rol = token.rol as string | undefined;

  if (pathname.startsWith("/admin") && rol !== "ADMIN") {
    return conCsp(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  if (pathname.startsWith("/asistente") && rol !== "ASISTENTE" && rol !== "ADMIN") {
    return conCsp(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  return conCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
