"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Config {
  precioCaja:       number;
  margenGanancia:   number;
  pct4Cifras:       number;
  pct3Cifras:       number;
  pct2Cifras:       number;
  pct1Cifra:        number;
  ganadores4Cifras: number;
  fechaSorteo:      string | null;
}

function pct(v: number) { return +(v * 100).toFixed(2); }
function dec(v: number) { return +(v / 100); }

export default function PaginaConfiguracion() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje,   setMensaje]   = useState<{ ok: boolean; texto: string } | null>(null);

  // Porcentajes en UI (0-100)
  const [precioCaja,  setPrecioCaja]  = useState(10000);
  const [margen,      setMargen]      = useState(30);
  const [pct4,        setPct4]        = useState(20);
  const [pct3,        setPct3]        = useState(10);
  const [pct2,        setPct2]        = useState(15);
  const [pct1,        setPct1]        = useState(25);
  const [n4,          setN4]          = useState(4);
  const [fechaSorteo, setFechaSorteo] = useState("");

  // Validaciones en tiempo real
  const sumaPremios = pct4 + pct3 + pct2 + pct1;
  const sumaTotal   = margen + sumaPremios;
  const sumaOk      = Math.abs(sumaTotal - 100) < 0.1;
  const n4Ok        = Number.isInteger(n4) && n4 >= 1 && n4 <= 10;

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((c: Config) => {
        setPrecioCaja(c.precioCaja);
        setMargen(pct(c.margenGanancia));
        setPct4(pct(c.pct4Cifras));
        setPct3(pct(c.pct3Cifras));
        setPct2(pct(c.pct2Cifras));
        setPct1(pct(c.pct1Cifra ?? 0.25));
        setN4(c.ganadores4Cifras ?? 4);
        setFechaSorteo(
          c.fechaSorteo ? new Date(c.fechaSorteo).toISOString().slice(0, 16) : ""
        );
      })
      .finally(() => setCargando(false));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sumaOk || !n4Ok) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precioCaja,
          margenGanancia:   dec(margen),
          pct4Cifras:       dec(pct4),
          pct3Cifras:       dec(pct3),
          pct2Cifras:       dec(pct2),
          pct1Cifra:        dec(pct1),
          ganadores4Cifras: n4,
          fechaSorteo:      fechaSorteo || null,
        }),
      });
      const json = await res.json() as { mensaje: string };
      setMensaje({ ok: res.ok, texto: res.ok ? "¡Configuración guardada!" : json.mensaje });
      if (res.ok) setTimeout(() => setMensaje(null), 3000);
    } catch {
      setMensaje({ ok: false, texto: "Error de conexión. Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  if (status === "loading" || cargando) return null;

  const fondoPremiosPct = Math.max(0, 100 - margen);

  const slidersPremios = [
    { label: "Premio 4 cifras exactas 🏆", value: pct4, set: setPct4, color: "bg-yellow-400" },
    { label: "Premio 3 últimas cifras 🥈",  value: pct3, set: setPct3, color: "bg-gray-400"   },
    { label: "Premio 2 últimas cifras 🥉",  value: pct2, set: setPct2, color: "bg-amber-600"  },
    { label: "Premio 1 última cifra 🎁",    value: pct1, set: setPct1, color: "bg-blue-400"   },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Encabezado */}
          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white mb-6">
            <h1 className="text-2xl font-extrabold mb-0.5">Configuración</h1>
            <p className="text-blue-200 text-sm">Ajusta los parámetros del sorteo</p>
          </div>

          <form onSubmit={guardar} className="space-y-5">

            {/* ── Precio por caja ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">Precio por caja</h2>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">$</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={precioCaja}
                  onChange={(e) => setPrecioCaja(Number(e.target.value))}
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Recaudo estimado (10.000 cajas):{" "}
                <strong>${(precioCaja * 10000).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</strong>
              </p>
            </div>

            {/* ── Ganadores de 4 cifras ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Cantidad de ganadores de 4 cifras</h2>
              <p className="text-xs text-gray-400 mb-4">
                Se ejecutarán este número de sorteos. El último determina también los ganadores de 3, 2 y 1 cifra.
              </p>

              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={n4}
                  onChange={(e) => setN4(Math.round(Number(e.target.value)))}
                  className={`w-28 text-center text-3xl font-extrabold tracking-widest border-2 rounded-xl py-3 focus:outline-none focus:ring-2 transition-colors ${
                    n4Ok
                      ? "border-[#1B4F8A]/40 text-[#1B4F8A] focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                      : "border-red-300 text-red-600 focus:ring-red-200"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {n4Ok ? `${n4} sorteo${n4 !== 1 ? "s" : ""} de 4 cifras` : "Debe ser entre 1 y 10"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Premio 4 cifras: {pct4.toFixed(1)}% ÷ {n4} ={" "}
                    <strong>{n4Ok ? (pct4 / n4).toFixed(2) : "—"}%</strong> por ganador
                  </p>
                </div>
              </div>

              {/* Mini preview de los sorteos */}
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: Math.min(n4Ok ? n4 : 0, 10) }, (_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                      i === (n4Ok ? n4 - 1 : -1)
                        ? "bg-[#F5A623]/15 border-[#F5A623]/50 text-[#b87b00]"
                        : "bg-[#1B4F8A]/8 border-[#1B4F8A]/20 text-[#1B4F8A]"
                    }`}
                  >
                    <span>{i === (n4 - 1) ? "🏆" : "🎯"}</span>
                    Sorteo {i + 1}
                    {i === n4 - 1 && <span className="ml-1 opacity-70">(principal)</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Distribución del recaudo ──────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Distribución del recaudo</h2>
              <p className="text-xs text-gray-400 mb-5">
                Margen de operación + suma de premios = 100%
              </p>

              {/* Margen */}
              <div className="mb-6 pb-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700">Margen de operación</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={100} step={0.1} value={margen}
                      onChange={(e) => setMargen(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                    />
                    <span className="text-sm text-gray-500 w-4">%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(margen, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Fondo de premios disponible:{" "}
                  <strong className="text-[#1B4F8A]">{fondoPremiosPct.toFixed(1)}%</strong>
                </p>
              </div>

              {/* Premios */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Distribución de premios</p>
                {slidersPremios.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={100} step={0.1} value={item.value}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                        <span className="text-sm text-gray-500 w-4">%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Indicador de suma */}
              <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
                sumaOk
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <div>
                  <span>Suma premios: <strong>{sumaPremios.toFixed(1)}%</strong></span>
                  <span className="mx-2 opacity-40">|</span>
                  <span>Total: <strong>{sumaTotal.toFixed(1)}%</strong></span>
                </div>
                <span className="text-xs">{sumaOk ? "✅ Válido" : "❌ Debe ser 100%"}</span>
              </div>

              {/* Barra visual completa */}
              <div className="mt-3 w-full h-3 rounded-full overflow-hidden flex">
                {[
                  { value: margen, color: "bg-purple-400" },
                  { value: pct4,   color: "bg-yellow-400" },
                  { value: pct3,   color: "bg-gray-400"   },
                  { value: pct2,   color: "bg-amber-600"  },
                  { value: pct1,   color: "bg-blue-400"   },
                ].map((s, i) => (
                  <div key={i} className={`${s.color} h-full transition-all`} style={{ width: `${Math.max(0, s.value)}%` }} />
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400 mr-1" />Operación {margen.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 mr-1" />4 cifras {pct4.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-400 mr-1" />3 cifras {pct3.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-600 mr-1" />2 cifras {pct2.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 mr-1" />1 cifra {pct1.toFixed(1)}%</span>
              </div>

              {/* Ejemplo con precios reales */}
              <div className="mt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-2">Ejemplo con 10.000 cajas vendidas a ${precioCaja.toLocaleString("es-CO", { maximumFractionDigits: 0 })}:</p>
                <p>🎯 Premio 4 cifras (÷{n4ok(n4)}): <strong>${Math.round(precioCaja * 10000 * dec(pct4) / Math.max(n4, 1)).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                <p>🥈 Premio 3 cifras: <strong>hasta ${Math.round(precioCaja * 10000 * dec(pct3) / 9).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                <p>🥉 Premio 2 cifras: <strong>hasta ${Math.round(precioCaja * 10000 * dec(pct2) / 90).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                <p>🎁 Premio 1 cifra: <strong>hasta ${Math.round(precioCaja * 10000 * dec(pct1) / 900).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
              </div>
            </div>

            {/* ── Fecha del sorteo ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">Fecha y hora del sorteo</h2>
              <input
                type="datetime-local"
                value={fechaSorteo}
                onChange={(e) => setFechaSorteo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Se mostrará en la página de inicio y en la tienda. Deja vacío para no mostrar fecha.
              </p>
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
                mensaje.ok
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <span>{mensaje.ok ? "✅ " : "❌ "}{mensaje.texto}</span>
                <button onClick={() => setMensaje(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
              </div>
            )}

            <button
              type="submit"
              disabled={guardando || !sumaOk || !n4Ok}
              className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md text-base"
            >
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </form>

        </div>
      </main>
      <Footer />
    </div>
  );
}

function n4ok(n: number) { return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1; }
