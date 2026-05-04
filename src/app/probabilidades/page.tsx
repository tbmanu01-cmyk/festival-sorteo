"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ── Constantes del modelo ────────────────────────────────────────────────────
const TOTAL_CAJAS  = 10_000;
const PRECIO       = 50_000;
const N_SORTEOS_4C = 4;

// Ganadores exclusivos (categorías mutuamente excluyentes)
const W4   = N_SORTEOS_4C; // 4 ganadores exactos (uno por sorteo)
const W3   = 9;            // últimas 3 iguales, ≠ 4 cifras
const W2   = 90;           // últimas 2 iguales, ≠ 3-4 cifras
const W1   = 900;          // última 1 igual, ≠ 2-3-4 cifras
const W_AL = W4 + W3 + W2 + W1; // 1.003 posibles ganadores

// Premios — escenario 7.000 membresías × $50.000 = $350M recaudo
const REC  = 350_000_000;
const P4   = (REC * 0.20) / W4;   // $17.500.000 c/u
const P3   = (REC * 0.10) / W3;   // ~$3.900.000 c/u
const P2   = (REC * 0.15) / W2;   // ~$583.000  c/u
const P1   = (REC * 0.25) / W1;   // ~$97.000   c/u

// ── Funciones de cálculo ─────────────────────────────────────────────────────
function pWin(n: number, w: number) {
  return 1 - Math.pow((TOTAL_CAJAS - w) / TOTAL_CAJAS, n);
}
function pAlgo(n: number) {
  return 1 - Math.pow((TOTAL_CAJAS - W_AL) / TOTAL_CAJAS, n);
}

function fmt(n: number) { return Math.round(n).toLocaleString("es-CO"); }

function pct(p: number, dec = 2) { return (p * 100).toFixed(dec) + "%"; }

function oneIn(p: number) {
  return "1 en " + Math.round(1 / p).toLocaleString("es-CO");
}

function colorAlgo(p: number) {
  if (p >= 0.80) return "bg-green-100  text-green-800  border-green-300";
  if (p >= 0.40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return                 "bg-red-100   text-red-800   border-red-300";
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function PaginaProbabilidades() {
  const [n, setN] = useState(1);

  const calc = useMemo(() => ({
    inversion: n * PRECIO,
    retorno:   n * PRECIO * 0.70,
    p4:   pWin(n, W4),
    p3:   pWin(n, W3),
    p2:   pWin(n, W2),
    p1:   pWin(n, W1),
    algo: pAlgo(n),
  }), [n]);

  const comparativa = [1, 5, 10, 20].map((qty) => ({
    qty,
    p4:   pWin(qty, W4),
    p3:   pWin(qty, W3),
    p2:   pWin(qty, W2),
    p1:   pWin(qty, W1),
    algo: pAlgo(qty),
  }));

  const CATEGORIAS = [
    { icono: "🏆", label: "4 cifras exactas",    w: W4, prize: P4, nota: `${N_SORTEOS_4C} ganadores (1 por sorteo)` },
    { icono: "🥈", label: "3 últimas cifras",    w: W3, prize: P3, nota: "~9 ganadores exclusivos" },
    { icono: "🥉", label: "2 últimas cifras",    w: W2, prize: P2, nota: "~90 ganadores exclusivos" },
    { icono: "🎁", label: "1 última cifra",      w: W1, prize: P1, nota: "~900 ganadores exclusivos" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">

        {/* ── SECCIÓN 1: Hero ─────────────────────────────────────────────── */}
        <section
          className="py-20 px-4 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#07193a 0%,#1B4F8A 55%,#07193a 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle at 15% 50%,rgba(245,166,35,.18) 0%,transparent 45%)," +
                             "radial-gradient(circle at 85% 50%,rgba(245,166,35,.18) 0%,transparent 45%)",
          }} />
          <div className="relative max-w-5xl mx-auto">
            <span className="inline-flex items-center gap-2 border border-[#F5A623]/40 bg-[#F5A623]/10 rounded-full px-5 py-2 text-[#F5A623] text-xs font-bold uppercase tracking-widest mb-6">
              Documento para miembros
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
              Probabilidades del<br />
              <span style={{ color: "#F5A623" }}>Club 10K</span>
            </h1>
            <p className="text-blue-200 text-xl md:text-2xl font-light max-w-2xl mx-auto mb-10">
              Matemática transparente: entiende tus chances de ganar
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: "Total membresías", val: "10.000" },
                { label: "Precio por membresía", val: "$50.000 COP" },
                { label: "Sorteos de 4 cifras", val: `${N_SORTEOS_4C} sorteos` },
                { label: "Categorías de premio", val: "4 categorías" },
              ].map((x) => (
                <div key={x.label} className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center">
                  <p className="text-blue-300 text-xs mb-0.5">{x.label}</p>
                  <p className="text-white font-extrabold text-xl">{x.val}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 2: Tabla principal ──────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-[#1B4F8A] mb-2">Con 1 membresía</h2>
              <p className="text-gray-500 text-sm">Probabilidades exactas — universo de 10.000 números (0000–9999)</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1B4F8A] text-white">
                      <th className="px-6 py-4 text-left font-semibold text-sm">Categoría</th>
                      <th className="px-6 py-4 text-center font-semibold text-sm">Prob. matemática</th>
                      <th className="px-6 py-4 text-center font-semibold text-sm">Porcentaje</th>
                      <th className="px-6 py-4 text-center font-semibold text-sm">Expresado como</th>
                      <th className="px-6 py-4 text-right font-semibold text-sm">Premio aprox. *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIAS.map((row) => {
                      const p = row.w / TOTAL_CAJAS;
                      return (
                        <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{row.icono}</span>
                              <div>
                                <p className="font-bold text-gray-800">{row.label}</p>
                                <p className="text-xs text-gray-400">{row.nota}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-mono font-bold text-[#1B4F8A]">
                              {row.w} / {TOTAL_CAJAS.toLocaleString("es-CO")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] font-bold px-3 py-1 rounded-full text-sm">
                              {pct(p, p < 0.001 ? 3 : 2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-gray-700">
                            {oneIn(p)}
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-[#F5A623] text-lg">
                            ${fmt(row.prize)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fila especial: Ganar ALGO */}
                    <tr className="bg-gradient-to-r from-[#1B4F8A]/8 to-[#F5A623]/8 border-t-2 border-[#1B4F8A]/20">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✨</span>
                          <div>
                            <p className="font-extrabold text-gray-900 text-base">Ganar ALGO</p>
                            <p className="text-xs text-gray-500">Cualquier categoría de premio</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-mono font-bold text-[#1B4F8A]">
                          {W_AL.toLocaleString("es-CO")} / {TOTAL_CAJAS.toLocaleString("es-CO")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-[#1B4F8A] text-white font-bold px-3 py-1.5 rounded-full">
                          {pct(W_AL / TOTAL_CAJAS)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-[#1B4F8A]">
                        {oneIn(W_AL / TOTAL_CAJAS)}
                      </td>
                      <td className="px-6 py-5 text-right text-gray-400 text-sm">
                        Desde ${fmt(P1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
                * Premios aproximados con escenario de $350M de recaudo (7.000 membresías vendidas × $50.000).
                Las categorías son mutuamente excluyentes: ganar 3 cifras excluye ganar 4 cifras, etc.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 3: Comparativa ──────────────────────────────────────── */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-[#1B4F8A] mb-2">Más membresías, más chances</h2>
              <p className="text-gray-500 text-sm">Cómo escalan las probabilidades al adquirir múltiples membresías</p>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-100">
              <table className="w-full bg-white">
                <thead>
                  <tr className="bg-[#1B4F8A] text-white text-sm">
                    <th className="px-5 py-4 text-left font-semibold">Membresías</th>
                    <th className="px-5 py-4 text-center font-semibold">🏆 4 cifras</th>
                    <th className="px-5 py-4 text-center font-semibold">🥈 3 cifras</th>
                    <th className="px-5 py-4 text-center font-semibold">🥉 2 cifras</th>
                    <th className="px-5 py-4 text-center font-semibold">🎁 1 cifra</th>
                    <th className="px-5 py-4 text-center font-semibold">✨ Ganar ALGO</th>
                    <th className="px-5 py-4 text-right font-semibold">Inversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparativa.map((row) => (
                    <tr key={row.qty} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="bg-[#1B4F8A] text-white text-sm font-extrabold w-9 h-9 rounded-full inline-flex items-center justify-center mr-2">
                          {row.qty}
                        </span>
                        <span className="text-gray-500 text-sm">membresía{row.qty !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-gray-700 text-sm">
                        {pct(row.p4, row.p4 < 0.01 ? 3 : 2)}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-gray-700 text-sm">
                        {pct(row.p3, row.p3 < 0.01 ? 3 : 2)}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-gray-700 text-sm">
                        {pct(row.p2, 2)}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-gray-700 text-sm">
                        {pct(row.p1, 1)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-extrabold text-sm px-3 py-1.5 rounded-xl border ${colorAlgo(row.algo)}`}>
                          {pct(row.algo, 1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-800">
                        ${fmt(row.qty * PRECIO)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Menor al 40%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> Entre 40% y 80%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Mayor al 80%
              </span>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 4: Calculadora ──────────────────────────────────────── */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-[#1B4F8A] mb-2">Calculadora interactiva</h2>
              <p className="text-gray-500 text-sm">Ajusta el número de membresías y ve tus probabilidades en tiempo real</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {/* Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  ¿Cuántas membresías planeas adquirir?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={1} max={100} value={n}
                    onChange={(e) => setN(Number(e.target.value))}
                    className="flex-1 h-2 accent-[#1B4F8A]"
                  />
                  <input
                    type="number" min={1} max={100} value={n}
                    onChange={(e) => setN(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-24 text-center text-3xl font-extrabold text-[#1B4F8A] border-2 border-[#1B4F8A]/20 rounded-xl py-2 focus:outline-none focus:border-[#1B4F8A] transition-colors"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                  <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>

              {/* Inversión / Retorno */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#1B4F8A]/5 border border-[#1B4F8A]/10 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Inversión total</p>
                  <p className="text-3xl font-extrabold text-[#1B4F8A]">${fmt(calc.inversion)}</p>
                  <p className="text-xs text-gray-400 mt-1">{n} × $50.000</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Retorno esperado en premios</p>
                  <p className="text-3xl font-extrabold text-green-600">${fmt(calc.retorno)}</p>
                  <p className="text-xs text-gray-400 mt-1">70% del recaudo → premios</p>
                </div>
              </div>

              {/* Prob por categoría */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "🏆 4 cifras exactas",  p: calc.p4, dec: calc.p4 < 0.005 ? 3 : 1 },
                  { label: "🥈 3 últimas cifras",   p: calc.p3, dec: calc.p3 < 0.005 ? 3 : 1 },
                  { label: "🥉 2 últimas cifras",   p: calc.p2, dec: 2 },
                  { label: "🎁 1 última cifra",     p: calc.p1, dec: 1 },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{item.label}</p>
                    <p className="text-2xl font-extrabold text-[#1B4F8A]">{pct(item.p, item.dec)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{oneIn(item.p)}</p>
                  </div>
                ))}
              </div>

              {/* Ganar ALGO */}
              <div className={`rounded-xl p-5 border-2 ${colorAlgo(calc.algo)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-extrabold text-lg">✨ Ganar ALGO</p>
                    <p className="text-sm opacity-70">
                      Con {n} membresía{n !== 1 ? "s" : ""} · Cualquier categoría
                    </p>
                  </div>
                  <p className="text-5xl font-extrabold tabular-nums">{pct(calc.algo, 1)}</p>
                </div>
                <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-current rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, calc.algo * 100).toFixed(1)}%`, opacity: 0.55 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 5: ¿Por qué es atractivo? ──────────────────────────── */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-[#1B4F8A] mb-2">¿Por qué es atractivo?</h2>
              <p className="text-gray-500 text-sm">Escala de participación diseñada para todos los perfiles</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  qty: "×1", n: 1,
                  title: "Participación base",
                  desc: "1 de cada 10 miembros gana algún premio. Con una sola membresía existe la posibilidad real de multiplicar tu inversión hasta 350 veces con el gran premio de 4 cifras.",
                  tag: "Entrada al club", tagBg: "bg-gray-100 text-gray-700",
                  border: "border-gray-200",
                },
                {
                  qty: "×5", n: 5,
                  title: "Participación activa",
                  desc: "Casi 4 de cada 10 participantes ganan algo. Alta probabilidad de recuperar tu inversión vía el premio de 1 última cifra, con potencial de ganar mucho más.",
                  tag: "Recomendado", tagBg: "bg-yellow-100 text-yellow-800",
                  border: "border-yellow-300",
                },
                {
                  qty: "×10", n: 10,
                  title: "Participación VIP",
                  desc: "2 de cada 3 participantes ganan algún premio. Acceso al Club VIP con sorteos exclusivos, atención preferencial y beneficios adicionales del Club.",
                  tag: "Club VIP", tagBg: "bg-blue-100 text-blue-800",
                  border: "border-blue-300",
                },
                {
                  qty: "×20", n: 20,
                  title: "Participación premium",
                  desc: "Más de 8 de cada 10 participantes en esta categoría ganan al menos un premio. El nivel de mayor seguridad estadística dentro del Club.",
                  tag: "Premium", tagBg: "bg-green-100 text-green-800",
                  border: "border-green-300",
                },
              ].map((item) => (
                <div key={item.qty} className={`rounded-2xl border-2 ${item.border} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#1B4F8A] rounded-xl flex items-center justify-center text-[#F5A623] font-extrabold text-lg">
                      {item.qty}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.tagBg}`}>{item.tag}</span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg mb-1">{item.title}</h3>
                  <p className="text-4xl font-extrabold text-[#1B4F8A] mb-2 tabular-nums">
                    {pct(pAlgo(item.n), 0)}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    probabilidad de ganar algo · inversión ${fmt(item.n * PRECIO)} COP
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Final ───────────────────────────────────────────────────── */}
        <section
          className="py-20 px-4 text-center"
          style={{ background: "linear-gradient(135deg,#07193a 0%,#1B4F8A 100%)" }}
        >
          <div className="max-w-2xl mx-auto">
            <p className="text-[#F5A623] text-xs font-bold uppercase tracking-widest mb-4">¿Listo para participar?</p>
            <h2 className="text-4xl font-extrabold text-white mb-4">
              Adquiere tu membresía ahora
            </h2>
            <p className="text-blue-200 mb-8 text-lg">
              10.000 números disponibles. Tu caja sorpresa te espera.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/registro"
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-extrabold px-8 py-4 rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl"
              >
                Registrarse gratis →
              </Link>
              <Link
                href="/#como-funciona"
                className="border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all"
              >
                ¿Cómo funciona?
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
