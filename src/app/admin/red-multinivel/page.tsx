"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NivelData { nombre: string; emoji: string; color: string }

interface ReferidoItem {
  id: string; nombre: string; correo: string;
  compro: boolean; membresias: number; subred: number;
}

interface ReferidorData {
  id: string; nombre: string; correo: string; fechaRegistro: string;
  nivel: NivelData;
  directos: number; activos: number; membresiasRed: number; giftCards: number;
  nivel2: number; activosNivel2: number; membresiasNivel2: number;
  faltanParaSiguiente: number; siguienteNivel: NivelData | null;
  referidosList: ReferidoItem[];
}

interface Resumen { referidores: number; totalActivos: number; totalMembresiasRed: number; mayorRed: number }
interface NivelDef { min: number; nombre: string; emoji: string; color: string }

// ── Colores por nivel ────────────────────────────────────────────────────────

const NIVEL_STYLES: Record<string, { badge: string; ring: string; text: string }> = {
  Diamante: { badge: "bg-cyan-100 text-cyan-700 border-cyan-300",    ring: "ring-cyan-300",   text: "text-cyan-600" },
  Platino:  { badge: "bg-purple-100 text-purple-700 border-purple-300", ring: "ring-purple-300", text: "text-purple-600" },
  Oro:      { badge: "bg-yellow-100 text-yellow-700 border-yellow-300", ring: "ring-yellow-300", text: "text-yellow-600" },
  Plata:    { badge: "bg-gray-100 text-gray-600 border-gray-300",     ring: "ring-gray-300",   text: "text-gray-500" },
  Bronce:   { badge: "bg-orange-100 text-orange-700 border-orange-300", ring: "ring-orange-300", text: "text-orange-600" },
  Semilla:  { badge: "bg-green-100 text-green-700 border-green-300",  ring: "ring-green-300",  text: "text-green-600" },
};

function BadgeNivel({ nivel }: { nivel: NivelData }) {
  const s = NIVEL_STYLES[nivel.nombre] ?? NIVEL_STYLES.Semilla;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${s.badge}`}>
      {nivel.emoji} {nivel.nombre}
    </span>
  );
}

// ── Fila expandible ──────────────────────────────────────────────────────────

function FilaReferidor({ r, rank }: { r: ReferidorData; rank: number }) {
  const [abierto, setAbierto] = useState(false);
  const s = NIVEL_STYLES[r.nivel.nombre] ?? NIVEL_STYLES.Semilla;

  return (
    <>
      <tr
        onClick={() => setAbierto((v) => !v)}
        className={`cursor-pointer transition-colors ${abierto ? "bg-blue-50" : "hover:bg-gray-50"}`}
      >
        {/* Rank */}
        <td className="px-4 py-3 text-center">
          <span className="text-xs font-bold text-gray-400">#{rank}</span>
        </td>
        {/* Usuario */}
        <td className="px-4 py-3">
          <p className="font-bold text-gray-900 text-sm">{r.nombre}</p>
          <p className="text-xs text-gray-400">{r.correo}</p>
        </td>
        {/* Nivel */}
        <td className="px-4 py-3 text-center">
          <BadgeNivel nivel={r.nivel} />
          {r.siguienteNivel && (
            <p className="text-[10px] text-gray-400 mt-1">
              {r.faltanParaSiguiente} para {r.siguienteNivel.emoji} {r.siguienteNivel.nombre}
            </p>
          )}
        </td>
        {/* Referidos directos */}
        <td className="px-4 py-3 text-center">
          <p className="text-lg font-extrabold text-[#1B4F8A]">{r.activos}</p>
          <p className="text-[10px] text-gray-400">{r.directos} registrados</p>
        </td>
        {/* Membresías red nivel 1 */}
        <td className="px-4 py-3 text-center">
          <p className="text-lg font-extrabold text-[#F5A623]">{r.membresiasRed}</p>
          <p className="text-[10px] text-gray-400">membresías L1</p>
        </td>
        {/* Red nivel 2 */}
        <td className="px-4 py-3 text-center">
          <p className="text-base font-bold text-purple-600">{r.activosNivel2}</p>
          <p className="text-[10px] text-gray-400">{r.membresiasNivel2} memb. L2</p>
        </td>
        {/* Gift cards */}
        <td className="px-4 py-3 text-center">
          <span className={`text-base font-bold ${r.giftCards > 0 ? "text-green-600" : "text-gray-300"}`}>
            {r.giftCards > 0 ? `${r.giftCards} 🎁` : "—"}
          </span>
        </td>
        {/* Expandir */}
        <td className="px-4 py-3 text-center">
          <span className={`text-gray-400 transition-transform inline-block ${abierto ? "rotate-180" : ""}`}>▾</span>
        </td>
      </tr>

      {/* Fila expandida — lista de referidos directos */}
      {abierto && (
        <tr>
          <td colSpan={8} className="bg-blue-50 border-t border-blue-100 px-6 py-4">
            <div className="max-w-2xl">
              <p className="text-xs font-bold text-[#1B4F8A] uppercase tracking-wider mb-3">
                Red directa de {r.nombre} — {r.directos} referidos
              </p>

              {/* Barra de progreso hacia siguiente nivel */}
              {r.siguienteNivel && (
                <div className="mb-4 bg-white rounded-xl px-4 py-3 border border-blue-100">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-600">Progreso hacia {r.siguienteNivel.emoji} {r.siguienteNivel.nombre}</span>
                    <span className={`font-bold ${s.text}`}>{r.activos} / {r.activos + r.faltanParaSiguiente}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#1B4F8A] to-[#F5A623] transition-all"
                      style={{ width: `${Math.min(100, (r.activos / (r.activos + r.faltanParaSiguiente)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Faltan {r.faltanParaSiguiente} referidos activos para subir de nivel
                  </p>
                </div>
              )}

              {/* Lista de referidos directos */}
              <div className="space-y-1.5">
                {r.referidosList.map((ref) => (
                  <div key={ref.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm ${
                      ref.compro ? "bg-white border-green-200" : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ref.compro ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="font-semibold text-gray-800 truncate">{ref.nombre}</span>
                      <span className="text-xs text-gray-400 truncate hidden sm:block">{ref.correo}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      {ref.membresias > 0 && (
                        <span className="font-bold text-[#F5A623]">{ref.membresias} membresía{ref.membresias !== 1 ? "s" : ""}</span>
                      )}
                      {ref.subred > 0 && (
                        <span className="text-purple-500 font-semibold">+{ref.subred} L2</span>
                      )}
                      <span className={`font-bold ${ref.compro ? "text-green-600" : "text-gray-400"}`}>
                        {ref.compro ? "Activo" : "Sin compra"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats de nivel 2 si hay */}
              {r.nivel2 > 0 && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-purple-700 mb-1">Red de nivel 2 (referidos de sus referidos)</p>
                  <div className="flex gap-4 text-xs text-purple-600">
                    <span><strong>{r.nivel2}</strong> registrados</span>
                    <span><strong>{r.activosNivel2}</strong> activos</span>
                    <span><strong>{r.membresiasNivel2}</strong> membresías</span>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function RedMultinivel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [red, setRed] = useState<ReferidorData[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [nivelesDef, setNivelesDef] = useState<NivelDef[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("Todos");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/admin/red-multinivel")
      .then((r) => r.json())
      .then((data) => {
        setRed(data.red ?? []);
        setResumen(data.resumen ?? null);
        setNivelesDef(data.niveles ?? []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const rol = (session?.user as unknown as { rol?: string })?.rol;
  if (status === "loading") return null;
  if (rol !== "ADMIN") return <p className="p-8 text-center text-gray-500">No autorizado.</p>;

  const redFiltrada = red.filter((r) => {
    const matchBusq = busqueda === "" ||
      r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.correo.toLowerCase().includes(busqueda.toLowerCase());
    const matchNivel = filtroNivel === "Todos" || r.nivel.nombre === filtroNivel;
    return matchBusq && matchNivel;
  });

  const nivelesUnicos = ["Todos", ...nivelesDef.map((n) => n.nombre)];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link href="/admin" className="text-sm text-[#1B4F8A] hover:underline">← Panel Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Red Multinivel</h1>
            <p className="text-gray-500 text-sm">Visualización de la red de referidos y sistema de niveles</p>
          </div>
        </div>

        {/* Stats resumen */}
        {resumen && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#1B4F8A]">
              <p className="text-gray-500 text-sm">Usuarios activos en red</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{resumen.referidores}</p>
              <p className="text-gray-400 text-xs mt-0.5">con al menos 1 referido</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
              <p className="text-gray-500 text-sm">Referidos activos totales</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{resumen.totalActivos}</p>
              <p className="text-gray-400 text-xs mt-0.5">han comprado membresía</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#F5A623]">
              <p className="text-gray-500 text-sm">Membresías en la red</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{resumen.totalMembresiasRed}</p>
              <p className="text-gray-400 text-xs mt-0.5">compradas por referidos</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm">Mayor red individual</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{resumen.mayorRed}</p>
              <p className="text-gray-400 text-xs mt-0.5">referidos activos (top)</p>
            </div>
          </div>
        )}

        {/* Tabla de niveles / leyenda */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Sistema de niveles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { emoji: "🌱", nombre: "Semilla",  req: "0 activos",   reward: "Empieza a crecer" },
              { emoji: "🥉", nombre: "Bronce",   req: "1–4 activos",  reward: "Gift card por c/5" },
              { emoji: "🥈", nombre: "Plata",    req: "5–9 activos",  reward: "Gift cards + ranking" },
              { emoji: "🥇", nombre: "Oro",      req: "10–19 activos", reward: "Reconocimiento especial" },
              { emoji: "🔮", nombre: "Platino",  req: "20–49 activos", reward: "Beneficios prioritarios" },
              { emoji: "💎", nombre: "Diamante", req: "50+ activos",  reward: "Máximos beneficios" },
            ].map((n) => {
              const s = NIVEL_STYLES[n.nombre] ?? NIVEL_STYLES.Semilla;
              return (
                <div key={n.nombre} className={`rounded-xl border p-3 text-center ${s.badge}`}>
                  <p className="text-2xl mb-1">{n.emoji}</p>
                  <p className="font-extrabold text-sm">{n.nombre}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">{n.req}</p>
                  <p className="text-[10px] font-semibold mt-1 opacity-70">{n.reward}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
          />
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
          >
            {nivelesUnicos.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin mr-3" />
              <span className="text-gray-400">Cargando red...</span>
            </div>
          ) : redFiltrada.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🌐</p>
              <p className="font-semibold">No hay datos de red aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Nivel</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Activos L1</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Memb. L1</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Red L2</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Gift Cards</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {redFiltrada.map((r, i) => (
                    <FilaReferidor key={r.id} r={r} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Haz clic en cualquier fila para ver el detalle de la red. L1 = referidos directos · L2 = referidos de referidos.
        </p>

      </main>

      <Footer />
    </div>
  );
}
