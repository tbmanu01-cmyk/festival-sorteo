import type { CSSProperties } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownAnticipada from "@/components/CountdownAnticipada";
import CountdownHero from "@/components/CountdownHero";
import PwaInstallBanner from "@/components/PwaInstallBanner";

const TOTAL_CAJAS = 10000;

interface Anticipada {
  id: string;
  nombre: string;
  descripcion: string | null;
  premioDescripcion: string;
  fecha: Date;
  cantidadGanadores: number;
}

interface CajaPreview {
  numero: string;
}

async function obtenerDatos() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const [config, vendidas] = await Promise.all([
      prisma.config.findUnique({ where: { id: "singleton" } }),
      prisma.caja.count({ where: { estado: "VENDIDA" } }),
    ]);

    const cajasPreview = await prisma.$queryRaw<CajaPreview[]>`
      SELECT numero FROM cajas WHERE estado = 'DISPONIBLE' ORDER BY RANDOM() LIMIT 12
    `;

    let anticipadas: Anticipada[] = [];
    try {
      anticipadas = await prisma.sorteoAnticipado.findMany({
        where: { estado: "PENDIENTE", fecha: { gte: new Date() } },
        select: { id: true, nombre: true, descripcion: true, premioDescripcion: true, fecha: true, cantidadGanadores: true },
        orderBy: { fecha: "asc" },
        take: 5,
      });
    } catch { /* tabla aún no creada */ }

    return {
      precioCaja: config?.precioCaja ?? 10_000,
      fechaSorteo: config?.fechaSorteo ? config.fechaSorteo.toISOString() : null,
      pct4: config?.pct4Cifras ?? 0.35,
      pct3: config?.pct3Cifras ?? 0.15,
      pct2: config?.pct2Cifras ?? 0.10,
      vendidas,
      cajasPreview,
      anticipadas,
    };
  } catch {
    return {
      precioCaja: 10_000,
      fechaSorteo: null,
      pct4: 0.35,
      pct3: 0.15,
      pct2: 0.10,
      vendidas: 0,
      cajasPreview: [],
      anticipadas: [],
    };
  }
}

const pasos = [
  {
    numero: "01",
    titulo: "Regístrate gratis",
    descripcion: "Crea tu cuenta con tus datos personales y bancarios. Solo toma 2 minutos.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    numero: "02",
    titulo: "Elige tu número",
    descripcion: "Selecciona uno o más números del 0000 al 9999. Participa con una o varias membresías.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    numero: "03",
    titulo: "Obtén beneficios",
    descripcion: "El número ganador se saca de la lotería de Bogotá. ¡Coincide 4, 3, 2 o 1 cifra y gana!",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
];

const benefitTops = [
  { bg: "linear-gradient(135deg, #ffbd1f, #f0a500)" },
  { bg: "linear-gradient(135deg, #c5cbe0, #98a2bf)" },
  { bg: "linear-gradient(135deg, #d28a4a, #b86c2c)" },
  { bg: "linear-gradient(135deg, #2f5fdf, #102463)" },
];

/* ── Helpers de estilo reutilizables ───────────────────── */
const eyebrow: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#102463",
  background: "rgba(16,36,99,0.08)",
  borderRadius: 999,
  padding: "4px 14px",
  marginBottom: 16,
};

const sectionTitle: CSSProperties = {
  fontSize: "clamp(28px,3.2vw,36px)",
  fontWeight: 800,
  color: "#102463",
  letterSpacing: "-0.02em",
  margin: "0 0 12px",
};

const sectionSub: CSSProperties = {
  color: "#6b7693",
  fontSize: 17,
  maxWidth: 520,
  margin: "0 auto",
};

const pill: CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  padding: "8px 18px",
  backdropFilter: "blur(8px)",
};

export default async function Inicio() {
  const { precioCaja, fechaSorteo, pct4, pct3, pct2, vendidas, cajasPreview, anticipadas } = await obtenerDatos();

  const disponibles = TOTAL_CAJAS - vendidas;
  const pctVendido = ((vendidas / TOTAL_CAJAS) * 100).toFixed(1);

  const premios = [
    { categoria: "4 cifras exactas", premio: `${Math.round(pct4 * 100)}% del recaudo`, icono: "🏆", descripcion: "El número completo coincide con el resultado" },
    { categoria: "3 últimas cifras", premio: `${Math.round(pct3 * 100)}% del recaudo`, icono: "🥈", descripcion: "Las 3 últimas cifras coinciden" },
    { categoria: "2 últimas cifras", premio: `${Math.round(pct2 * 100)}% del recaudo`, icono: "🥉", descripcion: "Las 2 últimas cifras coinciden" },
    { categoria: "1 última cifra",   premio: "Devolución del valor",                  icono: "🎁", descripcion: "La última cifra coincide con el resultado" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">

        {/* ═══════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════ */}
        <section
          className="c10-hero-wrap text-white"
          style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", padding: "72px 0 64px" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ position: "relative", zIndex: 1 }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left: copy */}
              <div>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffbd1f", background: "rgba(255,189,31,0.12)", border: "1px solid rgba(255,189,31,0.30)", borderRadius: 999, padding: "4px 14px", marginBottom: 20 }}>
                  Club de membresías 10K
                </span>
                <h1 style={{ fontSize: "clamp(38px,4.6vw,58px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
                  Tu número,{" "}
                  <span style={{ color: "#ffbd1f" }}>tu oportunidad</span>
                </h1>
                <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", margin: "0 0 28px", maxWidth: 480, lineHeight: 1.65 }}>
                  10,000 membresías numeradas. Coincide con la Lotería de Bogotá en 4, 3, 2 o 1 cifra y gana parte del recaudo.
                </p>

                {/* Stat pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
                  <div style={pill}>
                    <span style={{ fontWeight: 800, color: "#ffbd1f" }}>{disponibles.toLocaleString("es-CO")}</span>{" "}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>disponibles</span>
                  </div>
                  <div style={pill}>
                    <span style={{ fontWeight: 800, color: "#ffbd1f" }}>{pctVendido}%</span>{" "}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>vendido</span>
                  </div>
                  <div style={pill}>
                    <span style={{ fontWeight: 800, color: "white" }}>${precioCaja.toLocaleString("es-CO")}</span>{" "}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>por membresía</span>
                  </div>
                </div>

                {/* Countdown */}
                {fechaSorteo && (
                  <div style={{ marginBottom: 36 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.60)", marginBottom: 10 }}>
                      Próximo resultado principal
                    </p>
                    <CountdownHero fecha={fechaSorteo} />
                  </div>
                )}

                {/* CTAs */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <Link
                    href="/tienda"
                    style={{ background: "#ffbd1f", color: "#102463", fontWeight: 800, fontSize: 16, padding: "14px 32px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(255,165,0,0.45)", textDecoration: "none", display: "inline-block" }}
                  >
                    Ver membresías →
                  </Link>
                  <a
                    href="#como-funciona"
                    style={{ background: "rgba(255,255,255,0.10)", color: "white", fontWeight: 600, fontSize: 16, padding: "14px 32px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", textDecoration: "none", display: "inline-block" }}
                  >
                    ¿Cómo funciona?
                  </a>
                </div>
              </div>

              {/* Right: ticket preview (desktop only) */}
              {cajasPreview.length >= 4 && (
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {cajasPreview.slice(0, 4).map((caja) => (
                    <Link
                      key={caja.numero}
                      href="/tienda"
                      className="block hover:scale-105 transition-transform"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 20, padding: "28px 16px", textAlign: "center", backdropFilter: "blur(8px)", textDecoration: "none" }}
                    >
                      <div style={{ fontSize: 38, marginBottom: 10 }}>🎫</div>
                      <p style={{ fontWeight: 900, color: "white", fontSize: 24, letterSpacing: "0.14em", margin: "0 0 4px" }}>
                        {caja.numero}
                      </p>
                      <p style={{ color: "#86efac", fontSize: 12, fontWeight: 600, margin: 0 }}>Disponible</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            PWA INSTALL BANNER (mobile inline / desktop sticky)
        ═══════════════════════════════════════════════════ */}
        <PwaInstallBanner />

        {/* ═══════════════════════════════════════════════════
            MEMBRESÍAS DISPONIBLES
        ═══════════════════════════════════════════════════ */}
        <section style={{ background: "var(--c10-ink-50)", padding: "56px 0", borderBottom: "1px solid var(--c10-ink-200)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#102463", letterSpacing: "-0.02em", margin: 0 }}>
                  Membresías disponibles
                </h2>
                <p style={{ color: "#6b7693", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  {disponibles.toLocaleString("es-CO")} membresías listas para ser tuyas
                </p>
              </div>
              <Link href="/tienda" style={{ color: "#102463", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                Ver todas →
              </Link>
            </div>

            {cajasPreview.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-7">
                {cajasPreview.map((caja) => (
                  <Link
                    key={caja.numero}
                    href="/tienda"
                    className="block hover:scale-105 transition-transform"
                    style={{ background: "rgba(209,250,229,0.55)", borderRadius: 18, border: "1px solid rgba(16,185,129,0.20)", padding: "20px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(16,36,99,0.04)", textDecoration: "none" }}
                  >
                    <div style={{ fontSize: 34, marginBottom: 8 }}>🎫</div>
                    <p style={{ fontWeight: 900, color: "#102463", fontSize: 20, letterSpacing: "0.12em", margin: 0 }}>{caja.numero}</p>
                    <p style={{ color: "#059669", fontSize: 11, fontWeight: 600, marginTop: 4, marginBottom: 0 }}>Disponible</p>
                    <p style={{ color: "#6b7693", fontSize: 11, marginTop: 2, marginBottom: 0 }}>${precioCaja.toLocaleString("es-CO")}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7693", padding: "32px 0", fontSize: 14 }}>
                Cargando membresías disponibles…
              </p>
            )}

            <div style={{ textAlign: "center" }}>
              <Link
                href="/tienda"
                style={{ background: "#102463", color: "white", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(16,36,99,0.40)", textDecoration: "none", display: "inline-block" }}
              >
                🛒 Ver todas las membresías
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CÓMO FUNCIONA
        ═══════════════════════════════════════════════════ */}
        <section id="como-funciona" style={{ background: "white", padding: "80px 0" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={eyebrow}>Fácil y transparente</span>
              <h2 style={sectionTitle}>¿Cómo funciona?</h2>
              <p style={sectionSub}>
                Participar es muy fácil. En 3 simples pasos puedes estar en la lista de miembros beneficiados.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {pasos.map((paso) => (
                <div
                  key={paso.numero}
                  style={{ position: "relative", background: "white", borderRadius: 18, padding: "36px 24px 28px", border: "1px solid #e3e7f2", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}
                >
                  <div style={{ position: "absolute", top: -20, left: 24, width: 40, height: 40, borderRadius: 999, background: "#102463", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, boxShadow: "0 6px 16px rgba(16,36,99,0.30)" }}>
                    {paso.numero}
                  </div>
                  <div style={{ color: "#ffbd1f", marginBottom: 14, marginTop: 4 }}>
                    {paso.icono}
                  </div>
                  <h3 style={{ fontWeight: 700, color: "#102463", fontSize: 18, margin: "0 0 8px" }}>{paso.titulo}</h3>
                  <p style={{ color: "#6b7693", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{paso.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            ANTICIPADAS
        ═══════════════════════════════════════════════════ */}
        {anticipadas.length > 0 && (
          <section style={{ background: "var(--c10-ink-50)", padding: "80px 0" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f0a500", background: "rgba(255,189,31,0.12)", border: "1px solid rgba(255,189,31,0.30)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
                  ¡Antes del evento principal!
                </span>
                <h2 style={sectionTitle}>Próximas selecciones</h2>
                <p style={sectionSub}>
                  Selecciones especiales con beneficios exclusivos. ¡Tu membresía puede ser beneficiada antes del evento principal!
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {anticipadas.map((a) => (
                  <div
                    key={a.id}
                    style={{ background: "white", borderRadius: 18, border: "1px solid #e3e7f2", padding: 24, boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span style={{ fontSize: 32 }}>🎯</span>
                      <span style={{ background: "rgba(16,36,99,0.08)", color: "#102463", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                        {a.cantidadGanadores} miembro{a.cantidadGanadores !== 1 ? "s beneficiados" : " beneficiado"}
                      </span>
                    </div>
                    <h3 style={{ fontWeight: 800, color: "#102463", fontSize: 18, margin: "0 0 6px" }}>{a.nombre}</h3>
                    {a.descripcion && (
                      <p style={{ color: "#6b7693", fontSize: 14, margin: "0 0 14px" }}>{a.descripcion}</p>
                    )}
                    <div style={{ background: "rgba(255,189,31,0.10)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                      <p style={{ fontSize: 11, color: "#6b7693", margin: "0 0 2px" }}>Beneficio</p>
                      <p style={{ fontWeight: 800, color: "#f0a500", fontSize: 18, margin: 0 }}>{a.premioDescripcion}</p>
                    </div>
                    <div style={{ borderTop: "1px solid #e3e7f2", paddingTop: 14 }}>
                      <p style={{ fontSize: 12, color: "#6b7693", margin: "0 0 6px" }}>
                        {new Date(a.fecha).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 12, color: "#6b7693" }}>Faltan:</span>
                        <CountdownAnticipada fecha={a.fecha.toISOString()} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <Link
                  href="/registro"
                  style={{ background: "#102463", color: "white", fontWeight: 700, fontSize: 15, padding: "14px 32px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(16,36,99,0.40)", textDecoration: "none", display: "inline-block" }}
                >
                  Participar en las selecciones →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            TABLA DE BENEFICIOS
        ═══════════════════════════════════════════════════ */}
        <section id="premios" style={{ background: "white", padding: "80px 0" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={eyebrow}>Tabla de beneficios</span>
              <h2 style={sectionTitle}>Mientras más coincidas, más ganas</h2>
              <p style={sectionSub}>
                El número ganador lo determina la Lotería de Bogotá. Participa desde ${precioCaja.toLocaleString("es-CO")}.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {premios.map((p, i) => (
                <div
                  key={p.categoria}
                  style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 6px 16px rgba(16,36,99,0.08)", border: "1px solid #e3e7f2" }}
                >
                  <div style={{ background: benefitTops[i].bg, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 36 }}>{p.icono}</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    <p style={{ fontWeight: 700, color: "#102463", fontSize: 15, margin: "0 0 4px" }}>{p.categoria}</p>
                    <p style={{ fontWeight: 800, color: "#f0a500", fontSize: 18, margin: "0 0 6px" }}>{p.premio}</p>
                    <p style={{ color: "#6b7693", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{p.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CTA FINAL
        ═══════════════════════════════════════════════════ */}
        <section style={{ background: "var(--c10-ink-50)", padding: "64px 0" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", borderRadius: 32, padding: "56px 40px", textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
              {/* Radial glows */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 25% 20%, rgba(255,189,31,0.25), transparent 55%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 75% 80%, rgba(255,189,31,0.12), transparent 50%)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
                  ¡No te quedes sin tu número!
                </h2>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, margin: "0 0 32px", maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
                  Solo quedan{" "}
                  <strong style={{ color: "#ffbd1f" }}>{disponibles.toLocaleString("es-CO")}</strong>{" "}
                  membresías disponibles. Regístrate ahora y asegura la tuya.
                </p>
                <Link
                  href="/registro"
                  style={{ background: "#ffbd1f", color: "#102463", fontWeight: 800, fontSize: 17, padding: "16px 40px", borderRadius: 999, boxShadow: "0 8px 24px -4px rgba(255,165,0,0.50)", textDecoration: "none", display: "inline-block" }}
                >
                  Adquiere tu membresía — ${precioCaja.toLocaleString("es-CO")} COP
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
