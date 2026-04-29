"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Props {
  vendidas: number;
  precioCaja: number;
  fechaSorteo: string | null;
  pct4: number;
}

export default function CarouselInicio({ vendidas, precioCaja, fechaSorteo, pct4 }: Props) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const TOTAL = 10_000;
  const disponibles = TOTAL - vendidas;
  const pctVendido = ((vendidas / TOTAL) * 100).toFixed(1);

  const goNext = useCallback(() => setSlide((s) => (s + 1) % 3), []);
  const goPrev = () => setSlide((s) => (s + 2) % 3);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(goNext, 5000);
    return () => clearInterval(t);
  }, [paused, goNext]);

  const fechaFormateada = fechaSorteo
    ? new Date(fechaSorteo).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
    : null;

  return (
    <div
      className="relative overflow-hidden h-72 sm:h-80 md:h-[380px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide 1: Disponibilidad ─────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          slide === 0 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(135deg,#1B4F8A 0%,#1a5fa8 55%,#0d3b6e 100%)" }}
      >
        <div className="text-center text-white px-6 w-full max-w-3xl mx-auto">
          <p className="text-white font-extrabold text-3xl md:text-5xl leading-none mb-1">
            Club 10K
          </p>
          <p className="text-[#F5A623] font-bold text-sm md:text-base mb-4">
            10,000 membresías numeradas
          </p>
          <p className="text-5xl md:text-7xl font-extrabold leading-none mb-1">
            {disponibles.toLocaleString("es-CO")}
          </p>
          <p className="text-blue-200 text-base md:text-lg mb-1">
            membresías disponibles
          </p>
          <p className="text-[#F5A623] font-bold text-sm mb-5">{pctVendido}% comprado</p>
          <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2 mb-7">
            <div
              className="bg-[#F5A623] h-2 rounded-full"
              style={{ width: `${pctVendido}%` }}
            />
          </div>
          <Link
            href="/tienda"
            className="inline-block bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-extrabold px-8 py-3 rounded-xl text-base md:text-lg transition-all shadow-lg"
          >
            Ver tienda →
          </Link>
        </div>
      </div>

      {/* ── Slide 2: Próximo sorteo ─────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          slide === 1 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(135deg,#d97706 0%,#F5A623 55%,#b45309 100%)" }}
      >
        <div className="text-center px-6 w-full max-w-3xl mx-auto">
          <p className="text-amber-900/70 text-xs font-bold uppercase tracking-widest mb-3">
            Resultado principal
          </p>
          <h2 className="text-2xl md:text-5xl font-extrabold text-[#1B4F8A] mb-3 leading-tight">
            Próximo Resultado Principal
          </h2>
          {fechaFormateada ? (
            <p className="text-[#1B4F8A]/80 text-lg md:text-xl font-semibold mb-3">
              {fechaFormateada}
            </p>
          ) : (
            <p className="text-[#1B4F8A]/60 text-lg mb-3">Fecha por confirmar</p>
          )}
          <p className="text-[#1B4F8A] font-extrabold text-xl md:text-2xl mb-6">
            Gana hasta el {Math.round(pct4 * 100)}% del recaudo
          </p>
          <a
            href="#como-funciona"
            className="inline-block bg-[#1B4F8A] hover:bg-[#0d3b6e] text-white font-extrabold px-8 py-3 rounded-xl text-base md:text-lg transition-all shadow-lg"
          >
            ¿Cómo funciona?
          </a>
        </div>
      </div>

      {/* ── Slide 3: Referidos ──────────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          slide === 2 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(135deg,#059669 0%,#10b981 55%,#0d9488 100%)" }}
      >
        <div className="text-center text-white px-6 w-full max-w-3xl mx-auto">
          <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-3">
            Programa de referidos
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-3">
            Invita amigos y gana
          </h2>
          <p className="text-emerald-100 text-lg md:text-xl mb-7">
            1 cupón gratis por cada 5 referidos que adquieran su membresía
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold px-8 py-3 rounded-xl text-base md:text-lg transition-all shadow-lg"
          >
            Mi código de referido →
          </Link>
        </div>
      </div>

      {/* ── Flecha izquierda ────────────────────── */}
      <button
        onClick={goPrev}
        aria-label="Anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/25 hover:bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all backdrop-blur-sm"
      >
        ‹
      </button>

      {/* ── Flecha derecha ──────────────────────── */}
      <button
        onClick={goNext}
        aria-label="Siguiente"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/25 hover:bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all backdrop-blur-sm"
      >
        ›
      </button>

      {/* ── Dots ────────────────────────────────── */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            aria-label={`Ir a slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === slide
                ? "bg-white w-6 h-2.5"
                : "bg-white/40 hover:bg-white/70 w-2.5 h-2.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
