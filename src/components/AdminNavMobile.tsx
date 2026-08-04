"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const ITEMS = [
  {
    href: "/admin",
    label: "Inicio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/admin/motor-sorteos",
    label: "Selecciones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/admin/retiros",
    label: "Retiros",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 6v0M18 18v0" />
      </svg>
    ),
  },
];

export default function AdminNavMobile() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== "authenticated") return null;
  if ((session.user as { rol?: string }).rol !== "ADMIN") return null;
  if (!pathname.startsWith("/admin")) return null;

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
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-full transition-all duration-200 ${
                active
                  ? "text-[#102463] scale-105"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              style={active ? { background: "#ffbd1f", boxShadow: "0 4px 12px rgba(255,189,31,0.45)" } : {}}
            >
              {icon}
              <span className="text-[9px] font-bold leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
