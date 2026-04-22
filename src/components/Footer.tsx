import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1B4F8A] text-blue-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-[#F5A623] rounded-full flex items-center justify-center font-bold text-[#1B4F8A] text-sm">
                FS
              </div>
              <div>
                <p className="text-white font-bold">Festival Sorteo</p>
                <p className="text-[#F5A623] text-xs">10,000 Cajas Sorpresa</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              El sorteo de cajas sorpresa del festival escolar. Participa y gana increíbles premios.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-white transition-colors">¿Cómo funciona?</Link></li>
              <li><Link href="/#premios" className="hover:text-white transition-colors">Premios</Link></li>
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
            <p className="text-xs mt-4 text-blue-300">
              Evento solidario sin ánimo de lucro.
              <br />Colombia &mdash; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        <div className="border-t border-blue-700 mt-8 pt-6 text-center text-xs text-blue-300">
          &copy; {new Date().getFullYear()} Festival Sorteo 10000. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
