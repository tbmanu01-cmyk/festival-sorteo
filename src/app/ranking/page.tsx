"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface RankEntry {
  posicion: number;
  nombre: string;
  apellido: string;
  ciudad: string;
  totalCajas: number;
  esStar: boolean;
}

// "Luisa" → "Lui***" | "Suárez García" → "Suá***"
function mask(s: string): string {
  return s.split(" ")[0].slice(0, 3) + "***";
}

function nombreOculto(entry: RankEntry): string {
  return `${mask(entry.nombre)} ${mask(entry.apellido)}`;
}

const MEDALLAS = ["🥇", "🥈", "🥉"];

function TarjetaRanking({ entry }: { entry: RankEntry }) {
  const esPodio = entry.posicion <= 3;
  const medalla = esPodio ? MEDALLAS[entry.posicion - 1] : null;

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
        esPodio ? "bg-gradient-to-r from-[#F5A623]/5 to-transparent" : "hover:bg-gray-50"
      }`}
    >
      {/* Posición */}
      <div className="w-10 flex-shrink-0 text-center">
        {medalla ? (
          <span className="text-2xl">{medalla}</span>
        ) : (
          <span className="text-sm font-bold text-gray-400">#{entry.posicion}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-bold truncate ${esPodio ? "text-gray-900 text-base" : "text-gray-800 text-sm"}`}>
            {nombreOculto(entry)}
          </p>
          {entry.esStar && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
              ⭐ VIP
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-0.5">{entry.ciudad}</p>
      </div>

      {/* Cajas */}
      <div className="text-right flex-shrink-0">
        <p className={`font-extrabold ${esPodio ? "text-[#1B4F8A] text-lg" : "text-gray-700 text-sm"}`}>
          {entry.totalCajas}
        </p>
        <p className="text-gray-400 text-xs">{entry.totalCajas === 1 ? "membresía" : "membresías"}</p>
      </div>
    </div>
  );
}

export default function PaginaRanking() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  async function cargar() {
    const res = await fetch("/api/ranking");
    if (res.ok) {
      const json = await res.json();
      setRanking(json.ranking ?? []);
      setUltimaActualizacion(new Date());
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, []);

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Encabezado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                ← Inicio
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold text-[#1B4F8A]">Ranking de miembros</h1>
            <p className="text-gray-500 text-sm mt-2">Top 20 miembros con más membresías</p>
            {ultimaActualizacion && (
              <p className="text-gray-300 text-xs mt-1">
                Actualizado: {ultimaActualizacion.toLocaleTimeString("es-CO", { timeStyle: "short" })}
              </p>
            )}
          </div>

          {cargando ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <p className="text-gray-400 text-sm">Cargando ranking...</p>
            </div>
          ) : ranking.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-gray-500 text-sm">Aún no hay compradores en el ranking.</p>
              <Link
                href="/tienda"
                className="inline-block mt-4 bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-md"
              >
                ¡Sé el primero!
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podio visual top 3 */}
              {podio.length > 0 && (
                <div className="bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] rounded-2xl p-6 text-white">
                  <p className="text-center text-[#F5A623] font-bold text-xs uppercase tracking-widest mb-5">
                    Podio de honor
                  </p>
                  <div className="flex items-end justify-center gap-4">
                    {/* 2° lugar */}
                    {podio[1] && (
                      <div className="flex flex-col items-center text-center w-24">
                        <span className="text-3xl mb-2">🥈</span>
                        <div className="bg-white/10 rounded-xl px-3 py-3 w-full h-24 flex flex-col items-center justify-center">
                          <p className="font-extrabold text-sm leading-tight whitespace-nowrap">{nombreOculto(podio[1])}</p>
                          <p className="text-blue-200 text-xs mt-1">{podio[1].totalCajas} membresías</p>
                        </div>
                      </div>
                    )}
                    {/* 1° lugar */}
                    {podio[0] && (
                      <div className="flex flex-col items-center text-center w-28">
                        <span className="text-4xl mb-2">🥇</span>
                        <div className="bg-[#F5A623]/20 border border-[#F5A623]/40 rounded-xl px-3 py-4 w-full h-32 flex flex-col items-center justify-center">
                          <p className="font-extrabold text-base leading-tight whitespace-nowrap">{nombreOculto(podio[0])}</p>
                          <p className="text-[#F5A623] font-bold text-sm mt-1">{podio[0].totalCajas} membresías</p>
                          <p className="text-blue-300 text-xs mt-0.5">{podio[0].ciudad}</p>
                        </div>
                      </div>
                    )}
                    {/* 3° lugar */}
                    {podio[2] && (
                      <div className="flex flex-col items-center text-center w-24">
                        <span className="text-3xl mb-2">🥉</span>
                        <div className="bg-white/10 rounded-xl px-3 py-3 w-full h-20 flex flex-col items-center justify-center">
                          <p className="font-extrabold text-sm leading-tight whitespace-nowrap">{nombreOculto(podio[2])}</p>
                          <p className="text-blue-200 text-xs mt-1">{podio[2].totalCajas} membresías</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lista completa */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Clasificación completa</p>
                  <p className="text-xs text-gray-400">Top {ranking.length}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {ranking.map((entry) => (
                    <TarjetaRanking key={entry.posicion} entry={entry} />
                  ))}
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-4 text-xs text-gray-400 justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold text-[10px]">⭐ VIP</span>
                  10+ membresías adquiridas
                </span>
                <span>·</span>
                <span>Se actualiza cada 30 segundos</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
