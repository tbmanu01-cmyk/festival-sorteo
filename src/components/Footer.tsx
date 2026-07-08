"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Footer() {
  const { data: session } = useSession();

  return (
    <footer style={{ background: "#102463", color: "rgba(255,255,255,0.60)" }} className="mt-auto mb-20 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Marca */}
          <div>
            <div className="mb-3">
              <img src="/logo.png" alt="Club 10K" style={{ height: 40, width: "auto" }} />
            </div>
            <p className="text-sm leading-relaxed">
              Compra bonos y gana cashback.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
              {!session && (
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
          &copy; {new Date().getFullYear()} Club 10K. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
