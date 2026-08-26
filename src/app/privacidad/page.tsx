import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ACTUALIZADO = "25 de agosto de 2026";

function Seccion({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-[#102463] mb-3 flex items-baseline gap-2">
        <span className="text-[#F5A623]">{n}.</span> {titulo}
      </h2>
      <div className="space-y-3 text-gray-700 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function Pendiente({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-amber-50 border border-amber-300 text-amber-800 rounded-md px-2 py-0.5 text-sm font-medium">
      ⚠️ PENDIENTE: {children}
    </span>
  );
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <section
          className="py-16 px-4 text-center"
          style={{ background: "linear-gradient(135deg,#07193a 0%,#1B4F8A 55%,#07193a 100%)" }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3">Política de Privacidad</h1>
          <p className="text-blue-200">Tienda 10K — última actualización: {ACTUALIZADO}</p>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

            <div className="mb-8 bg-red-50 border border-red-300 rounded-xl p-4 text-red-800 text-sm leading-relaxed">
              <strong>Este documento es un borrador de trabajo, no un texto legal definitivo.</strong> Describe con
              precisión qué datos recolecta hoy la plataforma y qué hace con ellos. Las secciones marcadas con{" "}
              <Pendiente>ejemplo</Pendiente> dependen de datos de la entidad legal que aún no están definidos (ver{" "}
              <a href="/terminos" className="underline">Términos y Condiciones</a>, sección 1).
            </div>

            <Seccion n="1" titulo="Responsable del tratamiento">
              <p>
                Esta Política aplica a los datos personales que recolecta Tienda 10K a través de{" "}
                <span className="font-mono text-sm">tienda10k.com</span>. Entidad responsable:{" "}
                <Pendiente>razón social completa, NIT y domicilio — mismo dato pendiente que en Términos y Condiciones, sección 1</Pendiente>.
              </p>
            </Seccion>

            <Seccion n="2" titulo="Qué datos recolectamos">
              <p>Al registrarte te pedimos:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nombre y apellido</li>
                <li>Número de documento de identidad</li>
                <li>Correo electrónico</li>
                <li>Número de celular</li>
                <li>Ciudad y departamento</li>
                <li>Fecha de nacimiento (para verificar que sos mayor de 18 años)</li>
                <li>Contraseña (nunca se guarda en texto plano; se almacena cifrada con bcrypt)</li>
              </ul>
              <p>Si completás tu perfil o solicitás un retiro, además podemos guardar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Número de WhatsApp (opcional)</li>
                <li>Foto de perfil (opcional)</li>
                <li>Banco, tipo de cuenta y número de cuenta bancaria (necesarios para procesar tus retiros)</li>
              </ul>
              <p>
                Cuando pagás por transferencia manual, también guardamos el comprobante de pago que subís. Cuando
                pagás con tarjeta/PSE, el número de tu tarjeta y los datos sensibles del pago los procesa
                directamente nuestro proveedor de pagos (Bold) — nunca pasan por nuestros servidores ni los
                almacenamos nosotros.
              </p>
              <p>
                Por seguridad, registramos también información técnica de tu actividad en la plataforma: dirección IP,
                fecha y tipo de acción en eventos sensibles (inicio de sesión, cambios de contraseña, retiros,
                acciones de administración) — esto se guarda en un registro de auditoría interno, no se usa con fines
                de mercadeo.
              </p>
            </Seccion>

            <Seccion n="3" titulo="Para qué usamos tus datos">
              <ul className="list-disc pl-5 space-y-1">
                <li>Crear y administrar tu cuenta, y verificar que cumplís el requisito de mayoría de edad.</li>
                <li>Procesar tus compras de membresías, retiros de saldo y uso de gift cards.</li>
                <li>Enviarte comprobantes, notificaciones de premio, estado de retiros y correos de recuperación de contraseña.</li>
                <li>Prevenir fraude, cuentas múltiples de una misma persona, y otros usos indebidos de la plataforma.</li>
                <li>Cumplir obligaciones legales y tributarias, incluyendo las relacionadas con el pago de premios.</li>
                <li>Publicar el nombre parcialmente oculto de los ganadores en la sección pública de Ranking.</li>
              </ul>
              <p>
                No usamos tus datos para enviarte publicidad ni comunicaciones de mercadeo — hoy la plataforma
                únicamente envía los correos transaccionales listados arriba.
              </p>
            </Seccion>

            <Seccion n="4" titulo="Con quién compartimos tus datos">
              <p>
                No vendemos ni cedemos tus datos personales a terceros para que los usen con sus propios fines. Los
                compartimos únicamente con los proveedores que necesitamos para operar la plataforma, actuando ellos
                como encargados del tratamiento por nuestra instrucción:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Resend</strong> — envío de los correos transaccionales de la plataforma.</li>
                <li><strong>Bold</strong> — procesamiento de pagos con tarjeta y PSE.</li>
                <li><strong>Vercel</strong> — hosting de la aplicación, y almacenamiento de imágenes (comprobantes de pago, código QR).</li>
                <li><strong>Neon</strong> — hosting de la base de datos donde se almacenan tus datos.</li>
              </ul>
              <p>
                Podemos además compartir datos con autoridades colombianas cuando la ley nos obligue a hacerlo (por
                ejemplo, en materia tributaria o ante un requerimiento judicial).
              </p>
            </Seccion>

            <Seccion n="5" titulo="Seguridad">
              <p>
                Tu contraseña se almacena cifrada (bcrypt), tu sesión se protege con cookies seguras, y tu cuenta se
                bloquea temporalmente después de varios intentos fallidos de inicio de sesión. Las cuentas de
                administrador requieren un segundo paso de verificación por correo. Aplicamos cabeceras de seguridad
                estándar en toda la plataforma y mantenemos un registro de auditoría de las acciones sensibles.
              </p>
            </Seccion>

            <Seccion n="6" titulo="Cuánto tiempo conservamos tus datos">
              <p>
                Conservamos tus datos mientras tu cuenta esté activa. Si solicitás la eliminación de tu cuenta, la
                desactivamos y dejamos de usarla operativamente, pero{" "}
                <Pendiente>
                  definir con el contador de la empresa el plazo mínimo que hay que conservar cierta información
                  (comprobantes de pago, historial de premios y retiros) por obligaciones contables/tributarias antes
                  de poder borrarla por completo
                </Pendiente>.
              </p>
            </Seccion>

            <Seccion n="7" titulo="Tus derechos">
              <p>
                Como titular de tus datos personales, la Ley 1581 de 2012 te reconoce el derecho a:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Conocer, actualizar y rectificar tus datos.</li>
                <li>Solicitar prueba de la autorización que nos diste para tratarlos.</li>
                <li>Ser informado sobre el uso que les hemos dado.</li>
                <li>Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a esta ley.</li>
                <li>Revocar tu autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal de conservarlos.</li>
                <li>Acceder de forma gratuita a tus datos personales que hayamos tratado.</li>
              </ul>
              <p>
                Podés ejercer cualquiera de estos derechos escribiéndonos a{" "}
                <span className="font-mono text-sm">soporte@tienda10k.com</span> (ver nota sobre este correo en{" "}
                <a href="/terminos" className="underline">Términos y Condiciones</a>, sección 21).
              </p>
            </Seccion>

            <Seccion n="8" titulo="Menores de edad">
              <p>
                La plataforma está dirigida únicamente a personas mayores de 18 años. No recolectamos
                deliberadamente datos de menores de edad. Si detectamos que una cuenta pertenece a un menor, la
                desactivaremos.
              </p>
            </Seccion>

            <Seccion n="9" titulo="Cookies y sesión">
              <p>
                Usamos una cookie técnica necesaria para mantener tu sesión iniciada mientras usás la plataforma. Hoy
                no usamos cookies de rastreo publicitario ni compartimos tu actividad de navegación con redes de
                publicidad de terceros.
              </p>
            </Seccion>

            <Seccion n="10" titulo="Cambios a esta política">
              <p>
                Podemos actualizar esta Política en cualquier momento. Los cambios aplican desde su publicación en
                esta página, con la fecha de actualización correspondiente.
              </p>
            </Seccion>

            <Seccion n="11" titulo="Contacto">
              <p>
                Para preguntas sobre esta Política o para ejercer tus derechos, escribinos a{" "}
                <span className="font-mono text-sm">soporte@tienda10k.com</span>.
              </p>
            </Seccion>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
