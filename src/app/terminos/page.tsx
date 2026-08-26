import Link from "next/link";
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

export default function TerminosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <section
          className="py-16 px-4 text-center"
          style={{ background: "linear-gradient(135deg,#07193a 0%,#1B4F8A 55%,#07193a 100%)" }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3">Términos y Condiciones</h1>
          <p className="text-blue-200">Tienda 10K — última actualización: {ACTUALIZADO}</p>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

            <div className="mb-8 bg-red-50 border border-red-300 rounded-xl p-4 text-red-800 text-sm leading-relaxed">
              <strong>Este documento es un borrador de trabajo, no un texto legal definitivo.</strong> Fue redactado
              describiendo con precisión cómo funciona hoy la plataforma, pero varias secciones marcadas con{" "}
              <Pendiente>ejemplo</Pendiente> dependen de información legal/contable/societaria que solo la empresa
              puede definir, y de la revisión de un abogado antes de publicarse como versión oficial — en particular
              todo lo relacionado con la autorización de Coljuegos para operar mecánicas de selección aleatoria con
              dinero real en Colombia, y el tratamiento tributario de los premios/retiros.
            </div>

            <Seccion n="1" titulo="Quiénes somos y objeto de este documento">
              <p>
                Tienda 10K (también identificada en algunas comunicaciones como "Club 10K") es una plataforma digital
                que ofrece membresías numeradas participantes en mecánicas de selección aleatoria, un programa de
                referidos con red de familias, gift cards, y una tienda de bonos con cashback multinivel. Estos
                Términos y Condiciones regulan el uso de la plataforma, accesible en{" "}
                <span className="font-mono text-sm">tienda10k.com</span>, por parte de cualquier persona registrada
                ("el usuario", "vos", "tú").
              </p>
              <p>
                Entidad operadora: <Pendiente>razón social completa, NIT, domicilio y representante legal — se
                completa cuando la empresa esté registrada ante Cámara de Comercio</Pendiente>.
              </p>
              <p>
                Al registrarte y usar la plataforma aceptás estos Términos en su totalidad. Si no estás de acuerdo,
                no debés usar la plataforma.
              </p>
            </Seccion>

            <Seccion n="2" titulo="Naturaleza jurídica del club">
              <p>
                <Pendiente>
                  definir si opera como fundación sin ánimo de lucro o como sociedad comercial, y confirmar con
                  asesoría legal la estructura óptima frente a la normativa de juegos de suerte y azar
                </Pendiente>
                . Mientras este punto no esté resuelto, este documento no debe considerarse una autorización ni
                confirmación de que la actividad cuenta con los permisos que la ley colombiana exige para mecánicas de
                selección aleatoria con premios en dinero (Ley 643 de 2001 y normas que regulan a Coljuegos como
                autoridad de los juegos de suerte y azar en Colombia).
              </p>
            </Seccion>

            <Seccion n="3" titulo="Quién puede registrarse">
              <ul className="list-disc pl-5 space-y-1">
                <li>Ser mayor de 18 años (se solicita fecha de nacimiento al registrarte y se valida automáticamente).</li>
                <li>Registrar datos veraces, incluyendo un número de documento de identidad único por persona.</li>
                <li>
                  La verificación de identidad es <strong>autodeclarada</strong>: no se valida el documento contra
                  ninguna base de datos oficial. Nos reservamos el derecho de solicitar soportes adicionales o
                  suspender una cuenta si hay indicios razonables de datos falsos.
                </li>
                <li>Una cuenta por persona. No está permitido registrar cuentas adicionales para eludir límites o reglas de la plataforma.</li>
                <li>
                  Alcance geográfico: <Pendiente>
                    definir si el servicio está dirigido solo a residentes en Colombia, a colombianos en el exterior,
                    o también a extranjeros — hoy la plataforma no aplica ninguna restricción técnica por país
                  </Pendiente>.
                </li>
                <li>
                  <Pendiente>
                    definir si empleados, colaboradores o familiares directos de la empresa pueden participar
                  </Pendiente>.
                </li>
              </ul>
            </Seccion>

            <Seccion n="4" titulo="Tu cuenta">
              <p>
                Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra desde
                tu cuenta. Notificanos de inmediato si sospechás un acceso no autorizado.
              </p>
              <p>
                Podemos suspender o desactivar una cuenta cuando detectemos fraude, suplantación, manipulación del
                sistema, cuentas múltiples de una misma persona, o incumplimiento de estos Términos. La suspensión no
                genera derecho a reembolso de compras ya realizadas (ver sección 9).
              </p>
            </Seccion>

            <Seccion n="5" titulo="Membresías">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  La plataforma ofrece distintos niveles de membresía, cada uno con su propio precio, su propio
                  calendario de selección aleatoria y su propio conjunto de 10.000 números disponibles (0000–9999).
                </li>
                <li>
                  El precio de cada nivel puede cambiar en cualquier momento hacia adelante; el precio pagado en tu
                  compra queda fijado en el momento de la transacción y no se ve afectado por cambios posteriores.
                </li>
                <li>Las membresías <strong>no son transferibles</strong> a otra persona ni canjeables por su valor en efectivo directamente.</li>
                <li>
                  Los números de membresía se organizan por temporadas. Al cerrar una temporada, el conjunto de
                  números vuelve a estar disponible para la siguiente — <strong>un mismo número puede repetirse en
                  temporadas distintas</strong> y no queda reservado de por vida para quien lo compró antes.
                </li>
                <li>
                  La fecha de cada selección aleatoria la define la plataforma y se muestra en la página
                  correspondiente antes de la compra. No se garantiza que todos los números de una temporada se
                  vendan antes de la fecha programada.
                </li>
                <li>
                  <strong>Actualmente no ofrecemos reembolsos</strong> de membresías compradas, incluyendo casos donde
                  la temporada no se completa antes de la fecha de selección.{" "}
                  <Pendiente>confirmar si se quiere ofrecer alguna política de reembolso a futuro</Pendiente>.
                </li>
              </ul>
            </Seccion>

            <Seccion n="6" titulo="Cómo funciona la selección aleatoria">
              <p>
                Cada temporada asigna premios a los números cuyas últimas cifras coinciden con el número resultante de
                la selección, en distintas categorías (coincidencia de 4, 3, 2 o 1 cifras). La distribución exacta del
                fondo de premios entre categorías, así como la cantidad estimada de ganadores por categoría, se
                publica de forma transparente en{" "}
                <Link href="/probabilidades" className="text-[#1B4F8A] underline font-medium">/probabilidades</Link>{" "}
                y puede variar entre temporadas.
              </p>
              <p>
                Los premios de la categoría de 1 cifra se entregan como gift card equivalente al valor de una
                membresía, no como dinero en efectivo.
              </p>
              <p>
                El número resultante de cada selección se genera mediante un proceso interno del sistema (aleatorio
                por software), sin intervención de una lotería, casa de apuestas o entidad externa. Este mecanismo{" "}
                <Pendiente>
                  no cuenta hoy con auditoría externa, notario ni transmisión pública — definir si se quiere sumar
                  algún mecanismo de verificación independiente antes de presentarlo como "auditado" o "verificable"
                  ante los usuarios
                </Pendiente>.
              </p>
            </Seccion>

            <Seccion n="7" titulo="Grandes Sorteos y Selecciones Anticipadas">
              <p>
                Además de la selección principal de cada temporada, podemos crear selecciones especiales adicionales
                ("Grandes Sorteos" y "Selecciones Anticipadas") con su propio fondo de premios, requisitos y fecha,
                anunciados previamente en la plataforma. Su frecuencia no es fija y depende de decisiones internas de
                la empresa.
              </p>
              <p>
                Todos los premios ofrecidos hoy son en dinero (COP) o gift cards. La plataforma no tiene actualmente
                mecanismos para entregar premios físicos (vehículos, inmuebles, etc.);{" "}
                <Pendiente>si en el futuro se ofrecen premios físicos, definir aquí quién asume impuestos, trámites de traspaso y logística de entrega</Pendiente>.
              </p>
            </Seccion>

            <Seccion n="8" titulo="Programa de referidos, red de familias y gift cards">
              <ul className="list-disc pl-5 space-y-1">
                <li>Cada usuario tiene un código de referido único para invitar a otras personas.</li>
                <li>
                  Al alcanzar cierta cantidad de membresías compradas (propias o por referidos que compraron su
                  primera membresía) se otorga automáticamente una gift card. El umbral exacto puede cambiar y se
                  informa en tu panel de cuenta.
                </li>
                <li>
                  Las gift cards pueden: usarse como descuento en la compra de una membresía, regalarse a otro usuario
                  registrado, o convertirse en saldo de tu cuenta (esto último solo si tu cuenta está verificada como
                  confirmada por la plataforma).
                </li>
                <li>Las gift cards no tienen fecha de vencimiento.</li>
                <li>
                  La red de referidos se organiza en familias de hasta 12 personas (3 directas + 9 de segundo nivel);
                  al completarse una familia se abre una nueva automáticamente. Estas reglas pueden ajustarse con
                  aviso razonable a los usuarios.
                </li>
              </ul>
            </Seccion>

            <Seccion n="9" titulo="Tienda de bonos y cashback">
              <p>
                Cuando esta sección está activa, la plataforma ofrece bonos de comercios afiliados con descuento sobre
                su valor facial. Cada compra de bono genera cashback distribuido entre el comprador y su red de
                referidos directos e indirectos, según los porcentajes vigentes publicados en la plataforma al momento
                de la compra. Esta función puede estar temporalmente deshabilitada sin previo aviso.
              </p>
            </Seccion>

            <Seccion n="10" titulo="Pagos">
              <ul className="list-disc pl-5 space-y-1">
                <li>Aceptamos pago con tarjeta/PSE a través de nuestro procesador de pagos, y transferencia bancaria manual con envío de comprobante para aprobación.</li>
                <li>También podés pagar total o parcialmente con el saldo o las gift cards de tu cuenta.</li>
                <li>No aceptamos pago en efectivo presencial ni otros métodos distintos a los indicados en la plataforma.</li>
                <li>Los pagos por transferencia manual quedan pendientes hasta que el equipo revise y apruebe el comprobante enviado; si el comprobante no corresponde a un pago válido, la compra se rechaza y la membresía queda disponible de nuevo.</li>
              </ul>
            </Seccion>

            <Seccion n="11" titulo="Retiros de saldo">
              <ul className="list-disc pl-5 space-y-1">
                <li>Monto mínimo de retiro: $100.000 COP.</li>
                <li>Solo podés retirar hacia la cuenta bancaria registrada a tu propio nombre en tu perfil — no se procesan retiros a cuentas de terceros.</li>
                <li>Cada solicitud de retiro se confirma con un código de un solo uso enviado a tu correo, y hay un tiempo de espera de 24 horas entre una solicitud y la siguiente.</li>
                <li>No cobramos comisión por procesar tu retiro.</li>
                <li>
                  Antes de aprobar un retiro podemos aplicar una retención tributaria sobre el monto, cuando
                  corresponda según la normativa fiscal colombiana aplicable a este tipo de ingresos. El porcentaje y
                  el monto neto a pagar se te informan antes de completar el retiro.{" "}
                  <Pendiente>
                    confirmar con el contador de la empresa el porcentaje correcto de retención en la fuente aplicable
                    (ganancias ocasionales u otro concepto), y si se emitirá certificado tributario a los ganadores
                  </Pendiente>.
                </li>
                <li>No garantizamos un plazo fijo de procesamiento; las solicitudes se revisan y aprueban manualmente por el equipo.</li>
                <li>Podemos rechazar una solicitud de retiro cuando detectemos indicios de fraude, datos bancarios incorrectos, o incumplimiento de estos Términos; en ese caso el monto vuelve a tu saldo disponible.</li>
              </ul>
            </Seccion>

            <Seccion n="12" titulo="Juego responsable">
              <p>
                Te recomendamos participar únicamente con dinero que estés en condiciones de destinar a
                entretenimiento, sin afectar tus obligaciones ni tu estabilidad financiera.{" "}
                <Pendiente>
                  la plataforma no cuenta hoy con límites de gasto configurables por el usuario ni con mecanismo de
                  autoexclusión temporal — evaluar si conviene incorporarlos antes del lanzamiento definitivo
                </Pendiente>.
              </p>
            </Seccion>

            <Seccion n="13" titulo="Publicación de ganadores">
              <p>
                Los ganadores de cada selección se publican en la sección pública de Ranking, mostrando el nombre
                parcialmente oculto (nunca el nombre completo, documento, ni fotografía) y, cuando aplica, el monto
                del premio.
              </p>
            </Seccion>

            <Seccion n="14" titulo="Comunicaciones">
              <p>
                Te enviamos correos únicamente relacionados con tu actividad en la plataforma: comprobantes de compra,
                notificaciones de premio, estado de retiros y recuperación de contraseña. Hoy no enviamos correos
                promocionales ni de mercadeo.
              </p>
            </Seccion>

            <Seccion n="15" titulo="Propiedad intelectual">
              <p>
                Los textos, diseño, marca "Tienda 10K"/"Club 10K", logotipos y demás contenido de la plataforma son de
                titularidad de la empresa operadora o de sus licenciantes. No está permitido reproducirlos,
                distribuirlos ni usarlos comercialmente sin autorización previa por escrito.{" "}
                <Pendiente>confirmar si la marca ya está registrada ante la Superintendencia de Industria y Comercio</Pendiente>.
              </p>
            </Seccion>

            <Seccion n="16" titulo="Protección de datos personales">
              <p>
                Tratamos tus datos personales conforme a la Ley 1581 de 2012 y sus decretos reglamentarios. No vendemos
                tus datos a terceros. El detalle completo de qué datos recolectamos, para qué los usamos y cómo podés
                ejercer tus derechos (acceso, corrección, supresión) está — o estará próximamente —{" "}
                <Pendiente>
                  publicar la Política de Privacidad completa en /privacidad — el enlace ya existe en el pie de página
                  pero la página todavía no está construida
                </Pendiente>.
              </p>
            </Seccion>

            <Seccion n="17" titulo="Disponibilidad y fuerza mayor">
              <p>
                Hacemos esfuerzos razonables para mantener la plataforma disponible, pero no garantizamos operación
                ininterrumpida. No somos responsables por fallas causadas por terceros (procesadores de pago, proveedores
                de correo, proveedores de infraestructura en la nube), ataques informáticos, o eventos de fuerza mayor
                fuera de nuestro control razonable. En caso de una falla que afecte la ejecución de una selección
                aleatoria programada, la reprogramaremos y lo comunicaremos a los usuarios afectados.
              </p>
            </Seccion>

            <Seccion n="18" titulo="Modificaciones a estos Términos">
              <p>
                Podemos actualizar estos Términos en cualquier momento. Los cambios aplican hacia adelante, desde su
                publicación en esta página con la fecha de actualización correspondiente — no afectan compras o
                solicitudes ya procesadas antes del cambio. El uso continuado de la plataforma después de una
                actualización implica la aceptación de los nuevos Términos.
              </p>
            </Seccion>

            <Seccion n="19" titulo="Cierre de operaciones">
              <p>
                <Pendiente>
                  definir la política de la empresa ante un eventual cierre de operaciones: si se liquidarían saldos y
                  gift cards vigentes, en qué plazo, y de qué forma se comunicaría a los usuarios
                </Pendiente>.
              </p>
            </Seccion>

            <Seccion n="20" titulo="Ley aplicable y resolución de conflictos">
              <p>
                Estos Términos se rigen por las leyes de la República de Colombia, incluyendo el Estatuto del
                Consumidor (Ley 1480 de 2011). Cualquier controversia se someterá a los jueces competentes de{" "}
                <Pendiente>ciudad de domicilio legal de la empresa, aún pendiente de definir en la sección 1</Pendiente>,
                sin perjuicio de los mecanismos de protección al consumidor y las acciones judiciales que la ley
                colombiana reconoce a los usuarios, incluyendo la acción de grupo, que no es objeto de renuncia por
                este documento.
              </p>
            </Seccion>

            <Seccion n="21" titulo="Contacto">
              <p>
                Para preguntas sobre estos Términos, escribinos a{" "}
                <Pendiente>correo de contacto/soporte oficial de la empresa</Pendiente>.
              </p>
            </Seccion>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
