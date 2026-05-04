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
          // CSP: bloquea fuentes externas no autorizadas, evita clickjacking y XSS básico
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
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
