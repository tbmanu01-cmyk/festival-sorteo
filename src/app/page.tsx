import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownAnticipada from "@/components/CountdownAnticipada";

const TOTAL_CAJAS = 10000;

interface Anticipada {
  id: string;
  nombre: string;
  descripcion: string | null;
  premioDescripcion: string;
  fecha: Date;
  cantidadGanadores: number;
}

async function obtenerDatos() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const [config, vendidas] = await Promise.all([
      prisma.config.findUnique({ where: { id: "singleton" } }),
      prisma.caja.count({ where: { estado: "VENDIDA" } }),
    ]);

    let anticipadas: Anticipada[] = [];
    try {
      anticipadas = await prisma.sorteoAnticipado.findMany({
        where: { estado: "PENDIENTE", fecha: { gte: new Date() } },
        select: { id: true, nombre: true, descripcion: true, premioDescripcion: true, fecha: true, cantidadGanadores: true },
        orderBy: { fecha: "asc" },
        take: 5,
      });
    } catch { /* tabla aún no creada */ }

    return {
      precioCaja: config?.precioCaja ?? 10_000,
      fechaSorteo: config?.fechaSorteo ?? null,
      pct4: config?.pct4Cifras ?? 0.35,
      pct3: config?.pct3Cifras ?? 0.15,
      pct2: config?.pct2Cifras ?? 0.10,
      margen: config?.margenGanancia ?? 0.40,
      vendidas,
      anticipadas,
    };
  } catch {
    return { precioCaja: 10_000, fechaSorteo: null, pct4: 0.35, pct3: 0.15, pct2: 0.10, margen: 0.40, vendidas: 0, anticipadas: [] };
  }
}

function ContadorCajas({ vendidas }: { vendidas: number }) {
  const disponibles = TOTAL_CAJAS - vendidas;
  const porcentaje = (vendidas / TOTAL_CAJAS) * 100;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
      <p className="text-blue-200 text-sm font-medium mb-1">Cajas disponibles</p>
      <p className="text-5xl font-bold text-white mb-1">
        {disponibles.toLocaleString("es-CO")}
      </p>
      <p className="text-[#F5A623] text-sm mb-4">de {TOTAL_CAJAS.toLocaleString("es-CO")} totales</p>
      <div className="w-full bg-white/20 rounded-full h-3 mb-2">
        <div
          className="bg-[#F5A623] h-3 rounded-full transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="text-blue-200 text-xs">{porcentaje.toFixed(1)}% vendido</p>
    </div>
  );
}

const pasos = [
  {
    numero: "01",
    titulo: "Regístrate gratis",
    descripcion: "Crea tu cuenta con tus datos personales y bancarios. Solo toma 2 minutos.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    numero: "02",
    titulo: "Elige tu número",
    descripcion: "Selecciona uno o más números del 0000 al 9999. Cada caja cuesta $10.000 COP.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    numero: "03",
    titulo: "Gana premios",
    descripcion: "El número ganador se saca de la lotería de Bogotá. ¡Coincide 4, 3, 2 o 1 cifra y gana!",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
];

const premios = [
  {
    categoria: "4 cifras exactas",
    premio: "35% del recaudo",
    color: "from-yellow-400 to-yellow-600",
    icono: "🏆",
    descripcion: "El número completo coincide con el resultado",
  },
  {
    categoria: "3 últimas cifras",
    premio: "15% del recaudo",
    color: "from-gray-300 to-gray-500",
    icono: "🥈",
    descripcion: "Las 3 últimas cifras coinciden",
  },
  {
    categoria: "2 últimas cifras",
    premio: "10% del recaudo",
    color: "from-amber-600 to-amber-800",
    icono: "🥉",
    descripcion: "Las 2 últimas cifras coinciden",
  },
  {
    categoria: "1 última cifra",
    premio: "Devolución del valor",
    color: "from-blue-400 to-blue-600",
    icono: "🎁",
    descripcion: "La última cifra coincide con el resultado",
  },
];

export default async function Inicio() {
  const { precioCaja, fechaSorteo, pct4, pct3, pct2, vendidas, anticipadas } = await obtenerDatos();
  const pctPremios = Math.round((pct4 + pct3 + pct2) * 100);
  const fechaStr = fechaSorteo
    ? new Date(fechaSorteo).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Fecha del sorteo — banner si está configurada */}
        {fechaStr && (
          <div className="bg-[#F5A623] text-[#1B4F8A] py-2.5 px-4 text-center text-sm font-bold">
            🗓️ Fecha del resultado: {fechaStr}
          </div>
        )}

        {/* Hero */}
        <section className="bg-gradient-to-br from-[#1B4F8A] via-[#1a5fa8] to-[#0d3b6e] text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block bg-[#F5A623]/20 text-[#F5A623] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 border border-[#F5A623]/30">
                  Cajas Sorpresa
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                  <span className="text-[#F5A623]">Cajas Sorpresa</span>
                  <br />
                  <span className="text-3xl md:text-4xl">10,000 números</span>
                </h1>
                <p className="text-blue-200 text-lg md:text-xl leading-relaxed mb-8">
                  Elige tu número favorito
                  del <strong className="text-white">0000 al 9999</strong>, paga solo{" "}
                  <strong className="text-[#F5A623]">${precioCaja.toLocaleString("es-CO")} COP</strong> y gana hasta el{" "}
                  <strong className="text-white">{Math.round(pct4 * 100)}% del recaudo total</strong>.
                </p>
                {fechaStr && (
                  <div className="bg-white/10 border border-[#F5A623]/40 rounded-xl px-5 py-3 mb-6 text-sm">
                    <span className="text-[#F5A623] font-bold">🗓️ Resultado:</span>{" "}
                    <span className="text-white">{fechaStr}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/registro"
                    className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-center"
                  >
                    Adquiere tu caja
                  </Link>
                  <Link
                    href="#como-funciona"
                    className="border-2 border-white/40 hover:border-white text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all text-center hover:bg-white/10"
                  >
                    ¿Cómo funciona?
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                <ContadorCajas vendidas={vendidas} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                    <p className="text-2xl font-bold text-[#F5A623]">
                      ${precioCaja.toLocaleString("es-CO")}
                    </p>
                    <p className="text-blue-200 text-xs mt-1">Precio por caja</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                    <p className="text-2xl font-bold text-[#F5A623]">{pctPremios}%</p>
                    <p className="text-blue-200 text-xs mt-1">Va a premios</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1B4F8A] mb-4">
                ¿Cómo funciona?
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Participar es muy fácil. En 3 simples pasos puedes estar en la lista de ganadores.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {pasos.map((paso) => (
                <div
                  key={paso.numero}
                  className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-shadow group"
                >
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#1B4F8A] text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg">
                    {paso.numero}
                  </div>
                  <div className="text-[#F5A623] mb-4 mt-2 group-hover:scale-110 transition-transform">
                    {paso.icono}
                  </div>
                  <h3 className="text-xl font-bold text-[#1B4F8A] mb-3">{paso.titulo}</h3>
                  <p className="text-gray-600 leading-relaxed">{paso.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Próximas selecciones anticipadas */}
        {anticipadas.length > 0 && (
          <section id="anticipadas" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="inline-block bg-[#F5A623]/15 text-[#b87b00] text-sm font-bold px-4 py-1.5 rounded-full mb-4 border border-[#F5A623]/30">
                  ¡Antes del sorteo principal!
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#1B4F8A] mb-4">
                  Próximas selecciones
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Sorteos anticipados con premios especiales. ¡Tu caja puede ganar antes del evento principal!
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {anticipadas.map((a) => (
                  <div
                    key={a.id}
                    className="bg-gradient-to-br from-[#1B4F8A]/5 to-[#F5A623]/5 rounded-2xl border border-[#1B4F8A]/10 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl">🎯</span>
                      <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] text-xs font-bold px-2.5 py-1 rounded-full">
                        {a.cantidadGanadores} ganador{a.cantidadGanadores !== 1 ? "es" : ""}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-[#1B4F8A] text-lg mb-1">{a.nombre}</h3>
                    {a.descripcion && (
                      <p className="text-gray-500 text-sm mb-3">{a.descripcion}</p>
                    )}
                    <div className="bg-[#F5A623]/10 rounded-xl px-4 py-3 mb-4">
                      <p className="text-xs text-gray-500 mb-0.5">Premio</p>
                      <p className="font-extrabold text-[#b87b00] text-lg">{a.premioDescripcion}</p>
                    </div>
                    <div className="border-t border-[#1B4F8A]/10 pt-4">
                      <p className="text-xs text-gray-500 mb-1.5">
                        {new Date(a.fecha).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Faltan:</span>
                        <CountdownAnticipada fecha={a.fecha.toISOString()} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  href="/registro"
                  className="inline-block bg-[#1B4F8A] hover:bg-[#1a5fa8] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Participar en las selecciones →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Premios */}
        <section id="premios" className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1B4F8A] mb-4">
                Tabla de premios
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                El número ganador lo determina la Lotería de Bogotá. Mientras más cifras coincidan, mayor es tu premio.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {premios.map((p) => (
                <div
                  key={p.categoria}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100"
                >
                  <div className={`bg-gradient-to-br ${p.color} p-6 text-center`}>
                    <span className="text-4xl">{p.icono}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#1B4F8A] mb-1">{p.categoria}</h3>
                    <p className="text-[#F5A623] font-extrabold text-xl mb-2">{p.premio}</p>
                    <p className="text-gray-500 text-sm">{p.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 bg-[#1B4F8A]/5 rounded-2xl p-6 border border-[#1B4F8A]/10">
              <h3 className="font-bold text-[#1B4F8A] mb-3 text-lg">Distribución del recaudo</h3>
              <div className="grid sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Premio 4 cifras", valor: `${Math.round(pct4 * 100)}%` },
                  { label: "Premio 3 cifras", valor: `${Math.round(pct3 * 100)}%` },
                  { label: "Premio 2 cifras", valor: `${Math.round(pct2 * 100)}%` },
                  { label: "Operación (gastos)", valor: `${Math.round((1 - pct4 - pct3 - pct2) * 100)}%` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-2xl font-extrabold text-[#1B4F8A]">{item.valor}</p>
                    <p className="text-gray-500 text-sm">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-gradient-to-r from-[#1B4F8A] to-[#0d3b6e] py-16 text-white text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              ¡No te quedes sin tu número!
            </h2>
            <p className="text-blue-200 text-lg mb-8">
              Solo quedan{" "}
              <strong className="text-[#F5A623]">
                {(TOTAL_CAJAS - vendidas).toLocaleString("es-CO")}
              </strong>{" "}
              cajas disponibles. Regístrate ahora y asegura el tuyo.
            </p>
            <Link
              href="/registro"
              className="inline-block bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold text-xl px-10 py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Adquiere tu caja — ${precioCaja.toLocaleString("es-CO")} COP
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
