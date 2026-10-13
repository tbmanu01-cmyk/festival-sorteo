import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ACTUALIZADO = "12 de octubre de 2026";

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

function Subtitulo({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-[#102463] pt-2">{children}</h3>;
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

            <Seccion n="1" titulo="Qué es Tienda 10K y quién la opera">
              <p>
                <strong>Tienda 10K</strong> (también llamada “Proyecto 10K” o “Club 10K”) es la sección de
                membresías de <strong>Comercializadora Multimarcas.com S.A.S.</strong> Se ofrece a través de la
                plataforma digital <span className="font-mono text-sm">tienda10k.com</span> e incluye membresías
                numeradas que participan en una selección aleatoria, una red de referidos organizada en familias,
                gift cards y la tienda de bonos de comercios aliados. Estos Términos y Condiciones son el contrato
                que regula la relación entre la empresa y cada persona registrada (“el afiliado”, “el usuario”,
                “tú”).
              </p>
              <p>
                La tienda de bonos de Multimarcas es una rama del mismo proyecto y, cuando opere integrada a esta
                plataforma, se regirá por estos mismos Términos.
              </p>
              <p>
                <strong>Entidad operadora:</strong> Comercializadora Multimarcas.com S.A.S., NIT{" "}
                <span className="font-mono text-sm">902.065.208-6</span>, con domicilio principal y oficina de
                atención al público en la <strong>Carrera 69 K # 70-19, piso 1, Bogotá D.C., Colombia</strong>.
                Representante legal: <strong>Jairo Alonso González Bautista</strong>, C.C.{" "}
                <span className="font-mono text-sm">79.706.637</span>.
              </p>
              <p>
                Al registrarte y usar la plataforma aceptas estos Términos en su totalidad. Si no estás de acuerdo,
                no debes usar la plataforma.
              </p>
            </Seccion>

            <Seccion n="2" titulo="Naturaleza del modelo: comercio en red no tradicional">
              <p>
                Multimarcas.com S.A.S. se dedica al comercio en red de productos y servicios de distintos
                establecimientos comerciales que ejercen actividades lícitas en Colombia. Actúa como{" "}
                <strong>puente o conector entre compradores y comercios</strong>, y recibe a cambio una comisión o
                retribución pactada con cada comercio. Su actividad corresponde a la de los comisionistas que ponen
                en contacto a vendedores y compradores, incluidas las transacciones realizadas por internet.
              </p>
              <p>
                Es un modelo multinivel <strong>no tradicional</strong>: del esquema multinivel solo utiliza el plan
                de compensación, para distribuir entre la red los excedentes de las comisiones que pagan los
                comercios. Su lema es <strong>“ganar por comprar”</strong>. En consecuencia:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Multimarcas.com no tiene un producto único ni propio y no fabrica los productos que se compran con los bonos.</li>
                <li><strong>No existe kit de inicio</strong> ni cuota de inscripción adicional a la membresía.</li>
                <li><strong>No se paga a nadie por reclutar nuevos miembros.</strong> Las comisiones de la red salen únicamente de compras reales.</li>
                <li>Nadie está obligado a construir una red, a invitar personas ni a comprar inventarios o volúmenes mínimos para seguir activo.</li>
                <li>
                  Los bonos se redimen directamente en el comercio elegido por el comprador. Multimarcas.com no
                  intermedia la entrega de las mercancías o servicios que se adquieren con ellos; la calidad, garantía
                  y entrega de esos productos corresponden al comercio que los vende.
                </li>
                <li>
                  La relación entre la empresa y el afiliado es <strong>mercantil, no laboral</strong>. No hay
                  exclusividad: puedes participar al mismo tiempo en otros negocios o redes.
                </li>
              </ul>
              <p>
                El producto central de Tienda 10K es la <strong>membresía numerada</strong>. Con lo recaudado por
                su venta se forma el fondo de premios que se reparte en la selección aleatoria de cada temporada
                (secciones 6 y 7). Es un <strong>mecanismo cerrado</strong>: la selección se hace únicamente entre
                las membresías efectivamente vendidas en esa temporada. Si se venden 4.000 de las 10.000 disponibles,
                el resultado sale de esas 4.000, nunca de números que nadie compró. Por esta estructura
                (participación mediante membresía en una red, no apuesta directa sobre un resultado externo), es
                posición de la empresa que el club no constituye un juego de suerte y azar en los términos de la
                Ley 643 de 2001.
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
                  El servicio está dirigido a personas ubicadas en Colombia, sin restricción de ciudad o
                  departamento dentro del territorio nacional.
                </li>
                <li>
                  Los empleados o colaboradores de la empresa <strong>sin acceso</strong> al panel administrativo ni a
                  la ejecución de selecciones pueden participar como cualquier otro usuario. Quedan excluidos de
                  participar en una selección los administradores, asistentes y demás personas con acceso al panel
                  que ejecuta esa selección, así como sus familiares directos, para evitar cualquier conflicto de
                  interés con quien tiene la capacidad técnica de intervenir en el resultado.
                </li>
              </ul>
            </Seccion>

            <Seccion n="4" titulo="Tu cuenta">
              <p>
                Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra desde
                tu cuenta. Avísanos de inmediato si sospechas un acceso no autorizado.
              </p>
            </Seccion>

            <Seccion n="5" titulo="Membresías">
              <p>
                La membresía es el pago que realiza el afiliado para hacer parte del proyecto. Te da derecho a:
                (a) participar con tu número en la selección aleatoria de su temporada, y (b) pertenecer a la red de
                familias y recibir los excedentes de comisiones que generen las compras de bonos de tu red, cuando
                la tienda de bonos esté activa (sección 7).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  La plataforma puede ofrecer distintos niveles de membresía, cada uno con su propio precio, su propio
                  calendario de selección y su propio conjunto de 10.000 números (0000–9999).
                </li>
                <li>
                  El precio de cada nivel puede cambiar hacia adelante; el precio pagado en tu compra queda fijado en
                  el momento de la transacción.
                </li>
                <li>Las membresías <strong>no son transferibles</strong> a otra persona ni canjeables directamente por su valor en efectivo.</li>
                <li>
                  Los números se organizan por temporadas. Al cerrar una temporada, los números vuelven a estar
                  disponibles para la siguiente: <strong>un mismo número puede repetirse en temporadas
                  distintas</strong> y no queda reservado de por vida para quien lo compró antes.
                </li>
                <li>
                  La fecha de cada selección la define la plataforma y se muestra antes de la compra. No es necesario
                  vender las 10.000 membresías: la selección se realiza en la fecha programada, entre los números
                  vendidos hasta ese momento.
                </li>
                <li>
                  <strong>No ofrecemos reembolsos</strong> de membresías compradas, incluido el caso en que la
                  temporada no se venda por completo.
                </li>
              </ul>
            </Seccion>

            <Seccion n="6" titulo="Cómo funciona la selección aleatoria">
              <p>
                En cada temporada se obtiene un número de 4 cifras, <strong>únicamente entre las membresías
                vendidas</strong>. Ganan los números que coinciden con él en 4, 3, 2 o 1 cifras finales, según las
                categorías de la sección 7. Cada membresía gana como máximo en una categoría (la de mayor
                coincidencia).
              </p>
              <p>
                El número resultante lo genera un proceso interno del sistema, sin intervención de una lotería,
                casa de apuestas o entidad externa. La selección se realiza en un{" "}
                <strong>evento presencial con los miembros</strong>, en el que se activa la ruleta en pantalla y se
                revela el número ganador a la vista de los asistentes. La fecha y el lugar del evento se informan
                con anticipación en la plataforma, y podrá además transmitirse en vivo por los canales oficiales de
                Tienda 10K.
              </p>
              <p>
                Las probabilidades de cada categoría y los premios estimados según la cantidad de membresías
                vendidas se publican en{" "}
                <Link href="/probabilidades" className="text-[#1B4F8A] underline font-medium">/probabilidades</Link>.
              </p>
            </Seccion>

            <Seccion n="7" titulo="Plan de compensación">
              <Subtitulo>7.1 Destino del recaudo de membresías</Subtitulo>
              <p>
                El afiliado acepta que el valor recaudado por concepto de membresías en cada temporada se destina
                así:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Concepto</th>
                      <th className="px-3 py-2 font-semibold">% del recaudo</th>
                      <th className="px-3 py-2 font-semibold">Cómo se reparte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="px-3 py-2">Premio 4 cifras</td><td className="px-3 py-2">25%</td><td className="px-3 py-2">Un solo ganador por temporada.</td></tr>
                    <tr><td className="px-3 py-2">Premio 3 cifras</td><td className="px-3 py-2">20%</td><td className="px-3 py-2">En partes iguales entre los ganadores de esa categoría.</td></tr>
                    <tr><td className="px-3 py-2">Premio 2 cifras</td><td className="px-3 py-2">15%</td><td className="px-3 py-2">En partes iguales entre los ganadores de esa categoría.</td></tr>
                    <tr><td className="px-3 py-2">Premio 1 cifra</td><td className="px-3 py-2">—</td><td className="px-3 py-2">Una gift card equivalente al valor de una membresía para cada ganador.</td></tr>
                    <tr><td className="px-3 py-2">Operación de la empresa</td><td className="px-3 py-2">40%</td><td className="px-3 py-2">Plataforma, procesamiento de pagos, gift cards, impuestos asumidos por la empresa, eventos y utilidad.</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                El recaudo se calcula sobre el dinero efectivamente pagado: las membresías cubiertas con gift card
                (obsequiadas) no suman al fondo de premios. Estos porcentajes pueden ajustarse para temporadas
                futuras, informándolo en la plataforma antes de que esas temporadas abran a la venta.
              </p>

              <Subtitulo>7.2 Gift cards por membresías</Subtitulo>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Por cada <strong>5 membresías</strong> compradas (propias, o primeras membresías compradas por tus
                  referidos) recibes automáticamente una gift card equivalente al valor de una membresía.
                  El umbral vigente se informa en tu panel.
                </li>
                <li>
                  Las gift cards pueden usarse para comprar una membresía, regalarse a otro usuario registrado o
                  convertirse en saldo de tu cuenta (esto último solo si tu cuenta está confirmada por la
                  plataforma). No tienen fecha de vencimiento.
                </li>
              </ul>

              <Subtitulo>7.3 Comisiones de la tienda de bonos (red de familias)</Subtitulo>
              <p>
                Cuando la tienda de bonos está activa, los comercios aliados pagan a Multimarcas.com una comisión
                por cada bono vendido, cuyo porcentaje varía según el convenio con cada comercio y su actividad. Ese
                margen se distribuye por medio del software multinivel así:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>35%</strong> para el afiliado que compró el bono.</li>
                <li><strong>25%</strong> para quien lo invitó (nivel 1).</li>
                <li><strong>15%</strong> para el nivel siguiente (nivel 2).</li>
                <li><strong>25%</strong> para la plataforma.</li>
              </ul>
              <p>
                La red se organiza en <strong>familias de hasta 3 niveles</strong> (el comprador, sus 3 invitados
                directos y los 9 invitados de estos). Al completarse una familia se abre una nueva automáticamente.
                Las comisiones guardan relación directa con el precio real de los bonos vendidos y se pagan{" "}
                <strong>solo por compras efectivas</strong>, nunca por el simple ingreso de nuevas personas a la
                red.
              </p>

              <Subtitulo>7.4 Selecciones especiales</Subtitulo>
              <p>
                Además de la selección principal, la empresa puede crear selecciones especiales (“Grandes Sorteos” y
                “Selecciones Anticipadas”) con su propio fondo de premios, requisitos y fecha, anunciados previamente
                en la plataforma. Si en el futuro se ofrece un premio físico (por ejemplo un vehículo o un inmueble),
                la empresa asume los impuestos, trámites de traspaso y logística de entrega de ese premio.
              </p>
            </Seccion>

            <Seccion n="8" titulo="Periodicidad y forma de los pagos a la red">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Premios de la selección:</strong> se acreditan al saldo de tu cuenta el mismo día en que se
                  realiza la selección de la temporada, y se te notifica en la plataforma y por correo.
                </li>
                <li>
                  <strong>Gift cards</strong> (de 1 cifra o por membresías): se acreditan a tu cuenta en el momento
                  en que se cumple la condición.
                </li>
                <li>
                  <strong>Comisiones de bonos:</strong> se acreditan al saldo del comprador y de su red en el momento
                  en que se aprueba el pago de la compra del bono.
                </li>
                <li>
                  <strong>Retiro del saldo:</strong> puedes pedirlo cuando quieras a partir del monto mínimo (sección
                  10). Las solicitudes aprobadas se pagan por transferencia a tu cuenta bancaria dentro de los{" "}
                  <strong>5 días hábiles</strong> siguientes.
                </li>
              </ul>
            </Seccion>

            <Seccion n="9" titulo="Pagos">
              <ul className="list-disc pl-5 space-y-1">
                <li>Aceptamos pago con tarjeta/PSE a través de nuestro procesador de pagos, y transferencia bancaria manual con envío de comprobante para aprobación.</li>
                <li>También puedes pagar total o parcialmente con el saldo o las gift cards de tu cuenta.</li>
                <li>No aceptamos pago en efectivo presencial ni otros métodos distintos a los indicados en la plataforma.</li>
                <li>Los pagos por transferencia manual quedan pendientes hasta que el equipo revise y apruebe el comprobante; si no corresponde a un pago válido, la compra se rechaza y la membresía queda disponible de nuevo.</li>
              </ul>
            </Seccion>

            <Seccion n="10" titulo="Retiros de saldo">
              <ul className="list-disc pl-5 space-y-1">
                <li>Monto mínimo de retiro: $100.000 COP.</li>
                <li>Solo puedes retirar hacia una cuenta bancaria a tu propio nombre registrada en tu perfil; no se procesan retiros a cuentas de terceros.</li>
                <li>Cada solicitud se confirma con un código de un solo uso enviado a tu correo, y hay un tiempo de espera de 24 horas entre una solicitud y la siguiente.</li>
                <li>No cobramos comisión por procesar tu retiro.</li>
                <li>
                  <strong>La empresa asume por su cuenta cualquier retención tributaria aplicable</strong> sobre los
                  premios y el saldo retirado, de modo que recibes el monto anunciado sin descuentos por este concepto.
                </li>
                <li>Las solicitudes se revisan manualmente. Podemos rechazar una solicitud cuando detectemos indicios de fraude, datos bancarios incorrectos o incumplimiento de estos Términos; en ese caso el monto vuelve a tu saldo disponible.</li>
              </ul>
            </Seccion>

            <Seccion n="11" titulo="Suspensión y terminación">
              <Subtitulo>11.1 Retiro voluntario</Subtitulo>
              <p>
                No hay permanencia mínima ni penalidad por retirarte. Puedes terminar tu vinculación en cualquier
                momento eliminando tu cuenta desde tu perfil o enviando una comunicación escrita a soporte. Antes de
                hacerlo te recomendamos retirar el saldo disponible que supere el mínimo de retiro. Las membresías
                de una temporada en curso no se reembolsan.
              </p>
              <Subtitulo>11.2 Suspensión o terminación por parte de la empresa</Subtitulo>
              <p>La empresa puede suspender o cancelar una cuenta cuando se presente alguna de estas causales:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Datos de registro falsos o suplantación de identidad.</li>
                <li>Cuentas múltiples de una misma persona.</li>
                <li>Fraude, manipulación del sistema, uso de medios de pago no autorizados o contracargos injustificados.</li>
                <li>Publicidad engañosa sobre la plataforma: prometer ganancias seguras o presentar la membresía como inversión.</li>
                <li>Cualquier otro incumplimiento grave de estos Términos.</li>
              </ul>
              <p>
                La suspensión se notifica por correo indicando la causal, y puedes presentar tus descargos por los
                canales de la sección 19. Si la cuenta se cancela, se paga el saldo legítimamente obtenido,
                descontando lo que provenga del fraude o incumplimiento comprobado.
              </p>
            </Seccion>

            <Seccion n="12" titulo="Participación responsable">
              <p>
                La membresía no es una inversión ni garantiza ganancias. Te recomendamos participar únicamente con
                dinero que estés en condiciones de destinar a ello, sin afectar tus obligaciones ni tu estabilidad
                financiera. Tu perfil incluye dos herramientas que puedes activar cuando quieras:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Límite de gasto mensual:</strong> fijas tú mismo un tope de gasto en membresías por mes
                  calendario. Al alcanzarlo, la plataforma bloquea nuevas compras hasta el mes siguiente.
                </li>
                <li>
                  <strong>Eliminar tu cuenta:</strong> tu acceso se bloquea de inmediato; tu correo y documento quedan
                  libres si más adelante quieres volver a registrarte, y tu historial de compras, retiros y referidos
                  se conserva.
                </li>
              </ul>
            </Seccion>

            <Seccion n="13" titulo="Publicación de ganadores">
              <p>
                Los ganadores de cada selección se publican en la sección pública de Ranking con el nombre
                parcialmente oculto (nunca el nombre completo, documento ni fotografía) y, cuando aplica, el monto del
                premio. En el evento presencial solo se muestran el nombre y el número ganador.
              </p>
            </Seccion>

            <Seccion n="14" titulo="Comunicaciones">
              <p>
                Te enviamos correos relacionados con tu actividad en la plataforma: comprobantes de compra,
                notificaciones de premio, estado de retiros y recuperación de contraseña. Hoy no enviamos correos
                promocionales ni de mercadeo.
              </p>
            </Seccion>

            <Seccion n="15" titulo="Propiedad intelectual">
              <p>
                Los textos, diseño, marcas “Tienda 10K”, “Club 10K” y “Multimarcas”, logotipos y demás contenido de la
                plataforma son de titularidad de la empresa operadora o de sus licenciantes. No está permitido
                reproducirlos ni usarlos comercialmente sin autorización previa por escrito.
              </p>
            </Seccion>

            <Seccion n="16" titulo="Protección de datos personales">
              <p>
                Tratamos tus datos personales conforme a la Ley 1581 de 2012 y sus decretos reglamentarios, con tu
                autorización previa al registrarte. No vendemos tus datos a terceros. El detalle de qué datos
                recolectamos, para qué los usamos y cómo ejercer tus derechos (acceso, corrección, supresión) está en
                nuestra{" "}
                <Link href="/privacidad" className="text-[#1B4F8A] underline font-medium">Política de Privacidad</Link>.
              </p>
            </Seccion>

            <Seccion n="17" titulo="Disponibilidad, fuerza mayor y modificaciones">
              <p>
                Hacemos esfuerzos razonables para mantener la plataforma disponible, pero no garantizamos operación
                ininterrumpida. No somos responsables por fallas de terceros (procesadores de pago, proveedores de
                correo o de infraestructura), ataques informáticos o eventos de fuerza mayor. Si una falla afecta una
                selección programada, la reprogramaremos y lo comunicaremos a los afectados.
              </p>
              <p>
                Podemos actualizar estos Términos. Los cambios aplican hacia adelante desde su publicación en esta
                página con su fecha de actualización, y no afectan compras ni solicitudes procesadas antes del cambio.
                Los cambios en el plan de compensación se informan antes de la temporada a la que aplican.
              </p>
            </Seccion>

            <Seccion n="18" titulo="Cierre de operaciones">
              <p>
                Si la empresa decide cesar operaciones, lo comunicará con al menos 30 días de anticipación por correo y
                aviso visible en la plataforma. Durante ese plazo podrás retirar tu saldo con normalidad, y usar o
                regalar tus gift cards vigentes. Los saldos y gift cards no reclamados al finalizar ese plazo se
                tratarán conforme a la normativa aplicable en ese momento.
              </p>
            </Seccion>

            <Seccion n="19" titulo="Peticiones, quejas, reclamos y solución de controversias">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Canales:</strong> el chat de soporte dentro de la plataforma, el correo{" "}
                  <span className="font-mono text-sm">soporte@tienda10k.com</span>, o de forma presencial en la
                  oficina de la Carrera 69 K # 70-19, piso 1, Bogotá D.C.
                </li>
                <li>Respondemos peticiones, quejas y reclamos dentro de los <strong>15 días hábiles</strong> siguientes a su recibo.</li>
                <li>
                  Si no quedas conforme con la respuesta, las partes intentarán un arreglo directo y, de no lograrse,
                  podrán acudir a conciliación ante un centro de conciliación autorizado en Bogotá D.C.
                </li>
                <li>
                  Esto no limita tu derecho a acudir a la Superintendencia de Industria y Comercio, a la
                  Superintendencia de Sociedades o a los jueces competentes. Ninguna cláusula de estos Términos implica
                  renuncia a los derechos que la ley te reconoce; cualquier disposición en ese sentido se tiene por no
                  escrita.
                </li>
              </ul>
            </Seccion>

            <Seccion n="20" titulo="Ley aplicable">
              <p>
                Estos Términos se rigen por las leyes de la República de Colombia, en particular el Código de Comercio,
                la Ley 1700 de 2013 sobre comercialización en red, el Estatuto del Consumidor (Ley 1480 de 2011) y la
                Ley 1581 de 2012 de protección de datos personales. Para efectos judiciales, el domicilio contractual
                es Bogotá D.C., sin perjuicio de las acciones que la ley colombiana reconoce a los consumidores.
              </p>
            </Seccion>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
