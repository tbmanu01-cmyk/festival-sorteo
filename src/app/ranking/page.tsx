"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { esImagen } from "@/lib/avatares";

interface Ganador {
  id: string;
  nombre: string;
  apellido: string;
  ciudad: string;
  categoria: string;
  origen: string;
  numeroCaja: string | null;
  monto: number | null;
  fecha: string;
  avatar: string | null;
}

function mask(s: string): string {
  return s.split(" ")[0].slice(0, 3) + "***";
}

function nombreOculto(g: Ganador): string {
  return `${mask(g.nombre)} ${mask(g.apellido)}`;
}

function initials(g: Ganador): string {
  return (g.nombre[0] ?? "") + (g.apellido[0] ?? "");
}

const CATEGORIA_COLOR: Record<string, { bg: string; color: string }> = {
  "4 Cifras": { bg: "rgba(255,189,31,0.15)", color: "#f0a500" },
  "3 Cifras": { bg: "rgba(47,95,223,0.12)", color: "#2f5fdf" },
  "2 Cifras": { bg: "rgba(47,95,223,0.12)", color: "#2f5fdf" },
  "1 Cifra":  { bg: "rgba(107,118,147,0.12)", color: "#6b7693" },
  "Gran Selección": { bg: "rgba(124,58,237,0.12)", color: "#7c3aed" },
  "Selección Previa": { bg: "rgba(124,58,237,0.10)", color: "#7c3aed" },
  "Selección Anticipada": { bg: "rgba(5,150,105,0.12)", color: "#059669" },
};

function Avatar({ initials: ini, avatar, size = 44 }: { initials: string; avatar?: string | null; size?: number }) {
  if (avatar && esImagen(avatar)) {
    return (
      <img
        src={avatar}
        alt=""
        style={{
          width: size, height: size, borderRadius: 999,
          objectFit: "cover", flexShrink: 0,
          border: "1px solid #e3e7f2",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999,
        background: "#eff2f9", color: "#102463",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.36,
        flexShrink: 0,
      }}
    >
      {ini.toUpperCase()}
    </div>
  );
}

function etiquetaSinMonto(categoria: string): string {
  return categoria === "1 Cifra" ? "Membresía devuelta" : "Premio especial";
}

function FilaGanador({ g }: { g: Ganador }) {
  const cat = CATEGORIA_COLOR[g.categoria] ?? { bg: "rgba(16,36,99,0.08)", color: "#102463" };
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderRadius: 14,
        background: "white",
        border: "1px solid #e3e7f2",
        boxShadow: "0 2px 6px rgba(16,36,99,0.04)",
      }}
    >
      <Avatar initials={initials(g)} avatar={g.avatar} size={38} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#102463", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nombreOculto(g)}
          </p>
          <span style={{ fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.color, padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>
            {g.categoria}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#6b7693", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {g.origen}{g.numeroCaja ? ` · membresía #${g.numeroCaja}` : ""}
        </p>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {g.monto ? (
          <p style={{ fontWeight: 800, fontSize: 14, color: "#059669", margin: 0 }}>
            +${g.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
          </p>
        ) : (
          <p style={{ fontWeight: 700, fontSize: 12, color: "#98a2bf", margin: 0 }}>{etiquetaSinMonto(g.categoria)}</p>
        )}
        <p style={{ fontSize: 11, color: "#98a2bf", margin: 0 }}>
          {new Date(g.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
        </p>
      </div>
    </div>
  );
}

export default function PaginaRanking() {
  const [ganadores, setGanadores] = useState<Ganador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  async function cargar() {
    const res = await fetch("/api/ranking");
    if (res.ok) {
      const json = await res.json();
      setGanadores(json.ganadores ?? []);
      setUltimaActualizacion(new Date());
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, []);

  const destacado = ganadores[0];
  const resto = ganadores.slice(1);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f7f8fc" }}>
      <Header />

      <main style={{ flex: 1, padding: "48px 0 64px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

          {/* ── Encabezado ── */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Link href="/" style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: "#6b7693", textDecoration: "none", marginBottom: 16 }}>
              ← Inicio
            </Link>
            <br />
            <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#102463", background: "rgba(16,36,99,0.08)", borderRadius: 999, padding: "4px 14px", marginBottom: 14 }}>
              Comunidad Tienda 10K
            </span>
            <h1 style={{ fontSize: "clamp(28px,3.2vw,36px)", fontWeight: 800, color: "#102463", letterSpacing: "-0.02em", margin: "0 0 10px" }}>
              Ranking de ganadores
            </h1>
            <p style={{ color: "#6b7693", fontSize: 15, margin: 0 }}>
              Se actualiza con cada selección aleatoria de membresías
            </p>
            {ultimaActualizacion && (
              <p style={{ color: "#c5cbe0", fontSize: 12, marginTop: 6 }}>
                Actualizado {ultimaActualizacion.toLocaleTimeString("es-CO", { timeStyle: "short" })}
              </p>
            )}
          </div>

          {cargando ? (
            /* ── Skeleton loading ── */
            <div style={{ background: "white", borderRadius: 24, padding: "48px 24px", textAlign: "center", border: "1px solid #e3e7f2", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: "#eff2f9", margin: "0 auto 16px", animation: "pulse 1.5s ease-in-out infinite" }} />
              <p style={{ color: "#98a2bf", fontSize: 14, margin: 0 }}>Cargando ganadores…</p>
            </div>

          ) : ganadores.length === 0 ? (
            /* ── Empty state ── */
            <div style={{ background: "white", borderRadius: 24, padding: "56px 24px", textAlign: "center", border: "1px solid #e3e7f2", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🏆</div>
              <h3 style={{ fontWeight: 800, color: "#102463", fontSize: 20, margin: "0 0 8px" }}>¡Aún no hay ganadores!</h3>
              <p style={{ color: "#6b7693", fontSize: 14, margin: "0 0 24px" }}>
                Esta lista se llenará apenas se ejecute la primera selección aleatoria.
              </p>
              <Link
                href="/membresias"
                style={{ background: "#ffbd1f", color: "#102463", fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(255,165,0,0.40)", textDecoration: "none", display: "inline-block" }}
              >
                Ver membresías →
              </Link>
            </div>

          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Último ganador destacado ── */}
              {destacado && (
                <div style={{
                  background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)",
                  borderRadius: 24,
                  padding: "28px 24px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(16,36,99,0.18)",
                  textAlign: "center",
                }}>
                  <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,189,31,0.30),transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ position: "relative" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#ffbd1f", margin: "0 0 16px" }}>
                      🎉 Último ganador
                    </p>
                    <div style={{ marginBottom: 6 }}>
                      <Avatar initials={initials(destacado)} avatar={destacado.avatar} size={56} />
                    </div>
                    <p style={{ fontWeight: 800, color: "white", fontSize: 18, margin: "8px 0 4px" }}>
                      {nombreOculto(destacado)}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.70)", fontSize: 13, margin: "0 0 12px" }}>
                      {destacado.categoria} — {destacado.origen}{destacado.numeroCaja ? ` · #${destacado.numeroCaja}` : ""}
                    </p>
                    {destacado.monto ? (
                      <p style={{ fontWeight: 800, color: "#ffbd1f", fontSize: 26, margin: 0 }}>
                        +${destacado.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                    ) : (
                      <p style={{ fontWeight: 700, color: "#ffbd1f", fontSize: 16, margin: 0 }}>{etiquetaSinMonto(destacado.categoria)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Lista completa ── */}
              {resto.length > 0 && (
                <div style={{ background: "white", borderRadius: 24, border: "1px solid #e3e7f2", overflow: "hidden", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}>
                  <div style={{ padding: "14px 20px", background: "#f7f8fc", borderBottom: "1px solid #e3e7f2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7693", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                      Ganadores recientes
                    </p>
                    <p style={{ fontSize: 12, color: "#98a2bf", margin: 0 }}>Últimos {ganadores.length}</p>
                  </div>
                  <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {resto.map((g) => (
                      <FilaGanador key={g.id} g={g} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Leyenda ── */}
              <p style={{ textAlign: "center", fontSize: 12, color: "#98a2bf", margin: 0 }}>
                Se actualiza cada 30 seg
              </p>

              {/* ── CTA ── */}
              <div style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", borderRadius: 20, padding: "28px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 30%, rgba(255,189,31,0.22), transparent 55%)", pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <p style={{ fontWeight: 800, color: "white", fontSize: 18, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                    ¿Quieres ser el próximo ganador?
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: "0 0 20px" }}>
                    Adquiere tu membresía y participa en las selecciones aleatorias.
                  </p>
                  <Link
                    href="/membresias"
                    style={{ background: "#ffbd1f", color: "#102463", fontWeight: 800, fontSize: 15, padding: "13px 28px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(255,165,0,0.45)", textDecoration: "none", display: "inline-block" }}
                  >
                    Ver membresías →
                  </Link>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
