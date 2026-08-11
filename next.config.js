/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  async headers() {
    return [
      // ── Cabeceras de seguridad globales ────────────────────────────────
      {
        source: "/(.*)",
        headers: [
          // Evita que la app se incruste en iframes de otros sitios (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Evita que el navegador adivine el tipo MIME de respuestas
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controla cuánta info de referencia se envía al navegar
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Fuerza HTTPS por 2 años en todos los subdominios
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Deshabilita acceso a cámara, micrófono y geolocalización
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // La CSP se genera dinámicamente en src/proxy.ts (necesita un nonce
          // distinto por request para poder quitar 'unsafe-inline'/'unsafe-eval'
          // de script-src) — no se declara acá para evitar dos cabeceras CSP
          // compitiendo en la misma respuesta.
        ],
      },
      // ── Logos e imágenes clave (no cachear en CDN para que los cambios sean inmediatos)
      {
        source: "/:file(logo\\.png|logo-icon\\.png|favicon\\.ico|og-image\\.png|apple-touch-icon\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      // ── Archivos PWA ────────────────────────────────────────────────────
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
