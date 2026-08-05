"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Footer() {
  const { data: session } = useSession();
  const [tiendaActiva, setTiendaActiva] = useState(true);
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { tiendaActiva?: boolean }) => setTiendaActiva(c.tiendaActiva ?? true))
      .catch(() => undefined);
  }, []);

  return (
    <footer style={{ background: "#102463", color: "rgba(255,255,255,0.60)" }} className="mt-auto mb-20 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Marca */}
          <div>
            <div className="mb-3">
              <img src="/logo.png" alt="Tienda 10K" style={{ height: 40, width: "auto" }} />
            </div>
            <p className="text-sm leading-relaxed">
              Tu membresía, tu oportunidad.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/membresias" className="hover:text-white transition-colors">Membresías</Link></li>
              <li><Link href="/ranking" className="hover:text-white transition-colors">Ranking</Link></li>
              {tiendaActiva && (
                <li><Link href="/tienda" className="hover:text-white transition-colors">Tienda</Link></li>
              )}
              {session ? (
                <>
                  <li><Link href="/dashboard" className="hover:text-white transition-colors">Mi cuenta</Link></li>
                  <li><Link href="/dashboard/perfil" className="hover:text-white transition-colors">Perfil</Link></li>
                  {rol === "ADMIN" && (
                    <li><Link href="/admin" className="hover:text-white transition-colors">Administrar</Link></li>
                  )}
                  {rol === "ASISTENTE" && (
                    <li><Link href="/asistente/retiros" className="hover:text-white transition-colors">Panel Asistente</Link></li>
                  )}
                </>
              ) : (
                <>
                  <li><Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terminos" className="hover:text-white transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-white transition-colors">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", marginTop: 32, paddingTop: 24, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          &copy; {new Date().getFullYear()} Tienda 10K. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
