"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";

interface Boton {
  href: string;
  label: string;
  sub: string;
  icono: React.ReactNode;
}

const ICONO_MEMBRESIAS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const ICONO_CUENTA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ICONO_PERFIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ICONO_NOTIFICACIONES = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const ICONO_ADMIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ICONO_LOGIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const ICONO_REGISTRO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 sm:w-16 sm:h-16">
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21c0-4 3.1-7 7-7s7 3 7 7" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

export default function Inicio() {
  const { data: session, status } = useSession();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  const botones: Boton[] = [
    { href: "/membresias", label: "Membresías", sub: "Selección aleatoria", icono: ICONO_MEMBRESIAS },
  ];

  if (status === "authenticated") {
    botones.push(
      { href: "/dashboard", label: "Mi cuenta", sub: "Billetera y red", icono: ICONO_CUENTA },
      { href: "/dashboard/perfil", label: "Perfil", sub: "Tus datos", icono: ICONO_PERFIL },
      { href: "/notificaciones", label: "Notificaciones", sub: "Avisos y alertas", icono: ICONO_NOTIFICACIONES },
    );
    if (rol === "ADMIN") {
      botones.push({ href: "/admin", label: "Administrar", sub: "Panel admin", icono: ICONO_ADMIN });
    } else if (rol === "ASISTENTE") {
      botones.push({ href: "/asistente/retiros", label: "Panel Asistente", sub: "Retiros", icono: ICONO_ADMIN });
    }
  } else {
    botones.push(
      { href: "/notificaciones", label: "Notificaciones", sub: "Avisos y alertas", icono: ICONO_NOTIFICACIONES },
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
              <div className="mr-4 mb-0 sm:mr-0 sm:mb-3" style={{ color: "#ffbd1f", flexShrink: 0 }}>{b.icono}</div>
              <div className="flex flex-col sm:items-center">
                <span className="text-2xl sm:text-5xl" style={{ color: "white", fontWeight: 800, lineHeight: 1.15 }}>{b.label}</span>
                <span className="text-base sm:text-xl" style={{ color: "rgba(255,255,255,0.70)", marginTop: 6 }}>{b.sub}</span>
              </div>
            </>
          );

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
