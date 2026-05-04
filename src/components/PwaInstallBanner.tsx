"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Nav = Navigator & { standalone?: boolean };

export default function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ya instalada (modo standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Nav).standalone === true;
    if (isStandalone) return;

    // Descartada antes
    if (localStorage.getItem("pwa-dismissed") === "1") return;

    // Detectar iOS (Safari no tiene beforeinstallprompt)
    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as Nav).standalone;

    if (isIosDevice) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    // Android / Chrome: capturar el evento
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setVisible(false));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  if (!visible) return null;

  return (
    <>
      {/* ── Sección inline en home (mobile) ─────────────── */}
      <section className="md:hidden" style={{ background: "var(--c10-ink-50)", padding: "0 16px 24px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #102463 0%, #173592 100%)",
            borderRadius: 20,
            padding: "20px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,189,31,0.25), transparent 70%)", pointerEvents: "none" }} />

          {/* Icono */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#ffbd1f",
              fontWeight: 900,
              fontSize: 15,
              backdropFilter: "blur(8px)",
            }}
          >
            10K
          </div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "white", margin: "0 0 3px" }}>
              📲 Instala Club 10K
            </p>
            {isIos ? (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.4 }}>
                Toca <strong style={{ color: "#ffbd1f" }}>Compartir</strong> → <strong style={{ color: "#ffbd1f" }}>Agregar a inicio</strong>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>
                Acceso directo sin App Store
              </p>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, position: "relative", zIndex: 1 }}>
            {!isIos && (
              <button
                onClick={handleInstall}
                style={{
                  background: "#ffbd1f",
                  color: "#102463",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(255,165,0,0.40)",
                }}
              >
                Instalar
              </button>
            )}
            <button
              onClick={handleDismiss}
              aria-label="Cerrar"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.20)",
                color: "rgba(255,255,255,0.70)",
                fontSize: 18,
                width: 30,
                height: 30,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      </section>

      {/* ── Banner sticky (desktop + tablet) ────────────── */}
      <div
        className="hidden md:block"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 340,
          background: "white",
          borderRadius: 20,
          padding: "16px 16px",
          boxShadow: "0 16px 48px rgba(16,36,99,0.18), 0 4px 16px rgba(16,36,99,0.08)",
          border: "1px solid #e3e7f2",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #102463, #173592)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#ffbd1f",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          10K
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#102463", margin: "0 0 2px" }}>
            Instala Club 10K
          </p>
          {isIos ? (
            <p style={{ fontSize: 12, color: "#6b7693", margin: 0 }}>
              Compartir → Agregar a inicio
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "#6b7693", margin: 0 }}>
              Acceso directo, sin App Store
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!isIos && (
            <button
              onClick={handleInstall}
              style={{
                background: "#ffbd1f",
                color: "#102463",
                fontWeight: 700,
                fontSize: 12,
                padding: "7px 14px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(255,165,0,0.35)",
              }}
            >
              Instalar
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Cerrar"
            style={{
              background: "none",
              border: "none",
              color: "#98a2bf",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
