"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface RankEntry {
  posicion: number;
  nombre: string;
  apellido: string;
  ciudad: string;
  totalCajas: number;
  esStar: boolean;
}

function mask(s: string): string {
  return s.split(" ")[0].slice(0, 3) + "***";
}

function nombreOculto(entry: RankEntry): string {
  return `${mask(entry.nombre)} ${mask(entry.apellido)}`;
}

function initials(entry: RankEntry): string {
  return (entry.nombre[0] ?? "") + (entry.apellido[0] ?? "");
}

/* ── Colores por posición del podio ── */
const PODIO_CONFIG = [
  { pos: 1, height: 130, barBg: "linear-gradient(180deg,#ffbd1f,#f0a500)", avatarBg: "#ffbd1f", avatarColor: "#102463", crown: true },
  { pos: 2, height: 100, barBg: "linear-gradient(180deg,#85a8ff,#2f5fdf)", avatarBg: "#d9e6ff", avatarColor: "#102463", crown: false },
  { pos: 3, height: 80,  barBg: "linear-gradient(180deg,#b6cdff,#1e44b8)", avatarBg: "#d9e6ff", avatarColor: "#102463", crown: false },
];

function Avatar({ initials: ini, bg, color, size = 44 }: { initials: string; bg: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999,
        background: bg, color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.36,
        flexShrink: 0,
      }}
    >
      {ini.toUpperCase()}
    </div>
  );
}

function PodioSlot({ entry, config }: { entry: RankEntry; config: typeof PODIO_CONFIG[0] }) {
  return (
    <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Avatar + corona */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        {config.crown && (
          <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 20, lineHeight: 1 }}>
            👑
          </div>
        )}
        <Avatar
          initials={initials(entry)}
          bg={config.avatarBg}
          color={config.avatarColor}
          size={config.pos === 1 ? 52 : 44}
        />
      </div>

      {/* Nombre */}
      <p style={{ fontWeight: 700, fontSize: 12, color: "#102463", margin: "0 0 2px", lineHeight: 1.3, maxWidth: 80, wordBreak: "break-word" }}>
        {nombreOculto(entry)}
      </p>
      <p style={{ fontSize: 11, color: "#6b7693", margin: "0 0 8px" }}>
        {entry.totalCajas} {entry.totalCajas === 1 ? "membresía" : "membresías"}
      </p>

      {/* Barra de podio */}
      <div
        style={{
          width: "100%", height: config.height,
          borderRadius: "12px 12px 0 0",
          background: config.barBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: config.pos === 1 ? "#102463" : "white",
          fontWeight: 800, fontSize: 28,
        }}
      >
        {config.pos}
      </div>
    </div>
  );
}

function FilaRanking({ entry }: { entry: RankEntry }) {
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
      {/* Posición */}
      <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#98a2bf" }}>#{entry.posicion}</span>
      </div>

      {/* Avatar */}
      <Avatar initials={initials(entry)} bg="#eff2f9" color="#102463" size={38} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#102463", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nombreOculto(entry)}
          </p>
          {entry.esStar && (
            <span style={{ fontSize: 10, fontWeight: 700, background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>
              ⭐ VIP
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#6b7693", margin: 0 }}>{entry.ciudad}</p>
      </div>

      {/* Membresías */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: "#102463", margin: 0 }}>{entry.totalCajas}</p>
        <p style={{ fontSize: 11, color: "#98a2bf", margin: 0 }}>{entry.totalCajas === 1 ? "membresía" : "membresías"}</p>
      </div>
    </div>
  );
}

export default function PaginaRanking() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  async function cargar() {
    const res = await fetch("/api/ranking");
    if (res.ok) {
      const json = await res.json();
      setRanking(json.ranking ?? []);
      setUltimaActualizacion(new Date());
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, []);

  /* Reordenar podio: 2° - 1° - 3° para visualización */
  const top3 = ranking.slice(0, 3);
  const podioOrdenado = [top3[1], top3[0], top3[2]].filter(Boolean) as RankEntry[];
  const resto = ranking.slice(3);

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
              Comunidad Club 10K
            </span>
            <h1 style={{ fontSize: "clamp(28px,3.2vw,36px)", fontWeight: 800, color: "#102463", letterSpacing: "-0.02em", margin: "0 0 10px" }}>
              Ranking de miembros
            </h1>
            <p style={{ color: "#6b7693", fontSize: 15, margin: 0 }}>
              Top {ranking.length > 0 ? ranking.length : 20} miembros con más membresías
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
              <p style={{ color: "#98a2bf", fontSize: 14, margin: 0 }}>Cargando ranking…</p>
            </div>

          ) : ranking.length === 0 ? (
            /* ── Empty state ── */
            <div style={{ background: "white", borderRadius: 24, padding: "56px 24px", textAlign: "center", border: "1px solid #e3e7f2", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🏆</div>
              <h3 style={{ fontWeight: 800, color: "#102463", fontSize: 20, margin: "0 0 8px" }}>¡Sé el primero!</h3>
              <p style={{ color: "#6b7693", fontSize: 14, margin: "0 0 24px" }}>
                El ranking se llenará cuando los primeros miembros adquieran sus membresías.
              </p>
              <Link
                href="/tienda"
                style={{ background: "#ffbd1f", color: "#102463", fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 999, boxShadow: "0 8px 20px -4px rgba(255,165,0,0.40)", textDecoration: "none", display: "inline-block" }}
              >
                Ver membresías →
              </Link>
            </div>

          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── Podio ── */}
              {top3.length > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)",
                  borderRadius: 24,
                  padding: "28px 20px 0",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(16,36,99,0.18)",
                }}>
                  {/* Glow decorativo */}
                  <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,189,31,0.30),transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,189,31,0.14),transparent 70%)", pointerEvents: "none" }} />

                  <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#ffbd1f", margin: "0 0 24px", position: "relative" }}>
                    Podio de honor
                  </p>

                  {/* Barras del podio: orden 2 - 1 - 3 */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, position: "relative" }}>
                    {podioOrdenado.map((entry) => {
                      const cfg = PODIO_CONFIG.find((c) => c.pos === entry.posicion)!;
                      return <PodioSlot key={entry.posicion} entry={entry} config={cfg} />;
                    })}
                  </div>
                </div>
              )}

              {/* ── Lista completa ── */}
              <div style={{ background: "white", borderRadius: 24, border: "1px solid #e3e7f2", overflow: "hidden", boxShadow: "0 4px 16px rgba(16,36,99,0.06)" }}>
                <div style={{ padding: "14px 20px", background: "#f7f8fc", borderBottom: "1px solid #e3e7f2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7693", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    Clasificación completa
                  </p>
                  <p style={{ fontSize: 12, color: "#98a2bf", margin: 0 }}>Top {ranking.length}</p>
                </div>
                <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {ranking.map((entry) => (
                    <FilaRanking key={entry.posicion} entry={entry} />
                  ))}
                </div>
              </div>

              {/* ── Leyenda ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#98a2bf" }}>
                  <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>⭐ VIP</span>
                  10+ membresías
                </span>
                <span style={{ color: "#c5cbe0", fontSize: 12 }}>·</span>
                <span style={{ fontSize: 12, color: "#98a2bf" }}>Se actualiza cada 30 seg</span>
              </div>

              {/* ── CTA ── */}
              <div style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", borderRadius: 20, padding: "28px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 30%, rgba(255,189,31,0.22), transparent 55%)", pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <p style={{ fontWeight: 800, color: "white", fontSize: 18, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                    ¿Quieres aparecer aquí?
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: "0 0 20px" }}>
                    Adquiere más membresías y escala en el ranking.
                  </p>
                  <Link
                    href="/tienda"
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
