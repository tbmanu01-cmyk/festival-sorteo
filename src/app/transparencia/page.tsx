"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface TierData {
  slug: string;
  nombre: string;
  precio: number;
  temporadaNumero: number;
  vendidas: number;
  totalCajas: number;
  pagadas: number;
  gratis: number;
  sinDato: number;
  recaudoReal: number;
  fondoPremios: number;
  margenOperacion: number;
}

interface Data {
  tiers: TierData[];
  porcentajes: {
    cuatroCifras: number; tresCifras: number; dosCifras: number; unaCifra: number; margen: number;
  };
}

function fmt(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}
function pct(n: number, dec = 0) {
  return (n * 100).toFixed(dec) + "%";
}

export default function PaginaTransparencia() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/transparencia").then((r) => r.json()).then(setData);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section
          className="py-16 px-4 text-center"
          style={{ background: "linear-gradient(135deg,#07193a 0%,#1B4F8A 55%,#07193a 100%)" }}
        >
          <span className="inline-flex items-center gap-2 border border-[#F5A623]/40 bg-[#F5A623]/10 rounded-full px-5 py-2 text-[#F5A623] text-xs font-bold uppercase tracking-widest mb-5">
            Datos en vivo
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3">Transparencia</h1>
          <p className="text-blue-200 max-w-xl mx-auto">
            Cuánto se ha vendido de verdad, cuánto fue gratis por gift card, y cómo se calcula el fondo de premios —
            visible para cualquier persona, sin necesidad de tener cuenta.
          </p>
        </section>

        {!data ? (
          <div className="py-20 text-center text-gray-400">Cargando datos en vivo…</div>
        ) : (
          <section className="py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">

              {data.tiers.map((t) => {
                const pctPagadas = t.vendidas > 0 ? t.pagadas / t.vendidas : 0;
                const pctGratis = t.vendidas > 0 ? t.gratis / t.vendidas : 0;
                const pctSinDato = t.vendidas > 0 ? t.sinDato / t.vendidas : 0;
                return (
                  <div key={t.slug} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                      <h2 className="text-xl font-extrabold text-[#1B4F8A]">{t.nombre}</h2>
                      <span className="text-xs text-gray-400 font-semibold">Temporada #{t.temporadaNumero}</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-5">
                      {fmt(t.vendidas)} de {fmt(t.totalCajas)} membresías vendidas ({pct(t.vendidas / t.totalCajas)})
                    </p>

                    {/* Barra pagadas vs gratis */}
                    <div className="mb-2">
                      <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                        {pctPagadas > 0 && <div style={{ width: `${pctPagadas * 100}%` }} className="bg-[#1B4F8A]" />}
                        {pctGratis > 0 && <div style={{ width: `${pctGratis * 100}%` }} className="bg-[#F5A623]" />}
                        {pctSinDato > 0 && <div style={{ width: `${pctSinDato * 100}%` }} className="bg-gray-300" />}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs font-semibold">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1B4F8A] inline-block" />Pagadas con dinero real — {fmt(t.pagadas)} ({pct(pctPagadas)})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5A623] inline-block" />Gratis por gift card — {fmt(t.gratis)} ({pct(pctGratis)})</span>
                        {t.sinDato > 0 && (
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />Sin dato histórico — {fmt(t.sinDato)}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                      <div className="bg-gray-50 rounded-xl p-3.5 text-center">
                        <p className="text-lg font-extrabold text-[#1B4F8A]">${fmt(t.recaudoReal)}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Recaudo real acumulado</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3.5 text-center">
                        <p className="text-lg font-extrabold text-[#F5A623]">${fmt(t.fondoPremios)}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Fondo de premios actual</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
                        <p className="text-lg font-extrabold text-gray-700">${fmt(t.precio)}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Precio por membresía</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Explicación */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-lg font-extrabold text-[#1B4F8A] mb-4">¿Cómo se calcula esto?</h2>
                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                  <p>
                    <strong>El fondo de premios sale únicamente de la plata real recaudada</strong> — nunca se cuenta
                    una membresía obtenida gratis (por gift card de referidos o por ganar el premio de 1 cifra) como
                    si hubiera pagado precio completo. Así, lo que se promete en premios siempre está respaldado por
                    dinero que efectivamente entró.
                  </p>
                  <p>
                    <strong>Tu probabilidad de ganar no cambia por cómo se pagó cada membresía.</strong> En la
                    selección aleatoria, todas las membresías vendidas de la temporada pesan exactamente igual, sin
                    importar si esa membresía específica se pagó con tarjeta, transferencia, saldo o gift card
                    gratuita.
                  </p>
                  <p>
                    Distribución del recaudo real: <strong>{pct(data.porcentajes.cuatroCifras)}</strong> a 4 cifras,{" "}
                    <strong>{pct(data.porcentajes.tresCifras)}</strong> a 3 cifras,{" "}
                    <strong>{pct(data.porcentajes.dosCifras)}</strong> a 2 cifras
                    {data.porcentajes.unaCifra > 0 ? (
                      <> y <strong>{pct(data.porcentajes.unaCifra)}</strong> a 1 cifra</>
                    ) : (
                      <> — 1 cifra no reparte dinero, entrega una membresía gratis (gift card) equivalente al precio de una membresía</>
                    )}
                    . El resto (<strong>{pct(data.porcentajes.margen)}</strong>) es el margen de operación de la
                    empresa.
                  </p>
                  <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Ver el detalle completo de probabilidades en{" "}
                    <a href="/probabilidades" className="text-[#1B4F8A] underline font-medium">/probabilidades</a>.
                  </p>
                </div>
              </div>

            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
