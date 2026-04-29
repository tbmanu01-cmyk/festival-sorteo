"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="bg-[#1B4F8A] shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-[#F5A623] rounded-full flex items-center justify-center font-bold text-[#1B4F8A] text-sm group-hover:scale-110 transition-transform">
              CK
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-lg leading-tight">10K</p>
              <p className="text-[#F5A623] text-xs font-medium">Club</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#como-funciona" className="text-blue-200 hover:text-white text-sm font-medium transition-colors">
              ¿Cómo funciona?
            </Link>
            <Link href="/#premios" className="text-blue-200 hover:text-white text-sm font-medium transition-colors">
              Beneficios
            </Link>
            <Link href="/ranking" className="text-blue-200 hover:text-white text-sm font-medium transition-colors">
              Ranking
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-blue-200 hover:text-white text-sm font-medium transition-colors"
                >
                  Mi cuenta
                </Link>
                {(session.user as { rol?: string })?.rol === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="text-[#F5A623] hover:text-yellow-300 text-sm font-medium transition-colors"
                  >
                    Administrar
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-blue-200 hover:text-white text-sm font-medium transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold text-sm px-5 py-2 rounded-lg transition-colors shadow-md"
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden text-white p-2"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuAbierto ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuAbierto && (
          <div className="md:hidden border-t border-blue-700 py-3 space-y-2">
            <Link href="/#como-funciona" className="block text-blue-200 hover:text-white px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
              ¿Cómo funciona?
            </Link>
            <Link href="/#premios" className="block text-blue-200 hover:text-white px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
              Beneficios
            </Link>
            <Link href="/ranking" className="block text-blue-200 hover:text-white px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
              Ranking
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="block text-blue-200 hover:text-white px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
                  Mi cuenta
                </Link>
                {(session.user as { rol?: string })?.rol === "ADMIN" && (
                  <Link href="/admin" className="block text-[#F5A623] hover:text-yellow-300 px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
                    Administrar
                  </Link>
                )}
                <button
                  onClick={() => { setMenuAbierto(false); signOut({ callbackUrl: "/" }); }}
                  className="block w-full text-left text-red-300 hover:text-red-200 px-2 py-2 text-sm"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-blue-200 hover:text-white px-2 py-2 text-sm" onClick={() => setMenuAbierto(false)}>
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="block bg-[#F5A623] text-[#1B4F8A] font-bold text-sm px-4 py-2 rounded-lg mx-2" onClick={() => setMenuAbierto(false)}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
