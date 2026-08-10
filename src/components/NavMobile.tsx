"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChatWidget } from "@/lib/chatContext";

const ITEMS = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Mi cuenta",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/membresias",
    label: "Membresías",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    href: "/notificaciones",
    label: "Notificaciones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export default function NavMobile() {
  const { status } = useSession();
  const pathname = usePathname();
  const { abierto, setAbierto, noLeidos } = useChatWidget();

  if (status !== "authenticated") return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname === "/") return null;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-full shadow-2xl"
        style={{
          background: "rgba(16,36,99,0.96)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(16,36,99,0.35), 0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 ${
                active
                  ? "text-[#102463] scale-105"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              style={active ? { background: "#ffbd1f", boxShadow: "0 4px 12px rgba(255,189,31,0.45)" } : {}}
            >
              {icon}
            </Link>
          );
        })}
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Soporte"
          className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 ${
            abierto
              ? "text-[#102463] scale-105"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
          style={abierto ? { background: "#ffbd1f", boxShadow: "0 4px 12px rgba(255,189,31,0.45)" } : {}}
        >
          {CHAT_ICON}
          {!abierto && noLeidos > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
