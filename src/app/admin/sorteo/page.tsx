"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RuletaSorteo from "@/components/RuletaSorteo";
import Link from "next/link";

type Categoria = "CUATRO_CIFRAS" | "TRES_CIFRAS" | "DOS_CIFRAS" | "UNA_CIFRA";
type OverlayFase = "girando" | "revelando" | "final";

interface Premio {
  id: string;
  categoria: Categoria;
  monto: number;
  pagado: boolean;
  numeroCaja: string | null;
  user: { nombre: string; apellido: string; correo: string };
}

interface SorteoData {
  id: string;
  fecha: string;
  numeroGanador: string;
  numerosGanadores: string[] | null;
  estado: string;
  totalVendidas: number;
  totalRecaudo: number;
  ganancia: number;
  fondoPremios: number;
  premios: Premio[];
}

interface Resumen {
  numerosGanadores: string[];
  numeroGanador: string;
  totalVendidas: number;
  totalRecaudo: number;
  ganadores4: number; ganadores3: number; ganadores2: number; ganadores1: number;
  monto4: number; monto3: number; monto2: number; monto1: number;
}

const CATEGORIA_LABELS: Record<Categoria, string> = {
  CUATRO_CIFRAS: "4 cifras exactas",
  TRES_CIFRAS:   "3 últimas cifras",
  DOS_CIFRAS:    "2 últimas cifras",
  UNA_CIFRA:     "1 última cifra",
};

const CATEGORIA_COLORES: Record<Categoria, string> = {
  CUATRO_CIFRAS: "bg-yellow-50 border-yellow-300 text-yellow-800",
  TRES_CIFRAS:   "bg-gray-50 border-gray-300 text-gray-700",
  DOS_CIFRAS:    "bg-amber-50 border-amber-300 text-amber-800",
  UNA_CIFRA:     "bg-blue-50 border-blue-300 text-blue-800",
};

const CATEGORIA_ICONOS: Record<Categoria, string> = {
  CUATRO_CIFRAS: "🏆",
  TRES_CIFRAS:   "🥈",
  DOS_CIFRAS:    "🥉",
  UNA_CIFRA:     "🎁",
};

// ── Grupo de ganadores colapsable ──────────────────────────────────────────

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
              {premios.length} ganador{premios.length !== 1 ? "es" : ""} · ${premios[0].monto.toLocaleString("es-CO")} c/u
            </p>
          </div>
        </div>
        <span className="text-lg">{expandido ? "▲" : "▼"}</span>
      </button>
      {expandido && (
        <div className="border-t border-current/20 divide-y divide-current/10">
          {premios.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.user.nombre} {p.user.apellido}</p>
                <p className="text-xs opacity-60 truncate">{p.user.correo}</p>
              </div>
              <div className="text-right shrink-0">
                {p.numeroCaja && (
                  <p className="font-extrabold text-base leading-tight"
                    style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.12em" }}>
                    {p.numeroCaja}
                  </p>
                )}
                <p className="text-xs opacity-70 font-semibold">${p.monto.toLocaleString("es-CO")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function AdminSorteo() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sorteoExistente, setSorteoExistente] = useState<SorteoData | null>(null);
  const [resumen,         setResumen]         = useState<Resumen | null>(null);
  const [modo,            setModo]            = useState<"auto" | "manual">("auto");
  const [numeroManual,    setNumeroManual]     = useState("");
  const [ejecutando,      setEjecutando]      = useState(false);
  const [reiniciando,     setReiniciando]     = useState(false);
  const [error,           setError]           = useState("");
  const [cargandoSorteo,  setCargandoSorteo]  = useState(true);
  const [n4Config,        setN4Config]        = useState(4); // ganadores4Cifras de config

  // Estado del overlay multi-ronda
  const [overlayActivo,     setOverlayActivo]     = useState(false);
  const [numerosAnimacion,  setNumerosAnimacion]  = useState<string[]>([]);
  const [roundIndex,        setRoundIndex]        = useState(0);
  const [overlayFase,       setOverlayFase]       = useState<OverlayFase>("girando");
  const [modoDemo,          setModoDemo]          = useState(false);
  const [pendienteJSON,     setPendienteJSON]     = useState<{ sorteo: SorteoData; resumen: Resumen } | null>(null);

  // Autenticación
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Cargar sorteo existente y config
  useEffect(() => {
    fetch("/api/admin/sorteo")
      .then((r) => r.json())
      .then((d) => { setSorteoExistente(d.sorteo); setCargandoSorteo(false); });

    fetch("/api/admin/config")
      .then((r) => r.ok ? r.json() : null)
      .then((c) => { if (c?.ganadores4Cifras) setN4Config(c.ganadores4Cifras); });
  }, []);

  // ── Ejecutar sorteo real ─────────────────────────────────────────────────

  async function ejecutarSorteo() {
    if (modo === "manual" && !/^\d{4}$/.test(numeroManual)) {
      setError("El número ganador debe ser exactamente 4 dígitos.");
      return;
    }
    setEjecutando(true);
    setError("");

    try {
      const res = await fetch("/api/admin/sorteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, numeroGanador: modo === "manual" ? numeroManual : undefined }),
      });

      let json: Record<string, unknown>;
      try {
        json = await res.json();
      } catch {
        throw new Error("El servidor no respondió correctamente.");
      }

      if (!res.ok) {
        setError((json.mensaje as string) ?? "Error desconocido.");
        if (json.sorteo) setSorteoExistente(json.sorteo as SorteoData);
        return;
      }

      const nums = (json.numerosGanadores as string[]) ?? [(json.sorteo as SorteoData).numeroGanador];
      setPendienteJSON({ sorteo: json.sorteo as SorteoData, resumen: json.resumen as Resumen });
      iniciarOverlay(nums, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setEjecutando(false);
    }
  }

  // ── Demo ─────────────────────────────────────────────────────────────────

  function verDemo() {
    const nums = Array.from({ length: n4Config }, () =>
      String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    );
    iniciarOverlay(nums, true);
  }

  // ── Helpers del overlay ──────────────────────────────────────────────────

  function iniciarOverlay(nums: string[], esDemo: boolean) {
    setNumerosAnimacion(nums);
    setRoundIndex(0);
    setOverlayFase("girando");
    setModoDemo(esDemo);
    setOverlayActivo(true);
  }

  function handleAnimTerminada() {
    setOverlayFase("revelando");
  }

  function avanzarRound() {
    if (roundIndex < numerosAnimacion.length - 1) {
      setRoundIndex((i) => i + 1);
      setOverlayFase("girando");
    } else {
      setOverlayFase("final");
    }
  }

  function cerrarOverlay() {
    setOverlayActivo(false);
    setOverlayFase("girando");
    setRoundIndex(0);
    if (!modoDemo && pendienteJSON) {
      setSorteoExistente({
        ...pendienteJSON.sorteo,
        numerosGanadores: pendienteJSON.resumen.numerosGanadores,
      });
      setResumen(pendienteJSON.resumen);
      setPendienteJSON(null);
    }
  }

  // ── Reiniciar sorteo ─────────────────────────────────────────────────────

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

  // Números ganadores del sorteo existente (soporte sorteos viejos con un solo número)
  const numerosGanadoresExistente: string[] =
    sorteoExistente?.numerosGanadores
      ? (sorteoExistente.numerosGanadores as string[])
      : sorteoExistente?.numeroGanador
      ? [sorteoExistente.numeroGanador]
      : [];

  // Número actual en animación
  const numActual = numerosAnimacion[roundIndex] ?? "0000";
  const esUltimoRound = roundIndex === numerosAnimacion.length - 1;
  const totalRounds = numerosAnimacion.length;

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
              <p className="text-gray-500 text-sm">
                {n4Config} sorteo{n4Config !== 1 ? "s" : ""} de 4 cifras · ejecuta y gestiona el sorteo principal
              </p>
            </div>
          </div>

          {!sorteoExistente ? (
            /* ── Formulario del sorteo ──────────────────────────────── */
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Configurar sorteo</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Info de rondas */}
                <div className="bg-[#1B4F8A]/5 border border-[#1B4F8A]/15 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-[#1B4F8A] uppercase tracking-wider mb-2">
                    🎯 {n4Config} sorteo{n4Config !== 1 ? "s" : ""} configurados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: n4Config }, (_, i) => (
                      <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        i === n4Config - 1
                          ? "bg-[#F5A623]/20 text-[#b87b00]"
                          : "bg-[#1B4F8A]/10 text-[#1B4F8A]"
                      }`}>
                        Sorteo {i + 1}{i === n4Config - 1 ? " ⭐" : ""}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    El último sorteo determina también los ganadores de 3, 2 y 1 cifra.
                  </p>
                </div>

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
                      ? "Todos los sorteos se eligen al azar entre cajas vendidas."
                      : `Los primeros ${Math.max(n4Config - 1, 0)} sorteos son automáticos. El último (principal) usa el número ingresado.`}
                  </p>
                </div>

                {/* Número manual */}
                {modo === "manual" && (
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número del sorteo principal (último)
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
                  className="w-full bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-4 rounded-xl text-lg transition-all shadow-md hover:shadow-lg mb-3"
                >
                  {ejecutando ? "⏳ Procesando..." : `🎯 Ejecutar ${n4Config} sorteo${n4Config !== 1 ? "s" : ""}`}
                </button>

                <button
                  onClick={verDemo}
                  disabled={ejecutando}
                  className="w-full border-2 border-[#1B4F8A] text-[#1B4F8A] hover:bg-[#1B4F8A]/5 font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  🎬 Ver demo de animación
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
                    { label: `🏆 4 cifras × ${n4Config}`,  desc: `${n4Config} sorteo${n4Config !== 1 ? "s" : ""} independientes` },
                    { label: "🥈 3 últimas cifras",         desc: "Último sorteo — hasta 9 ganadores" },
                    { label: "🥉 2 últimas cifras",         desc: "Último sorteo — hasta 90 ganadores" },
                    { label: "🎁 1 última cifra",           desc: "Último sorteo — hasta 900 ganadores" },
                    { label: "🎪 Operación",                desc: "Gastos del evento" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview de la animación */}
                <div className="mt-6 rounded-xl overflow-hidden border border-gray-100">
                  <div className="py-4 px-3 text-center" style={{ background: "linear-gradient(145deg,#04070e,#0b1929,#04070e)" }}>
                    <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#F5A623", letterSpacing: "3px" }}>
                      ✨ Vista previa ✨
                    </p>
                    <div className="flex gap-2 justify-center mb-2">
                      {["?", "?", "?", "?"].map((d, i) => (
                        <div key={i} style={{
                          width: "44px", height: "56px", borderRadius: "10px",
                          background: "linear-gradient(180deg,#0b1929,#050d18)",
                          border: "1.5px solid #122035",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "28px", fontWeight: 900,
                          fontFamily: "'Courier New',monospace",
                          color: "#243d5c",
                        }}>{d}</div>
                      ))}
                    </div>
                    <p className="text-xs mb-3" style={{ color: "#4a90d9" }}>
                      {n4Config} sorteo{n4Config !== 1 ? "s" : ""} · uno tras otro
                    </p>
                    <p className="text-xs" style={{ color: "#243d5c" }}>
                      Presiona "Ver demo" para previsualizar
                    </p>
                  </div>
                </div>
              </div>
            </div>

          ) : (
            /* ── Resultados del sorteo ──────────────────────────────── */
            <div className="space-y-6">

              {/* Números ganadores de 4 cifras */}
              <div className="bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] rounded-2xl p-8 text-white">
                <p className="text-blue-200 text-sm font-medium mb-4 uppercase tracking-widest text-center">
                  {numerosGanadoresExistente.length > 1
                    ? `${numerosGanadoresExistente.length} números ganadores de 4 cifras`
                    : "Número ganador"}
                </p>

                {/* Grid de números */}
                <div className={`grid gap-4 mb-4 ${
                  numerosGanadoresExistente.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
                  numerosGanadoresExistente.length <= 4 ? "grid-cols-2" :
                  "grid-cols-3"
                }`}>
                  {numerosGanadoresExistente.map((num, i) => (
                    <div key={i} className="text-center">
                      <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">
                        {numerosGanadoresExistente.length > 1
                          ? (i === numerosGanadoresExistente.length - 1 ? "⭐ Sorteo principal" : `Sorteo ${i + 1}`)
                          : "Número ganador"}
                      </p>
                      <div
                        className="font-extrabold text-[#F5A623]"
                        style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: numerosGanadoresExistente.length > 2 ? "clamp(36px,8vw,60px)" : "clamp(48px,10vw,80px)",
                          letterSpacing: "0.2em",
                          textShadow: "0 0 40px rgba(245,166,35,0.7)",
                        }}
                      >
                        {num}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-blue-200 text-sm text-center">
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
                  { label: "Recaudo total",  valor: `$${(sorteoExistente.totalRecaudo / 1_000_000).toFixed(2)}M`, icono: "💰" },
                  { label: "Fondo premios",  valor: `$${(sorteoExistente.fondoPremios / 1_000_000).toFixed(2)}M`, icono: "🏆" },
                  { label: "Ganancia",       valor: `$${(sorteoExistente.ganancia / 1_000_000).toFixed(2)}M`,    icono: "🎪" },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                    <span className="text-2xl">{item.icono}</span>
                    <p className="text-xl font-extrabold text-[#1B4F8A] mt-1">{item.valor}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Resumen recién ejecutado */}
              {resumen && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <h3 className="font-bold text-green-800 mb-3">✅ Sorteo ejecutado exitosamente</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: "Ganadores 4 cifras", val: resumen.ganadores4, monto: resumen.monto4 },
                      { label: "Ganadores 3 cifras", val: resumen.ganadores3, monto: resumen.monto3 },
                      { label: "Ganadores 2 cifras", val: resumen.ganadores2, monto: resumen.monto2 },
                      { label: "Ganadores 1 cifra",  val: resumen.ganadores1, monto: resumen.monto1 },
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

              {/* Ganadores por categoría */}
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

              {/* Zona de peligro */}
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

      {/* ── Overlay multi-ronda ─────────────────────────────────────────── */}
      {overlayActivo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}>
          <div style={{ maxWidth: "520px", width: "100%" }}>

            {/* Badge de ronda */}
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              {modoDemo ? (
                <span style={badgeStyle("#1B4F8A", "rgba(27,79,138,0.4)")}>
                  Modo demo — sin sorteo real
                </span>
              ) : (
                <span style={badgeStyle("#F5A623", "rgba(245,166,35,0.15)")}>
                  🎯 Sorteo {roundIndex + 1} de {totalRounds}
                  {roundIndex === totalRounds - 1 ? " — Principal ⭐" : ""}
                </span>
              )}
            </div>

            {/* ── FASE: girando ────────────────────────────────────────── */}
            {overlayFase === "girando" && (
              <>
                <RuletaSorteo
                  numeroGanador={numActual}
                  activo={true}
                  onTerminado={handleAnimTerminada}
                />
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <button onClick={cerrarOverlay} style={btnSaltarStyle}>
                    Saltar animación
                  </button>
                </div>
              </>
            )}

            {/* ── FASE: revelando ──────────────────────────────────────── */}
            {overlayFase === "revelando" && (
              <div style={{
                background: "linear-gradient(145deg,#04070e,#0b1929,#04070e)",
                borderRadius: "24px",
                padding: "40px 24px",
                textAlign: "center",
                border: "1px solid rgba(245,166,35,0.3)",
              }}>
                {/* Luces decorativas */}
                <div style={{ position: "relative" }}>
                  <p style={{
                    color: "#4a90d9", fontSize: "13px", fontWeight: 600,
                    letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px",
                  }}>
                    {roundIndex === totalRounds - 1 ? "Sorteo principal" : `Sorteo ${roundIndex + 1}`}
                  </p>
                  <p style={{
                    color: "#F5A623", fontSize: "11px", fontWeight: 700,
                    letterSpacing: "3px", textTransform: "uppercase", marginBottom: "20px",
                    textShadow: "0 0 20px rgba(245,166,35,0.6)",
                  }}>
                    ✨ Número ganador ✨
                  </p>

                  <div style={{
                    fontSize: "clamp(64px,16vw,100px)",
                    fontWeight: 900,
                    color: "#F5A623",
                    fontFamily: "'Courier New', Courier, monospace",
                    letterSpacing: "0.22em",
                    textShadow: "0 0 60px rgba(245,166,35,0.9), 0 0 120px rgba(245,166,35,0.4)",
                    lineHeight: 1,
                    marginBottom: "24px",
                    animation: "revealNumber 0.5s cubic-bezier(0.175,0.885,0.32,1.275)",
                  }}>
                    {numActual}
                  </div>

                  {/* Números anteriores */}
                  {roundIndex > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <p style={{ color: "#4a90d9", fontSize: "11px", fontWeight: 600, letterSpacing: "2px", marginBottom: "8px" }}>
                        SORTEOS ANTERIORES
                      </p>
                      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "8px" }}>
                        {numerosAnimacion.slice(0, roundIndex).map((n, i) => (
                          <span key={i} style={{
                            fontFamily: "'Courier New', monospace",
                            color: "#d4e4f4", fontWeight: 700, fontSize: "18px",
                            background: "rgba(27,79,138,0.25)",
                            border: "1px solid rgba(27,79,138,0.4)",
                            borderRadius: "8px", padding: "4px 10px",
                          }}>
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={avanzarRound}
                    style={{
                      background: "#F5A623", color: "#1B4F8A",
                      border: "none", borderRadius: "14px",
                      padding: "14px 36px", fontSize: "16px",
                      fontWeight: 900, cursor: "pointer",
                      boxShadow: "0 4px 24px rgba(245,166,35,0.55)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {esUltimoRound
                      ? (modoDemo ? "Ver resumen →" : "Ver resultados finales →")
                      : `Sorteo ${roundIndex + 2} →`}
                  </button>
                </div>
              </div>
            )}

            {/* ── FASE: final ──────────────────────────────────────────── */}
            {overlayFase === "final" && (
              <div style={{ textAlign: "center" }}>
                {/* Header */}
                <p style={{
                  color: "#F5A623", fontWeight: 900, fontSize: "13px",
                  letterSpacing: "3px", textTransform: "uppercase",
                  textShadow: "0 0 20px rgba(245,166,35,0.6)",
                  marginBottom: "20px",
                }}>
                  ✨ Todos los números ganadores ✨
                </p>

                {/* Grid de números */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: numerosAnimacion.length <= 2 ? "1fr 1fr" :
                                       numerosAnimacion.length <= 4 ? "1fr 1fr" : "1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "24px",
                }}>
                  {numerosAnimacion.map((num, i) => {
                    const esPrincipal = i === numerosAnimacion.length - 1;
                    return (
                      <div key={i} style={{
                        background: esPrincipal
                          ? "linear-gradient(145deg,rgba(245,166,35,0.15),rgba(245,166,35,0.05))"
                          : "rgba(27,79,138,0.2)",
                        border: `1px solid ${esPrincipal ? "rgba(245,166,35,0.5)" : "rgba(27,79,138,0.4)"}`,
                        borderRadius: "16px",
                        padding: "16px 12px",
                      }}>
                        <p style={{
                          color: esPrincipal ? "#F5A623" : "#4a90d9",
                          fontSize: "10px", fontWeight: 700,
                          letterSpacing: "2px", textTransform: "uppercase",
                          marginBottom: "6px",
                        }}>
                          {esPrincipal ? "⭐ Principal" : `Sorteo ${i + 1}`}
                        </p>
                        <p style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: numerosAnimacion.length > 4 ? "28px" : "36px",
                          fontWeight: 900,
                          color: esPrincipal ? "#F5A623" : "#d4e4f4",
                          textShadow: esPrincipal ? "0 0 30px rgba(245,166,35,0.7)" : "none",
                          letterSpacing: "0.15em",
                          lineHeight: 1,
                        }}>
                          {num}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {!modoDemo && (
                  <p style={{ color: "#4a90d9", fontSize: "12px", marginBottom: "20px" }}>
                    Los premios han sido acreditados. El último número determina las categorías 3, 2 y 1 cifra.
                  </p>
                )}

                <button
                  onClick={cerrarOverlay}
                  style={{
                    background: "#F5A623", color: "#1B4F8A",
                    border: "none", borderRadius: "14px",
                    padding: "14px 36px", fontSize: "16px",
                    fontWeight: 900, cursor: "pointer",
                    boxShadow: "0 4px 24px rgba(245,166,35,0.55)",
                  }}
                >
                  {modoDemo ? "✕ Cerrar demo" : "Ver resultados completos →"}
                </button>
              </div>
            )}

          </div>

          {/* Keyframes reutilizados del RuletaSorteo */}
          <style>{`
            @keyframes revealNumber {
              from { transform: scale(0.3) translateY(20px); opacity: 0; }
              to   { transform: scale(1)   translateY(0);    opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// ── Helpers de estilos del overlay ─────────────────────────────────────────

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${color}60`,
    color,
    fontSize: "11px", fontWeight: 700,
    letterSpacing: "2px", textTransform: "uppercase" as const,
    padding: "4px 14px", borderRadius: "20px",
  };
}

const btnSaltarStyle: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.25)",
  fontSize: "12px", cursor: "pointer", padding: "8px 16px",
};
