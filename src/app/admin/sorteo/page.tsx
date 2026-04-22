"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

type Categoria = "CUATRO_CIFRAS" | "TRES_CIFRAS" | "DOS_CIFRAS" | "UNA_CIFRA";

interface Premio {
  id: string;
  categoria: Categoria;
  monto: number;
  pagado: boolean;
  user: { nombre: string; apellido: string; correo: string };
}

interface SorteoData {
  id: string;
  fecha: string;
  numeroGanador: string;
  estado: string;
  totalVendidas: number;
  totalRecaudo: number;
  ganancia: number;
  fondoPremios: number;
  premios: Premio[];
}

interface Resumen {
  numeroGanador: string;
  totalVendidas: number;
  totalRecaudo: number;
  ganadores4: number; ganadores3: number; ganadores2: number; ganadores1: number;
  monto4: number; monto3: number; monto2: number; monto1: number;
}

const CATEGORIA_LABELS: Record<Categoria, string> = {
  CUATRO_CIFRAS: "4 cifras exactas",
  TRES_CIFRAS: "3 últimas cifras",
  DOS_CIFRAS: "2 últimas cifras",
  UNA_CIFRA: "1 última cifra",
};

const CATEGORIA_COLORES: Record<Categoria, string> = {
  CUATRO_CIFRAS: "bg-yellow-50 border-yellow-300 text-yellow-800",
  TRES_CIFRAS: "bg-gray-50 border-gray-300 text-gray-700",
  DOS_CIFRAS: "bg-amber-50 border-amber-300 text-amber-800",
  UNA_CIFRA: "bg-blue-50 border-blue-300 text-blue-800",
};

const CATEGORIA_ICONOS: Record<Categoria, string> = {
  CUATRO_CIFRAS: "🏆",
  TRES_CIFRAS: "🥈",
  DOS_CIFRAS: "🥉",
  UNA_CIFRA: "🎁",
};

function GrupoGanadores({ categoria, premios }: { categoria: Categoria; premios: Premio[] }) {
  const [expandido, setExpandido] = useState(categoria === "CUATRO_CIFRAS");

  if (premios.length === 0) {
    return (
      <div className={`rounded-xl p-4 border ${CATEGORIA_COLORES[categoria]} opacity-50`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORIA_ICONOS[categoria]}</span>
          <div>
            <p className="font-bold">{CATEGORIA_LABELS[categoria]}</p>
            <p className="text-sm opacity-70">Sin ganadores</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${CATEGORIA_COLORES[categoria]}`}>
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORIA_ICONOS[categoria]}</span>
          <div>
            <p className="font-bold">{CATEGORIA_LABELS[categoria]}</p>
            <p className="text-sm opacity-80">
              {premios.length} ganador{premios.length !== 1 ? "es" : ""} ·{" "}
              ${premios[0].monto.toLocaleString("es-CO")} c/u
            </p>
          </div>
        </div>
        <span className="text-lg">{expandido ? "▲" : "▼"}</span>
      </button>

      {expandido && (
        <div className="border-t border-current/20 divide-y divide-current/10">
          {premios.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{p.user.nombre} {p.user.apellido}</p>
                <p className="text-xs opacity-60">{p.user.correo}</p>
              </div>
              <span className="font-bold">${p.monto.toLocaleString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSorteo() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sorteoExistente, setSorteoExistente] = useState<SorteoData | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [modo, setModo] = useState<"auto" | "manual">("auto");
  const [numeroManual, setNumeroManual] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [error, setError] = useState("");
  const [cargandoSorteo, setCargandoSorteo] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    fetch("/api/admin/sorteo")
      .then((r) => r.json())
      .then((d) => { setSorteoExistente(d.sorteo); setCargandoSorteo(false); });
  }, []);

  async function ejecutarSorteo() {
    if (modo === "manual" && !/^\d{4}$/.test(numeroManual)) {
      setError("El número ganador debe ser exactamente 4 dígitos.");
      return;
    }
    setEjecutando(true);
    setError("");

    const res = await fetch("/api/admin/sorteo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo, numeroGanador: modo === "manual" ? numeroManual : undefined }),
    });
    const json = await res.json();
    setEjecutando(false);

    if (!res.ok) {
      setError(json.mensaje);
      if (json.sorteo) setSorteoExistente(json.sorteo);
      return;
    }

    setSorteoExistente(json.sorteo);
    setResumen(json.resumen);
  }

  async function reiniciarSorteo() {
    if (!confirm("¿Seguro que quieres eliminar el sorteo actual? Esta acción no se puede deshacer.")) return;
    setReiniciando(true);
    await fetch("/api/admin/sorteo", { method: "DELETE" });
    setSorteoExistente(null);
    setResumen(null);
    setNumeroManual("");
    setError("");
    setReiniciando(false);
  }

  if (status === "loading" || cargandoSorteo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  const premiosPorCategoria = sorteoExistente
    ? (["CUATRO_CIFRAS", "TRES_CIFRAS", "DOS_CIFRAS", "UNA_CIFRA"] as Categoria[]).map((cat) => ({
        categoria: cat,
        premios: sorteoExistente.premios.filter((p) => p.categoria === cat),
      }))
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← Panel Admin
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Motor de Sorteo</h1>
              <p className="text-gray-500 text-sm">Ejecuta y gestiona el sorteo de cajas sorpresa</p>
            </div>
          </div>

          {!sorteoExistente ? (
            /* ── Formulario del sorteo ────────────────────────────────── */
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Configurar sorteo</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Modo */}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Modo de selección</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["auto", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModo(m)}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                          modo === m
                            ? "border-[#1B4F8A] bg-[#1B4F8A]/5 text-[#1B4F8A]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {m === "auto" ? "🎲 Automático" : "✍️ Manual"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {modo === "auto"
                      ? "Se elige al azar entre los números de cajas vendidas"
                      : "Ingresa el número ganador manualmente (validado 0000-9999)"}
                  </p>
                </div>

                {/* Número manual */}
                {modo === "manual" && (
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número ganador
                    </label>
                    <input
                      type="text"
                      value={numeroManual}
                      onChange={(e) => setNumeroManual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                      maxLength={4}
                      className="w-full text-center text-4xl font-extrabold tracking-widest text-[#1B4F8A] border-2 border-gray-200 rounded-xl py-4 focus:outline-none focus:border-[#1B4F8A] transition-colors"
                    />
                  </div>
                )}

                <button
                  onClick={ejecutarSorteo}
                  disabled={ejecutando || (modo === "manual" && numeroManual.length !== 4)}
                  className="w-full bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-4 rounded-xl text-lg transition-all shadow-md hover:shadow-lg"
                >
                  {ejecutando ? "Ejecutando sorteo..." : "🎯 Ejecutar sorteo"}
                </button>

                <p className="text-center text-gray-400 text-xs mt-3">
                  Esta acción es irreversible. Los premios se acreditarán automáticamente.
                </p>
              </div>

              {/* Info de premios */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Distribución de premios</h2>
                <div className="space-y-3">
                  {[
                    { label: "🏆 4 cifras exactas", pct: "35%", desc: "1 ganador máximo" },
                    { label: "🥈 3 últimas cifras", pct: "15%", desc: "Hasta 9 ganadores" },
                    { label: "🥉 2 últimas cifras", pct: "10%", desc: "Hasta 90 ganadores" },
                    { label: "🎁 1 última cifra", pct: "Devolución", desc: "Hasta 900 ganadores" },
                    { label: "🎪 Festival", pct: "40%", desc: "Gastos del evento" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <span className="font-extrabold text-[#1B4F8A]">{item.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Resultados del sorteo ────────────────────────────────── */
            <div className="space-y-6">
              {/* Número ganador */}
              <div className="bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] rounded-2xl p-8 text-white text-center">
                <p className="text-blue-200 text-sm font-medium mb-2 uppercase tracking-widest">
                  Número ganador
                </p>
                <div className="text-8xl md:text-9xl font-extrabold tracking-widest text-[#F5A623] my-4">
                  {sorteoExistente.numeroGanador}
                </div>
                <p className="text-blue-200 text-sm">
                  Sorteo ejecutado el{" "}
                  {new Date(sorteoExistente.fecha).toLocaleString("es-CO", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Cajas vendidas", valor: sorteoExistente.totalVendidas.toLocaleString("es-CO"), icono: "📦" },
                  { label: "Recaudo total", valor: `$${(sorteoExistente.totalRecaudo / 1_000_000).toFixed(2)}M`, icono: "💰" },
                  { label: "Fondo premios", valor: `$${(sorteoExistente.fondoPremios / 1_000_000).toFixed(2)}M`, icono: "🏆" },
                  { label: "Ganancia festival", valor: `$${(sorteoExistente.ganancia / 1_000_000).toFixed(2)}M`, icono: "🎪" },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                    <span className="text-2xl">{item.icono}</span>
                    <p className="text-xl font-extrabold text-[#1B4F8A] mt-1">{item.valor}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Resumen ejecutado (si recién se ejecutó) */}
              {resumen && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <h3 className="font-bold text-green-800 mb-3">✅ Sorteo ejecutado exitosamente</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: "Ganadores 4 cifras", val: resumen.ganadores4, monto: resumen.monto4 },
                      { label: "Ganadores 3 cifras", val: resumen.ganadores3, monto: resumen.monto3 },
                      { label: "Ganadores 2 cifras", val: resumen.ganadores2, monto: resumen.monto2 },
                      { label: "Ganadores 1 cifra", val: resumen.ganadores1, monto: resumen.monto1 },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-xl p-3 text-center border border-green-100">
                        <p className="text-2xl font-extrabold text-[#1B4F8A]">{item.val}</p>
                        <p className="text-gray-600 text-xs">{item.label}</p>
                        {item.val > 0 && (
                          <p className="text-green-600 text-xs font-semibold mt-0.5">
                            ${item.monto.toLocaleString("es-CO")} c/u
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de ganadores por categoría */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Ganadores por categoría
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({sorteoExistente.premios.length} total)
                  </span>
                </h2>
                <div className="space-y-3">
                  {premiosPorCategoria.map(({ categoria, premios }) => (
                    <GrupoGanadores key={categoria} categoria={categoria} premios={premios} />
                  ))}
                </div>
              </div>

              {/* Botón reiniciar (pruebas) */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <h3 className="font-bold text-red-800 mb-1">Zona de peligro</h3>
                <p className="text-red-600 text-sm mb-3">
                  Solo para pruebas. Elimina el sorteo actual y permite ejecutar uno nuevo.
                </p>
                <button
                  onClick={reiniciarSorteo}
                  disabled={reiniciando}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {reiniciando ? "Eliminando..." : "🗑️ Reiniciar sorteo"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
