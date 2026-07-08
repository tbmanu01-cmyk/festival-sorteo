"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
    href: "/tienda",
    label: "Tienda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
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
    href: "/ranking",
    label: "Ranking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

export default function NavMobile() {
  const { status } = useSession();
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}
