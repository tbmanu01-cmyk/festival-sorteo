"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";

interface Boton {
  href: string;
  label: string;
  sub: string;
  icono: React.ReactNode;
  proximamente?: boolean;
}

const ICONO_TIENDA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const ICONO_MEMBRESIAS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const ICONO_CUENTA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ICONO_PERFIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ICONO_RANKING = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ICONO_ADMIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ICONO_LOGIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const ICONO_REGISTRO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21c0-4 3.1-7 7-7s7 3 7 7" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

export default function Inicio() {
  const { data: session, status } = useSession();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;
  const [tiendaActiva, setTiendaActiva] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { tiendaActiva?: boolean }) => setTiendaActiva(d.tiendaActiva ?? true))
      .catch(() => undefined);
  }, []);

  const tienda: Boton = { href: "/tienda", label: "Tienda", sub: "Bonos con cashback", icono: ICONO_TIENDA, proximamente: !tiendaActiva };

  const botones: Boton[] = [
    { href: "/membresias", label: "Membresías", sub: "Cajas del sorteo", icono: ICONO_MEMBRESIAS },
  ];

  if (status === "authenticated") {
    botones.push(
      { href: "/dashboard", label: "Mi cuenta", sub: "Billetera y red", icono: ICONO_CUENTA },
      { href: "/dashboard/perfil", label: "Perfil", sub: "Tus datos", icono: ICONO_PERFIL },
      { href: "/ranking", label: "Ranking", sub: "Ganadores", icono: ICONO_RANKING },
      tienda,
    );
    if (rol === "ADMIN") {
      botones.push({ href: "/admin", label: "Administrar", sub: "Panel admin", icono: ICONO_ADMIN });
    } else if (rol === "ASISTENTE") {
      botones.push({ href: "/asistente/retiros", label: "Panel Asistente", sub: "Retiros", icono: ICONO_ADMIN });
    }
  } else {
    botones.push(
      { href: "/ranking", label: "Ranking", sub: "Ganadores", icono: ICONO_RANKING },
      tienda,
      { href: "/login", label: "Iniciar sesión", sub: "Ya tengo cuenta", icono: ICONO_LOGIN },
      { href: "/registro", label: "Registrarme", sub: "Crear cuenta gratis", icono: ICONO_REGISTRO },
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "var(--c10-ink-50)" }}>
      <Header />

      <div style={{ textAlign: "center", padding: "14px 16px 10px" }}>
        <h1 style={{ fontSize: "clamp(19px,2.4vw,26px)", fontWeight: 800, color: "#102463", letterSpacing: "-0.02em", margin: 0 }}>
          ¿A dónde quieres ir?
        </h1>
      </div>

      <main
        className="flex-1 grid grid-cols-1 sm:grid-cols-3"
        style={{ gridAutoRows: "1fr", gap: 10, padding: "0 10px 10px", minHeight: 0 }}
      >
        {botones.map((b) => {
          const contenido = (
            <>
              <div className="mr-4 mb-0 sm:mr-0 sm:mb-2" style={{ color: b.proximamente ? "rgba(255,255,255,0.45)" : "#ffbd1f", flexShrink: 0 }}>{b.icono}</div>
              <div className="flex flex-col sm:items-center">
                <span style={{ color: "white", fontWeight: 800, fontSize: "clamp(19px, 4.2vw, 22px)", lineHeight: 1.2 }}>{b.label}</span>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "clamp(13px, 3vw, 15px)", marginTop: 4 }}>{b.sub}</span>
              </div>
            </>
          );

          if (b.proximamente) {
            return (
              <div
                key={b.href}
                aria-disabled="true"
                className="relative flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #6b7693 0%, #8894ac 100%)",
                  borderRadius: 24,
                  boxShadow: "0 8px 20px -6px rgba(16,36,99,0.20)",
                  padding: "0 22px",
                  minHeight: 0,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
                  style={{ background: "#ffbd1f", color: "#102463" }}
                >
                  Próximamente
                </span>
                {contenido}
              </div>
            );
          }

          return (
            <Link
              key={b.href}
              href={b.href}
              className="flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center hover:scale-[1.02] active:scale-[0.97] transition-transform"
              style={{
                background: "linear-gradient(135deg, #102463 0%, #173592 100%)",
                borderRadius: 24,
                textDecoration: "none",
                boxShadow: "0 8px 20px -6px rgba(16,36,99,0.35)",
                padding: "0 22px",
                minHeight: 0,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {contenido}
            </Link>
          );
        })}
      </main>
    </div>
  );
}
