import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ background: "#102463", color: "rgba(255,255,255,0.60)" }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Marca */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 36, height: 36, background: "#ffbd1f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#102463", fontSize: 12 }}>
                10K
              </div>
              <div>
                <p className="text-white font-bold">Club 10K</p>
                <p style={{ color: "#ffbd1f", fontSize: 12 }}>10,000 membresías</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Elige tu número del 0000 al 9999 y obtén increíbles beneficios.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-white transition-colors">¿Cómo funciona?</Link></li>
              <li><Link href="/#premios" className="hover:text-white transition-colors">Beneficios</Link></li>
              <li><Link href="/ranking" className="hover:text-white transition-colors">Ranking</Link></li>
              <li><Link href="/probabilidades" className="hover:text-white transition-colors">Probabilidades</Link></li>
              <li><Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terminos" className="hover:text-white transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-white transition-colors">Política de privacidad</Link></li>
            </ul>
            <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.40)" }}>
              Evento solidario sin ánimo de lucro.
              <br />Colombia &mdash; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", marginTop: 32, paddingTop: 24, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          &copy; {new Date().getFullYear()} Club 10K. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
