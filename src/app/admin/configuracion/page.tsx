"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Config {
  precioCaja: number;
  margenGanancia: number;
  pct4Cifras: number;
  pct3Cifras: number;
  pct2Cifras: number;
  fechaSorteo: string | null;
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

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  // Formulario (guardamos porcentajes como 0-100 en la UI, convertimos antes de enviar)
  const [precioCaja, setPrecioCaja]         = useState(10000);
  const [margen, setMargen]                 = useState(40);
  const [pct4, setPct4]                     = useState(35);
  const [pct3, setPct3]                     = useState(15);
  const [pct2, setPct2]                     = useState(10);
  const [fechaSorteo, setFechaSorteo]       = useState("");

  // Suma para validar en tiempo real (1-cifra = devolución, no tiene % configurable)
  const suma = margen + pct4 + pct3 + pct2;
  const sumaOk = Math.abs(suma - 100) < 0.1;

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((c: Config) => {
        setPrecioCaja(c.precioCaja);
        setMargen(pct(c.margenGanancia));
        setPct4(pct(c.pct4Cifras));
        setPct3(pct(c.pct3Cifras));
        setPct2(pct(c.pct2Cifras));
        setFechaSorteo(
          c.fechaSorteo ? new Date(c.fechaSorteo).toISOString().slice(0, 16) : ""
        );
      })
      .finally(() => setCargando(false));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sumaOk) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precioCaja,
          margenGanancia: dec(margen),
          pct4Cifras: dec(pct4),
          pct3Cifras: dec(pct3),
          pct2Cifras: dec(pct2),
          fechaSorteo: fechaSorteo || null,
        }),
      });
      const json = await res.json() as { mensaje: string };
      const ok = res.ok;
      setMensaje({ ok, texto: ok ? "¡Configuración guardada!" : json.mensaje });
      if (ok) setTimeout(() => setMensaje(null), 3000);
    } catch {
      setMensaje({ ok: false, texto: "Error de conexión. Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  if (status === "loading" || cargando) return null;

  const pct1 = Math.max(0, 100 - suma);

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

            {/* Precio por caja */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">Precio por caja</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Valor en COP
                </label>
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
                  Recaudo estimado (10.000 cajas): <strong>${(precioCaja * 10000).toLocaleString("es-CO")} COP</strong>
                </p>
              </div>
            </div>

            {/* Distribución de premios */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Distribución del recaudo</h2>
              <p className="text-xs text-gray-400 mb-4">La suma debe ser exactamente 100%.</p>

              <div className="space-y-4">
                {[
                  { label: "Margen del festival", value: margen, set: setMargen, color: "bg-purple-400" },
                  { label: "Premio 4 cifras exactas 🏆", value: pct4,  set: setPct4,  color: "bg-yellow-400" },
                  { label: "Premio 3 últimas cifras 🥈",  value: pct3,  set: setPct3,  color: "bg-gray-400" },
                  { label: "Premio 2 últimas cifras 🥉",  value: pct2,  set: setPct2,  color: "bg-amber-600" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={item.value}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                        <span className="text-sm text-gray-500 w-4">%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(item.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* 1 cifra — no configurable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-500">Devolución 1 cifra 🎁 (fijo = precio por caja)</label>
                    <span className="text-sm font-bold text-[#1B4F8A]">${precioCaja.toLocaleString("es-CO")}</span>
                  </div>
                </div>
              </div>

              {/* Indicador de suma */}
              <div className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between ${sumaOk ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                <span>Suma actual: <strong>{suma.toFixed(1)}%</strong></span>
                <span className="text-xs">{sumaOk ? "✅ Válido" : "❌ Debe ser 100%"}</span>
              </div>

              {/* Barra visual */}
              <div className="mt-3 w-full h-3 rounded-full overflow-hidden flex">
                {[
                  { value: margen, color: "bg-purple-400" },
                  { value: pct4,   color: "bg-yellow-400" },
                  { value: pct3,   color: "bg-gray-400" },
                  { value: pct2,   color: "bg-amber-600" },
                  { value: pct1,   color: "bg-blue-300" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`${s.color} h-full transition-all`}
                    style={{ width: `${Math.max(0, s.value)}%` }}
                  />
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400 mr-1" />Festival {margen.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 mr-1" />4 cifras {pct4.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-400 mr-1" />3 cifras {pct3.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-600 mr-1" />2 cifras {pct2.toFixed(1)}%</span>
              </div>
            </div>

            {/* Fecha del sorteo */}
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

            {/* Mensaje de respuesta */}
            {mensaje && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${mensaje.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                <span>{mensaje.ok ? "✅ " : "❌ "}{mensaje.texto}</span>
                <button onClick={() => setMensaje(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
              </div>
            )}

            {/* Botón guardar */}
            <button
              type="submit"
              disabled={guardando || !sumaOk}
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
