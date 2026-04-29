"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RuletaSorteo from "@/components/RuletaSorteo";
import CountdownAnticipada from "@/components/CountdownAnticipada";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

type TabId = "principal" | "anticipadas" | "grandes" | "previos";
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

interface Ganador {
  userId: string;
  nombre: string;
  apellido: string;
  correo: string;
  numeroCaja: string;
}

interface Anticipada {
  id: string;
  nombre: string;
  descripcion: string | null;
  premioDescripcion: string;
  premioValor: number | null;
  cantidadGanadores: number;
  soloVendidas: boolean;
  minCajas: number;
  fecha: string;
  estado: "PENDIENTE" | "EJECUTADO";
  ganadores: Ganador[] | null;
}

interface GranSorteo {
  id: string;
  nombre: string;
  descripcion: string;
  premioDescripcion: string;
  valorCaja: number;
  fechaInicio: string;
  fechaSorteo: string;
  numeroGanador: string | null;
  estado: "PENDIENTE" | "EN_CURSO" | "ACTIVO" | "FINALIZADO";
  recaudo: number;
  fondoPremios: number;
  ganancia: number;
  participantes: number;
  ganadorNombre: string | null;
  ganadorApellido: string | null;
  ganadorCorreo: string | null;
  createdAt: string;
}

interface GranSorteoSimple {
  id: string;
  nombre: string;
  estado: string;
}

interface SorteoPrevio {
  id: string;
  granSorteoId: string;
  granSorteoNombre: string;
  nombre: string;
  premioDescripcion: string;
  premioValor: number | null;
  fechaSorteo: string;
  cantidadGanadores: number;
  requisitos: { soloVendidas: boolean; minCajas: number; soloEsteGranSorteo: boolean } | null;
  estado: "ACTIVO" | "FINALIZADO";
  ganadores: Ganador[] | null;
}

// ── Shared overlay ─────────────────────────────────────────────────────────

function OverlayAnimacion({
  activo,
  numAnimacion,
  animTerminada,
  onTerminado,
  onCerrar,
  badge,
  ganadores,
  textoBoton,
  modoDemo,
}: {
  activo: boolean;
  numAnimacion: string;
  animTerminada: boolean;
  onTerminado: () => void;
  onCerrar: () => void;
  badge?: string;
  ganadores?: Ganador[] | null;
  textoBoton?: string;
  modoDemo?: boolean;
}) {
  if (!activo) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.97)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{ maxWidth: "520px", width: "100%" }}>
        {badge && (
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <span style={{
              background: modoDemo ? "rgba(27,79,138,0.4)" : "rgba(245,166,35,0.15)",
              border: `1px solid ${modoDemo ? "rgba(27,79,138,0.6)" : "rgba(245,166,35,0.4)"}`,
              color: modoDemo ? "#7eb3e8" : "#F5A623",
              fontSize: "11px", fontWeight: 700,
              letterSpacing: "2px", textTransform: "uppercase" as const,
              padding: "4px 14px", borderRadius: "20px",
            }}>
              {badge}
            </span>
          </div>
        )}

        <RuletaSorteo
          numeroGanador={numAnimacion}
          activo={activo}
          onTerminado={onTerminado}
        />

        {animTerminada && ganadores && ganadores.length > 0 && (
          <div style={{
            marginTop: "20px",
            background: "rgba(11,25,41,0.9)",
            borderRadius: "16px",
            border: "1px solid rgba(245,166,35,0.3)",
            padding: "16px",
            maxHeight: "220px",
            overflowY: "auto",
          }}>
            <p style={{
              color: "#F5A623", fontWeight: 900,
              fontSize: "13px", letterSpacing: "1px",
              textAlign: "center", marginBottom: "12px",
            }}>
              🏆 GANADORES SELECCIONADOS
            </p>
            {ganadores.map((g, i) => (
              <div key={g.userId + g.numeroCaja} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 0",
                borderBottom: i < ganadores.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <div style={{
                  width: "24px", height: "24px",
                  background: "#F5A623", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1B4F8A", fontWeight: 900, fontSize: "11px", flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "13px", margin: 0 }}>
                    {g.nombre} {g.apellido}
                  </p>
                  <p style={{ color: "#7eb3e8", fontSize: "11px", margin: 0 }}>{g.correo}</p>
                </div>
                <div style={{
                  fontFamily: "'Courier New', monospace",
                  color: "#F5A623", fontWeight: 900, fontSize: "18px", flexShrink: 0,
                }}>#{g.numeroCaja}</div>
              </div>
            ))}
          </div>
        )}

        {animTerminada && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={onCerrar}
              style={{
                background: "#F5A623", color: "#1B4F8A",
                border: "none", borderRadius: "14px",
                padding: "14px 36px", fontSize: "16px",
                fontWeight: 900, cursor: "pointer",
                boxShadow: "0 4px 24px rgba(245,166,35,0.55)",
              }}
            >
              {textoBoton ?? "Ver resultados →"}
            </button>
          </div>
        )}

        {!animTerminada && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button
              onClick={onCerrar}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.25)",
                fontSize: "12px", cursor: "pointer", padding: "8px 16px",
              }}
            >
              Saltar animación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal confirmación (Tab 1) ─────────────────────────────────────────────

function ModalConfirmacion({
  abierto,
  onConfirmar,
  onCancelar,
  ejecutando,
}: {
  abierto: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  ejecutando: boolean;
}) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <span className="text-5xl">🎰</span>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 text-center mb-2">
          ¿Ejecutar sorteo principal?
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Esta acción no se puede deshacer. Los premios se acreditarán automáticamente a los ganadores.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            disabled={ejecutando}
            className="flex-1 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={ejecutando}
            className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-3 rounded-xl transition-colors shadow-md"
          >
            {ejecutando ? "⏳ Procesando..." : "Sí, ejecutar sorteo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Principal ──────────────────────────────────────────────────────

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
              {premios.length} ganador{premios.length !== 1 ? "es" : ""} · ${premios[0].monto.toLocaleString("es-CO")} c/u
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

function TabPrincipal() {
  const [sorteoExistente, setSorteoExistente] = useState<SorteoData | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [modo, setModo] = useState<"auto" | "manual">("auto");
  const [numeroManual, setNumeroManual] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [overlayActivo, setOverlayActivo] = useState(false);
  const [numAnimacion, setNumAnimacion] = useState("0000");
  const [animTerminada, setAnimTerminada] = useState(false);
  const [modoDemo, setModoDemo] = useState(false);
  const [pendienteJSON, setPendienteJSON] = useState<{ sorteo: SorteoData; resumen: Resumen } | null>(null);

  useEffect(() => {
    fetch("/api/admin/sorteo")
      .then((r) => r.json())
      .then((d) => { setSorteoExistente(d.sorteo); setCargando(false); });
  }, []);

  async function ejecutarSorteo() {
    if (modo === "manual" && !/^\d{4}$/.test(numeroManual)) {
      setError("El número ganador debe ser exactamente 4 dígitos.");
      setModalAbierto(false);
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
      try { json = await res.json(); } catch {
        throw new Error("El servidor no respondió correctamente.");
      }
      if (!res.ok) {
        setError((json.mensaje as string) ?? "Error desconocido al ejecutar el sorteo.");
        if (json.sorteo) setSorteoExistente(json.sorteo as SorteoData);
        setModalAbierto(false);
        return;
      }
      setModalAbierto(false);
      setPendienteJSON({ sorteo: json.sorteo as SorteoData, resumen: json.resumen as Resumen });
      setNumAnimacion((json.sorteo as SorteoData).numeroGanador);
      setModoDemo(false);
      setAnimTerminada(false);
      setOverlayActivo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
      setModalAbierto(false);
    } finally {
      setEjecutando(false);
    }
  }

  function verDemo() {
    const num = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setNumAnimacion(num);
    setModoDemo(true);
    setAnimTerminada(false);
    setOverlayActivo(true);
  }

  function cerrarOverlay() {
    setOverlayActivo(false);
    setAnimTerminada(false);
    if (!modoDemo && pendienteJSON) {
      setSorteoExistente(pendienteJSON.sorteo);
      setResumen(pendienteJSON.resumen);
      setPendienteJSON(null);
    }
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

  if (cargando) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  const premiosPorCategoria = sorteoExistente
    ? (["CUATRO_CIFRAS", "TRES_CIFRAS", "DOS_CIFRAS", "UNA_CIFRA"] as Categoria[]).map((cat) => ({
        categoria: cat,
        premios: sorteoExistente.premios.filter((p) => p.categoria === cat),
      }))
    : [];

  return (
    <>
      {!sorteoExistente ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Configurar sorteo principal</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

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

            {modo === "manual" && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Número ganador</label>
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
              onClick={() => {
                if (modo === "manual" && numeroManual.length !== 4) {
                  setError("El número ganador debe ser exactamente 4 dígitos.");
                  return;
                }
                setError("");
                setModalAbierto(true);
              }}
              disabled={ejecutando || (modo === "manual" && numeroManual.length !== 4)}
              className="w-full bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-4 rounded-xl text-lg transition-all shadow-md hover:shadow-lg mb-3"
            >
              🎰 Ejecutar sorteo principal
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

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Distribución de premios</h2>
            <div className="space-y-3">
              {[
                { label: "🏆 4 cifras exactas", pct: "35%", desc: "1 ganador máximo" },
                { label: "🥈 3 últimas cifras", pct: "15%", desc: "Hasta 9 ganadores" },
                { label: "🥉 2 últimas cifras", pct: "10%", desc: "Hasta 90 ganadores" },
                { label: "🎁 1 última cifra",   pct: "Devolución", desc: "Hasta 900 ganadores" },
                { label: "🎪 Operación",        pct: "40%", desc: "Gastos del evento" },
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
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] rounded-2xl p-8 text-white text-center">
            <p className="text-blue-200 text-sm font-medium mb-2 uppercase tracking-widest">Número ganador</p>
            <div
              className="text-8xl md:text-9xl font-extrabold tracking-widest text-[#F5A623] my-4"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              {sorteoExistente.numeroGanador}
            </div>
            <p className="text-blue-200 text-sm">
              Sorteo ejecutado el{" "}
              {new Date(sorteoExistente.fecha).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Cajas vendidas", valor: sorteoExistente.totalVendidas.toLocaleString("es-CO"), icono: "📦" },
              { label: "Recaudo total", valor: `$${(sorteoExistente.totalRecaudo / 1_000_000).toFixed(2)}M`, icono: "💰" },
              { label: "Fondo premios", valor: `$${(sorteoExistente.fondoPremios / 1_000_000).toFixed(2)}M`, icono: "🏆" },
              { label: "Ganancia operación", valor: `$${(sorteoExistente.ganancia / 1_000_000).toFixed(2)}M`, icono: "🎪" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <span className="text-2xl">{item.icono}</span>
                <p className="text-xl font-extrabold text-[#1B4F8A] mt-1">{item.valor}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

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

      <ModalConfirmacion
        abierto={modalAbierto}
        onConfirmar={ejecutarSorteo}
        onCancelar={() => setModalAbierto(false)}
        ejecutando={ejecutando}
      />

      <OverlayAnimacion
        activo={overlayActivo}
        numAnimacion={numAnimacion}
        animTerminada={animTerminada}
        onTerminado={() => setAnimTerminada(true)}
        onCerrar={cerrarOverlay}
        badge={modoDemo ? "Modo demo — sin sorteo real" : "🎰 Sorteo Principal"}
        modoDemo={modoDemo}
        textoBoton={modoDemo ? "✕  Cerrar demo" : "Ver resultados →"}
      />
    </>
  );
}

// ── Tab 2: Anticipadas ────────────────────────────────────────────────────

const FORM_ANT_INICIAL = {
  nombre: "",
  descripcion: "",
  premioDescripcion: "",
  premioValor: "",
  cantidadGanadores: "5",
  soloVendidas: true,
  minCajas: false,
  fecha: "",
};

function TarjetaAnticipada({
  a,
  onEjecutar,
  onEliminar,
  ejecutando,
}: {
  a: Anticipada;
  onEjecutar: (id: string) => void;
  onEliminar: (id: string) => void;
  ejecutando: boolean;
}) {
  const [ganadoresAbiertos, setGanadoresAbiertos] = useState(false);
  const fechaObj = new Date(a.fecha);
  const yaFue = fechaObj < new Date();

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      a.estado === "EJECUTADO" ? "border-green-200" : yaFue ? "border-orange-200" : "border-gray-100"
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-gray-900 text-lg truncate">{a.nombre}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                a.estado === "EJECUTADO"
                  ? "bg-green-100 text-green-700"
                  : yaFue ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
              }`}>
                {a.estado === "EJECUTADO" ? "✓ Ejecutado" : yaFue ? "Pendiente de ejecución" : "Próximamente"}
              </span>
            </div>
            {a.descripcion && <p className="text-gray-500 text-sm">{a.descripcion}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#F5A623]/10 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Premio</p>
            <p className="font-extrabold text-[#b87b00] text-sm leading-tight">{a.premioDescripcion}</p>
            {a.premioValor && <p className="text-xs text-gray-400">${a.premioValor.toLocaleString("es-CO")}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Ganadores</p>
            <p className="font-extrabold text-[#1B4F8A]">{a.cantidadGanadores}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Elegibles</p>
            <p className="font-extrabold text-gray-700 text-sm">{a.soloVendidas ? "Solo vendidas" : "Vendidas + reservadas"}</p>
            {a.minCajas > 0 && <p className="text-xs text-purple-600 font-semibold mt-0.5">⭐ {a.minCajas}+ cajas</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
            <p className="font-semibold text-gray-700 text-sm">
              {fechaObj.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </p>
            <p className="text-gray-400 text-xs">
              {fechaObj.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {a.estado === "PENDIENTE" && !yaFue && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-500 text-sm">Faltan:</span>
            <CountdownAnticipada fecha={a.fecha} />
          </div>
        )}

        <div className="flex gap-2">
          {a.estado === "PENDIENTE" && (
            <button
              onClick={() => onEjecutar(a.id)}
              disabled={ejecutando}
              className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md"
            >
              {ejecutando ? "⏳ Ejecutando..." : "🎯 Ejecutar selección"}
            </button>
          )}
          {a.estado === "EJECUTADO" && a.ganadores && (
            <button
              onClick={() => setGanadoresAbiertos(!ganadoresAbiertos)}
              className="flex-1 border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl text-sm transition-all"
            >
              {ganadoresAbiertos ? "▲ Ocultar ganadores" : `▼ Ver ${a.ganadores.length} ganador${a.ganadores.length !== 1 ? "es" : ""}`}
            </button>
          )}
          {a.estado === "PENDIENTE" && (
            <button
              onClick={() => onEliminar(a.id)}
              disabled={ejecutando}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {ganadoresAbiertos && a.ganadores && (
        <div className="border-t border-green-100 bg-green-50 divide-y divide-green-100">
          <div className="px-5 py-2.5 flex items-center gap-2">
            <span className="text-green-700 font-bold text-sm">Ganadores — {a.nombre}</span>
          </div>
          {a.ganadores.map((g, i) => (
            <div key={g.userId + g.numeroCaja} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#F5A623] rounded-full flex items-center justify-center text-[#1B4F8A] font-extrabold text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{g.nombre} {g.apellido}</p>
                  <p className="text-gray-400 text-xs">{g.correo}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-extrabold text-[#1B4F8A] text-lg tracking-widest">#{g.numeroCaja}</p>
                <p className="text-xs text-[#F5A623] font-semibold">{a.premioDescripcion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabAnticipadas() {
  const [anticipadas, setAnticipadas] = useState<Anticipada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_ANT_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ejecutandoId, setEjecutandoId] = useState<string | null>(null);
  const [overlayActivo, setOverlayActivo] = useState(false);
  const [numAnimacion, setNumAnimacion] = useState("0000");
  const [animTerminada, setAnimTerminada] = useState(false);
  const [pendienteGanadores, setPendienteGanadores] = useState<Ganador[] | null>(null);
  const [pendienteNombre, setPendienteNombre] = useState<string | null>(null);
  const [pendienteId, setPendienteId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/anticipadas");
    const json = await res.json();
    setAnticipadas(json.anticipadas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function setField(campo: string, valor: string | boolean) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function crearAnticipada() {
    setErrorForm("");
    if (!form.nombre.trim() || !form.premioDescripcion.trim() || !form.fecha) {
      setErrorForm("Nombre, descripción del premio y fecha son requeridos.");
      return;
    }
    setCreando(true);
    const res = await fetch("/api/admin/anticipadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        premioValor: form.premioValor ? Number(form.premioValor) : null,
        cantidadGanadores: Number(form.cantidadGanadores),
        minCajas: form.minCajas ? 10 : 0,
      }),
    });
    const json = await res.json();
    setCreando(false);
    if (!res.ok) { setErrorForm(json.mensaje); return; }
    setForm(FORM_ANT_INICIAL);
    setMostrarForm(false);
    cargar();
  }

  async function ejecutarAnticipada(id: string) {
    const a = anticipadas.find((x) => x.id === id);
    if (!a) return;
    if (!confirm(`¿Ejecutar "${a.nombre}"? Se seleccionarán ${a.cantidadGanadores} ganadores al azar.`)) return;
    setEjecutandoId(id);
    const res = await fetch(`/api/admin/anticipadas/${id}/ejecutar`, { method: "POST" });
    const json = await res.json();
    setEjecutandoId(null);
    if (!res.ok) { alert(json.mensaje); cargar(); return; }
    const ganadores: Ganador[] = json.ganadores ?? [];
    const num = ganadores[0]?.numeroCaja ?? String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setPendienteGanadores(ganadores);
    setPendienteId(id);
    setPendienteNombre(a.nombre);
    setNumAnimacion(num);
    setAnimTerminada(false);
    setOverlayActivo(true);
  }

  async function eliminarAnticipada(id: string) {
    const a = anticipadas.find((x) => x.id === id);
    if (!a) return;
    if (!confirm(`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/anticipadas?id=${id}`, { method: "DELETE" });
    cargar();
  }

  function cerrarOverlay() {
    setOverlayActivo(false);
    setAnimTerminada(false);
    if (pendienteId) { cargar(); setPendienteId(null); setPendienteGanadores(null); setPendienteNombre(null); }
  }

  const pendientes = anticipadas.filter((a) => a.estado === "PENDIENTE");
  const ejecutadas = anticipadas.filter((a) => a.estado === "EJECUTADO");

  if (cargando) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Selecciones Anticipadas</h2>
          <p className="text-gray-500 text-sm">Sorteos previos al evento principal</p>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setErrorForm(""); }}
          className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm"
        >
          {mostrarForm ? "× Cancelar" : "+ Nueva selección"}
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5">Crear nueva selección anticipada</h3>
          {errorForm && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-red-700 text-sm">{errorForm}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[
              { key: "nombre", label: "Nombre del evento", placeholder: "Selección Viernes #1", req: true },
              { key: "premioDescripcion", label: "Descripción del premio", placeholder: "$100.000, Licuadora...", req: true },
              { key: "premioValor", label: "Valor del premio (opcional)", placeholder: "100000", req: false, type: "number" },
              { key: "cantidadGanadores", label: "Cantidad de ganadores", placeholder: "5", req: false, type: "number" },
              { key: "fecha", label: "Fecha y hora", placeholder: "", req: true, type: "datetime-local" },
              { key: "descripcion", label: "Descripción adicional (opcional)", placeholder: "Detalles del evento...", req: false },
            ].map(({ key, label, placeholder, req, type }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {label} {req && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type ?? "text"}
                  value={(form as Record<string, string | boolean>)[key] as string}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
              </div>
            ))}
          </div>
          <div className="space-y-3 mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.soloVendidas as boolean}
                onChange={(e) => setField("soloVendidas", e.target.checked)}
                className="w-4 h-4 accent-[#1B4F8A]" />
              <span className="text-sm text-gray-700">Solo cajas vendidas (recomendado)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.minCajas as boolean}
                onChange={(e) => setField("minCajas", e.target.checked)}
                className="w-4 h-4 accent-purple-600" />
              <span className="text-sm text-gray-700">
                <span className="text-purple-700 font-bold">⭐ Exclusivo para compradores de 10+ cajas</span>
              </span>
            </label>
          </div>
          <button
            onClick={crearAnticipada}
            disabled={creando}
            className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-md"
          >
            {creando ? "Creando..." : "Crear selección anticipada"}
          </button>
        </div>
      )}

      {anticipadas.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No hay selecciones anticipadas</h2>
          <p className="text-gray-500 text-sm mb-4">Crea la primera selección para sortear premios anticipados.</p>
          <button onClick={() => setMostrarForm(true)}
            className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm">
            + Nueva selección
          </button>
        </div>
      )}

      {pendientes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Próximas selecciones
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </h2>
          <div className="space-y-4">
            {pendientes.map((a) => (
              <TarjetaAnticipada key={a.id} a={a} onEjecutar={ejecutarAnticipada} onEliminar={eliminarAnticipada} ejecutando={ejecutandoId === a.id} />
            ))}
          </div>
        </section>
      )}

      {ejecutadas.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Selecciones ejecutadas
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{ejecutadas.length}</span>
          </h2>
          <div className="space-y-4">
            {ejecutadas.map((a) => (
              <TarjetaAnticipada key={a.id} a={a} onEjecutar={ejecutarAnticipada} onEliminar={eliminarAnticipada} ejecutando={ejecutandoId === a.id} />
            ))}
          </div>
        </section>
      )}

      <OverlayAnimacion
        activo={overlayActivo}
        numAnimacion={numAnimacion}
        animTerminada={animTerminada}
        onTerminado={() => setAnimTerminada(true)}
        onCerrar={cerrarOverlay}
        badge={pendienteNombre ?? "Selección anticipada"}
        ganadores={pendienteGanadores}
        textoBoton="Ver resultados →"
      />
    </>
  );
}

// ── Tab 3: Grandes sorteos ────────────────────────────────────────────────

const FORM_GS_INICIAL = {
  nombre: "",
  descripcion: "",
  premioDescripcion: "",
  valorCaja: "10000",
  fechaInicio: "",
  fechaSorteo: "",
  estado: "ACTIVO",
};

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-gray-100 text-gray-600",
  EN_CURSO: "bg-blue-100 text-blue-700",
  ACTIVO: "bg-green-100 text-green-700",
  FINALIZADO: "bg-purple-100 text-purple-700",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  ACTIVO: "Activo",
  FINALIZADO: "✓ Finalizado",
};

function FormGranSorteo({
  inicial,
  titulo,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  inicial: typeof FORM_GS_INICIAL;
  titulo: string;
  onGuardar: (data: typeof FORM_GS_INICIAL) => void;
  onCancelar: () => void;
  guardando: boolean;
  error: string;
}) {
  const [form, setForm] = useState(inicial);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">{titulo}</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre <span className="text-red-500">*</span></label>
          <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
            placeholder="Gran Sorteo 10K — Edición 2026"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Premio <span className="text-red-500">*</span></label>
          <input type="text" value={form.premioDescripcion} onChange={(e) => set("premioDescripcion", e.target.value)}
            placeholder="Casa, carro, viaje, $50.000.000..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor por caja (COP) <span className="text-red-500">*</span></label>
          <input type="number" value={form.valorCaja} onChange={(e) => set("valorCaja", e.target.value)}
            min="1000"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de inicio <span className="text-red-500">*</span></label>
          <input type="datetime-local" value={form.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha del sorteo <span className="text-red-500">*</span></label>
          <input type="datetime-local" value={form.fechaSorteo} onChange={(e) => set("fechaSorteo", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado inicial</label>
          <select value={form.estado} onChange={(e) => set("estado", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]">
            <option value="PENDIENTE">Pendiente (no visible para compra)</option>
            <option value="ACTIVO">Activo (visible y en venta)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción (opcional)</label>
          <input type="text" value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
            placeholder="Detalles adicionales del Gran Sorteo..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onGuardar(form)} disabled={guardando}
          className="flex-1 bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-md">
          {guardando ? "Guardando..." : "Guardar Gran Sorteo"}
        </button>
        <button onClick={onCancelar}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TabGrandes({ onVerPrevios }: { onVerPrevios: (id: string) => void }) {
  const [lista, setLista] = useState<GranSorteo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<GranSorteo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [detalle, setDetalle] = useState<GranSorteo | null>(null);
  const [overlayActivo, setOverlayActivo] = useState(false);
  const [numAnimacion, setNumAnimacion] = useState("0000");
  const [animTerminada, setAnimTerminada] = useState(false);
  const [pendienteGanadores, setPendienteGanadores] = useState<Ganador[] | null>(null);
  const [ejecutandoId, setEjecutandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/gran-sorteos");
    const json = await res.json();
    setLista(json.granSorteos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearGranSorteo(form: typeof FORM_GS_INICIAL) {
    setErrorForm("");
    if (!form.nombre.trim() || !form.premioDescripcion.trim() || !form.valorCaja || !form.fechaInicio || !form.fechaSorteo) {
      setErrorForm("Nombre, premio, valor por caja, fecha inicio y fecha sorteo son requeridos.");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/gran-sorteos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valorCaja: Number(form.valorCaja) }),
    });
    const json = await res.json();
    setGuardando(false);
    if (!res.ok) { setErrorForm(json.mensaje); return; }
    setMostrarForm(false);
    setErrorForm("");
    cargar();
  }

  async function editarGranSorteo(form: typeof FORM_GS_INICIAL) {
    if (!editando) return;
    setErrorForm("");
    setGuardando(true);
    const res = await fetch(`/api/gran-sorteos/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valorCaja: Number(form.valorCaja) }),
    });
    const json = await res.json();
    setGuardando(false);
    if (!res.ok) { setErrorForm(json.mensaje); return; }
    setEditando(null);
    setErrorForm("");
    cargar();
  }

  async function desactivarGranSorteo(gs: GranSorteo) {
    if (!confirm(`¿Desactivar "${gs.nombre}"? Pasará a estado Pendiente.`)) return;
    await fetch(`/api/gran-sorteos/${gs.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PENDIENTE" }),
    });
    cargar();
  }

  async function eliminarGranSorteo(gs: GranSorteo) {
    if (!confirm(`¿Eliminar "${gs.nombre}"? Solo se pueden eliminar sorteos en estado Pendiente.`)) return;
    const res = await fetch(`/api/gran-sorteos/${gs.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { alert(json.mensaje); return; }
    cargar();
  }

  async function ejecutarGranSorteo(gs: GranSorteo) {
    if (!confirm(`¿Ejecutar "${gs.nombre}"? Se seleccionará el ganador del premio mayor.`)) return;
    setEjecutandoId(gs.id);
    const res = await fetch(`/api/gran-sorteos/${gs.id}/ejecutar`, { method: "POST" });
    const json = await res.json();
    setEjecutandoId(null);
    if (!res.ok) { alert(json.mensaje); return; }
    const ganadores: Ganador[] = json.ganadores ?? [];
    const num = json.numeroGanador ?? String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setPendienteGanadores(ganadores);
    setNumAnimacion(num);
    setAnimTerminada(false);
    setOverlayActivo(true);
    cargar();
  }

  const formEditar = editando
    ? {
        nombre: editando.nombre,
        descripcion: editando.descripcion ?? "",
        premioDescripcion: editando.premioDescripcion,
        valorCaja: editando.valorCaja.toString(),
        fechaInicio: editando.fechaInicio.slice(0, 16),
        fechaSorteo: editando.fechaSorteo.slice(0, 16),
        estado: editando.estado === "FINALIZADO" ? "ACTIVO" : editando.estado,
      }
    : FORM_GS_INICIAL;

  if (cargando) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Grandes Sorteos</h2>
          <p className="text-gray-500 text-sm">Sorteos especiales con premio mayor propio</p>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setErrorForm(""); setEditando(null); }}
          className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm"
        >
          {mostrarForm ? "× Cancelar" : "+ Crear Gran Sorteo"}
        </button>
      </div>

      {mostrarForm && !editando && (
        <FormGranSorteo
          inicial={FORM_GS_INICIAL}
          titulo="Crear nuevo Gran Sorteo"
          onGuardar={crearGranSorteo}
          onCancelar={() => { setMostrarForm(false); setErrorForm(""); }}
          guardando={guardando}
          error={errorForm}
        />
      )}

      {editando && (
        <FormGranSorteo
          inicial={formEditar}
          titulo={`Editando: ${editando.nombre}`}
          onGuardar={editarGranSorteo}
          onCancelar={() => { setEditando(null); setErrorForm(""); }}
          guardando={guardando}
          error={errorForm}
        />
      )}

      {lista.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No hay Grandes Sorteos</h2>
          <p className="text-gray-500 text-sm mb-4">Crea el primer Gran Sorteo para comenzar.</p>
          <button onClick={() => setMostrarForm(true)}
            className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm">
            + Crear Gran Sorteo
          </button>
        </div>
      )}

      {lista.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-5 py-3.5 font-semibold">Nombre</th>
                  <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Premio</th>
                  <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">Fecha sorteo</th>
                  <th className="px-5 py-3.5 font-semibold">Participantes</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lista.map((gs) => {
                  const fecha = new Date(gs.fechaSorteo);
                  return (
                    <tr key={gs.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-900">{gs.nombre}</p>
                        {gs.descripcion && (
                          <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[180px]">{gs.descripcion}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="font-semibold text-[#b87b00] truncate max-w-[160px]">{gs.premioDescripcion}</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-gray-700">
                          {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#1B4F8A]">{gs.participantes}</span>
                        <span className="text-gray-400 text-xs ml-1">cajas</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ESTADO_BADGE[gs.estado]}`}>
                          {ESTADO_LABEL[gs.estado]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button onClick={() => setDetalle(gs)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Ver
                          </button>
                          {gs.estado !== "FINALIZADO" && (
                            <>
                              <button onClick={() => ejecutarGranSorteo(gs)} disabled={ejecutandoId === gs.id}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F5A623] text-[#1B4F8A] hover:bg-yellow-400 disabled:opacity-50 transition-colors shadow-sm">
                                {ejecutandoId === gs.id ? "..." : "Ejecutar"}
                              </button>
                              <button
                                onClick={() => { setEditando(gs); setMostrarForm(false); setErrorForm(""); window.scrollTo(0, 0); }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#1B4F8A]/30 text-[#1B4F8A] hover:bg-[#1B4F8A]/5 transition-colors">
                                Editar
                              </button>
                              {gs.estado === "ACTIVO" && (
                                <button onClick={() => desactivarGranSorteo(gs)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors">
                                  Pausar
                                </button>
                              )}
                            </>
                          )}
                          {gs.estado === "PENDIENTE" && (
                            <button onClick={() => eliminarGranSorteo(gs)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1B4F8A]">{detalle.nombre}</h2>
                  {detalle.descripcion && <p className="text-gray-500 text-sm mt-0.5">{detalle.descripcion}</p>}
                </div>
                <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4">×</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Premio", valor: detalle.premioDescripcion },
                  { label: "Valor por caja", valor: `$${detalle.valorCaja.toLocaleString("es-CO")}` },
                  { label: "Fecha inicio", valor: new Date(detalle.fechaInicio).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Fecha sorteo", valor: new Date(detalle.fechaSorteo).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Participantes", valor: `${detalle.participantes} cajas vendidas` },
                  { label: "Recaudo estimado", valor: `$${(detalle.valorCaja * detalle.participantes).toLocaleString("es-CO")}` },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className="font-bold text-gray-900 text-sm">{item.valor}</p>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${ESTADO_BADGE[detalle.estado]}`}>
                  {ESTADO_LABEL[detalle.estado]}
                </span>
              </div>
              {detalle.estado === "FINALIZADO" && detalle.numeroGanador && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-5">
                  <p className="text-green-700 font-bold text-sm mb-3">🏆 Ganador del premio mayor</p>
                  <div className="flex items-center justify-between">
                    <div>
                      {detalle.ganadorNombre ? (
                        <>
                          <p className="font-bold text-gray-900">{detalle.ganadorNombre} {detalle.ganadorApellido}</p>
                          <p className="text-gray-500 text-xs">{detalle.ganadorCorreo}</p>
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm">Portador de la caja</p>
                      )}
                    </div>
                    <p className="font-extrabold text-[#1B4F8A] text-3xl tracking-[0.4em]">#{detalle.numeroGanador}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { setDetalle(null); onVerPrevios(detalle.id); }}
                className="w-full text-center bg-[#1B4F8A]/10 hover:bg-[#1B4F8A]/20 text-[#1B4F8A] font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                🎯 Ver Sorteos Previos de este Gran Sorteo →
              </button>
            </div>
          </div>
        </div>
      )}

      <OverlayAnimacion
        activo={overlayActivo}
        numAnimacion={numAnimacion}
        animTerminada={animTerminada}
        onTerminado={() => setAnimTerminada(true)}
        onCerrar={() => { setOverlayActivo(false); setAnimTerminada(false); setPendienteGanadores(null); }}
        badge="🏆 Gran Sorteo — Premio Mayor"
        ganadores={pendienteGanadores}
        textoBoton="Ver resultados →"
      />
    </>
  );
}

// ── Tab 4: Sorteos previos ─────────────────────────────────────────────────

const FORM_SP_INICIAL = {
  nombre: "",
  premioDescripcion: "",
  premioValor: "",
  fechaSorteo: "",
  soloVendidas: true,
  minCajas: false,
  soloEsteGranSorteo: false,
  cantidadGanadores: "5",
};

function TarjetaSorteoPrevio({
  sp,
  onEjecutar,
  onEliminar,
  ejecutando,
}: {
  sp: SorteoPrevio;
  onEjecutar: (id: string) => void;
  onEliminar: (id: string) => void;
  ejecutando: boolean;
}) {
  const [ganadoresAbiertos, setGanadoresAbiertos] = useState(false);
  const fecha = new Date(sp.fechaSorteo);
  const yaFue = fecha < new Date();
  const req = sp.requisitos;
  const esEjecutado = sp.estado === "FINALIZADO";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      esEjecutado ? "border-green-200" : yaFue ? "border-orange-200" : "border-gray-100"
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-gray-900 text-lg truncate">{sp.nombre}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                esEjecutado ? "bg-green-100 text-green-700" :
                yaFue ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
              }`}>
                {esEjecutado ? "✓ Ejecutado" : yaFue ? "Pendiente de ejecución" : "Próximamente"}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#F5A623]/10 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Premio</p>
            <p className="font-extrabold text-[#b87b00] text-sm leading-tight">{sp.premioDescripcion}</p>
            {sp.premioValor && <p className="text-xs text-gray-400">${sp.premioValor.toLocaleString("es-CO")}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Ganadores</p>
            <p className="font-extrabold text-[#1B4F8A]">{sp.cantidadGanadores}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Requisitos</p>
            <p className="font-semibold text-gray-700 text-xs leading-snug">
              {req?.soloEsteGranSorteo ? "Solo este sorteo" : "Todos"}
              {req && req.minCajas > 0 && ` · ${req.minCajas}+ cajas`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
            <p className="font-semibold text-gray-700 text-sm">
              {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </p>
            <p className="text-gray-400 text-xs">
              {fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!esEjecutado && (
            <button onClick={() => onEjecutar(sp.id)} disabled={ejecutando}
              className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md">
              {ejecutando ? "⏳ Ejecutando..." : "🎯 Ejecutar sorteo previo"}
            </button>
          )}
          {esEjecutado && sp.ganadores && (
            <button onClick={() => setGanadoresAbiertos(!ganadoresAbiertos)}
              className="flex-1 border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl text-sm transition-all">
              {ganadoresAbiertos ? "▲ Ocultar ganadores" : `▼ Ver ${sp.ganadores.length} ganador${sp.ganadores.length !== 1 ? "es" : ""}`}
            </button>
          )}
          {!esEjecutado && (
            <button onClick={() => onEliminar(sp.id)} disabled={ejecutando}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors">
              🗑️
            </button>
          )}
        </div>
      </div>
      {ganadoresAbiertos && sp.ganadores && (
        <div className="border-t border-green-100 bg-green-50 divide-y divide-green-100">
          <div className="px-5 py-2.5">
            <span className="text-green-700 font-bold text-sm">Ganadores — {sp.nombre}</span>
          </div>
          {sp.ganadores.map((g, i) => (
            <div key={g.userId + g.numeroCaja} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#F5A623] rounded-full flex items-center justify-center text-[#1B4F8A] font-extrabold text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{g.nombre} {g.apellido}</p>
                  <p className="text-gray-400 text-xs">{g.correo}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-extrabold text-[#1B4F8A] text-lg tracking-widest">#{g.numeroCaja}</p>
                <p className="text-xs text-[#F5A623] font-semibold">{sp.premioDescripcion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabPrevios({ initialGranSorteoId }: { initialGranSorteoId: string }) {
  const [granSorteos, setGranSorteos] = useState<GranSorteoSimple[]>([]);
  const [granSorteoSeleccionado, setGranSorteoSeleccionado] = useState(initialGranSorteoId);
  const [sorteosPrevios, setSorteosPrevios] = useState<SorteoPrevio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_SP_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ejecutandoId, setEjecutandoId] = useState<string | null>(null);
  const [overlayActivo, setOverlayActivo] = useState(false);
  const [numAnimacion, setNumAnimacion] = useState("0000");
  const [animTerminada, setAnimTerminada] = useState(false);
  const [pendienteGanadores, setPendienteGanadores] = useState<Ganador[] | null>(null);
  const [pendienteId, setPendienteId] = useState<string | null>(null);
  const [pendienteNombre, setPendienteNombre] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gran-sorteos")
      .then((r) => r.json())
      .then((d) => setGranSorteos(d.granSorteos ?? []));
  }, []);

  useEffect(() => {
    if (initialGranSorteoId) setGranSorteoSeleccionado(initialGranSorteoId);
  }, [initialGranSorteoId]);

  const cargarPrevios = useCallback(async (gsId: string) => {
    if (!gsId) { setSorteosPrevios([]); return; }
    setCargando(true);
    const res = await fetch(`/api/sorteos-previos?granSorteoId=${gsId}`);
    const json = await res.json();
    setSorteosPrevios(json.sorteosPrevios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargarPrevios(granSorteoSeleccionado); }, [granSorteoSeleccionado, cargarPrevios]);

  function setField(k: string, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function crearSorteoPrevio() {
    setErrorForm("");
    if (!granSorteoSeleccionado) { setErrorForm("Selecciona un Gran Sorteo."); return; }
    if (!form.nombre.trim() || !form.premioDescripcion.trim() || !form.fechaSorteo) {
      setErrorForm("Nombre, premio y fecha son requeridos.");
      return;
    }
    setCreando(true);
    const res = await fetch("/api/sorteos-previos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        granSorteoId: granSorteoSeleccionado,
        nombre: form.nombre,
        premioDescripcion: form.premioDescripcion,
        premioValor: form.premioValor ? Number(form.premioValor) : null,
        fechaSorteo: form.fechaSorteo,
        cantidadGanadores: Number(form.cantidadGanadores),
        requisitos: {
          soloVendidas: form.soloVendidas,
          minCajas: form.minCajas ? 10 : 0,
          soloEsteGranSorteo: form.soloEsteGranSorteo,
        },
      }),
    });
    const json = await res.json();
    setCreando(false);
    if (!res.ok) { setErrorForm(json.mensaje); return; }
    setForm(FORM_SP_INICIAL);
    setMostrarForm(false);
    cargarPrevios(granSorteoSeleccionado);
  }

  async function ejecutarSorteoPrevio(id: string) {
    const sp = sorteosPrevios.find((x) => x.id === id);
    if (!sp) return;
    if (!confirm(`¿Ejecutar "${sp.nombre}"? Se seleccionarán ${sp.cantidadGanadores} ganadores al azar.`)) return;
    setEjecutandoId(id);
    const res = await fetch(`/api/sorteos-previos/${id}/ejecutar`, { method: "POST" });
    const json = await res.json();
    setEjecutandoId(null);
    if (!res.ok) { alert(json.mensaje); cargarPrevios(granSorteoSeleccionado); return; }
    const ganadores: Ganador[] = json.ganadores ?? [];
    const num = ganadores[0]?.numeroCaja ?? String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setPendienteGanadores(ganadores);
    setPendienteId(id);
    setPendienteNombre(sp.nombre);
    setNumAnimacion(num);
    setAnimTerminada(false);
    setOverlayActivo(true);
  }

  async function eliminarSorteoPrevio(id: string) {
    const sp = sorteosPrevios.find((x) => x.id === id);
    if (!sp) return;
    if (!confirm(`¿Eliminar "${sp.nombre}"?`)) return;
    await fetch(`/api/sorteos-previos/${id}`, { method: "DELETE" });
    cargarPrevios(granSorteoSeleccionado);
  }

  function cerrarOverlay() {
    setOverlayActivo(false);
    setAnimTerminada(false);
    if (pendienteId) {
      cargarPrevios(granSorteoSeleccionado);
      setPendienteId(null);
      setPendienteGanadores(null);
      setPendienteNombre(null);
    }
  }

  const granSorteoActual = granSorteos.find((gs) => gs.id === granSorteoSeleccionado);
  const activos = sorteosPrevios.filter((sp) => sp.estado === "ACTIVO");
  const finalizados = sorteosPrevios.filter((sp) => sp.estado === "FINALIZADO");

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Sorteos Previos</h2>
        <p className="text-gray-500 text-sm">Sorteos previos vinculados a Grandes Sorteos</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          ¿A qué Gran Sorteo pertenecen estos sorteos previos?
        </label>
        {granSorteos.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay Grandes Sorteos. Créalos en la pestaña "Grandes Sorteos".</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={granSorteoSeleccionado}
              onChange={(e) => { setGranSorteoSeleccionado(e.target.value); setMostrarForm(false); }}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
            >
              <option value="">— Selecciona un Gran Sorteo —</option>
              {granSorteos.map((gs) => (
                <option key={gs.id} value={gs.id}>{gs.nombre} ({gs.estado})</option>
              ))}
            </select>
            {granSorteoSeleccionado && (
              <button
                onClick={() => { setMostrarForm(!mostrarForm); setErrorForm(""); }}
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm whitespace-nowrap"
              >
                {mostrarForm ? "× Cancelar" : "+ Nuevo sorteo previo"}
              </button>
            )}
          </div>
        )}
      </div>

      {mostrarForm && granSorteoSeleccionado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Crear sorteo previo</h3>
          {granSorteoActual && (
            <p className="text-sm text-[#1B4F8A] mb-5">
              Gran Sorteo: <span className="font-bold">{granSorteoActual.nombre}</span>
            </p>
          )}
          {errorForm && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-red-700 text-sm">{errorForm}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)}
                placeholder="Previo #1 — Viernes de cajas"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Premio <span className="text-red-500">*</span></label>
              <input type="text" value={form.premioDescripcion} onChange={(e) => setField("premioDescripcion", e.target.value)}
                placeholder="$200.000, Mercado, Cena para dos..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor del premio (opcional)</label>
              <input type="number" value={form.premioValor} onChange={(e) => setField("premioValor", e.target.value)}
                placeholder="200000" min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad de ganadores</label>
              <input type="number" value={form.cantidadGanadores} onChange={(e) => setField("cantidadGanadores", e.target.value)}
                min="1" max="100"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha y hora <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.fechaSorteo} onChange={(e) => setField("fechaSorteo", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
            <p className="text-sm font-bold text-gray-700 mb-2">Requisitos de participación</p>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-[#1B4F8A]" />
              <span className="text-sm text-gray-700">Solo participantes del Gran Sorteo <span className="text-gray-400">(siempre activo)</span></span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.soloEsteGranSorteo as boolean}
                onChange={(e) => setField("soloEsteGranSorteo", e.target.checked)} className="w-4 h-4 accent-[#1B4F8A]" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-[#1B4F8A]">Solo cajas de este Gran Sorteo</span>
                <span className="text-gray-400 ml-1">(excluye cajas del sorteo principal)</span>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.soloVendidas as boolean}
                onChange={(e) => setField("soloVendidas", e.target.checked)} className="w-4 h-4 accent-[#1B4F8A]" />
              <span className="text-sm text-gray-700">
                Solo cajas vendidas <span className="text-gray-400">(excluye reservas no completadas)</span>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.minCajas as boolean}
                onChange={(e) => setField("minCajas", e.target.checked)} className="w-4 h-4 accent-purple-600" />
              <span className="text-sm text-purple-700 font-bold">⭐ Exclusivo para compradores de 10+ cajas</span>
            </label>
          </div>
          <button onClick={crearSorteoPrevio} disabled={creando}
            className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-md">
            {creando ? "Creando..." : "Crear sorteo previo"}
          </button>
        </div>
      )}

      {!granSorteoSeleccionado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Selecciona un Gran Sorteo</h2>
          <p className="text-gray-500 text-sm">Elige el Gran Sorteo para gestionar sus sorteos previos.</p>
        </div>
      )}

      {granSorteoSeleccionado && cargando && (
        <div className="text-center py-12 text-gray-400">Cargando sorteos previos...</div>
      )}

      {granSorteoSeleccionado && !cargando && (
        <>
          {sorteosPrevios.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No hay sorteos previos</h2>
              <p className="text-gray-500 text-sm mb-4">Crea el primer sorteo previo para este Gran Sorteo.</p>
              <button onClick={() => setMostrarForm(true)}
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm">
                + Nuevo sorteo previo
              </button>
            </div>
          )}

          {activos.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                Próximos sorteos previos
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{activos.length}</span>
              </h2>
              <div className="space-y-4">
                {activos.map((sp) => (
                  <TarjetaSorteoPrevio key={sp.id} sp={sp} onEjecutar={ejecutarSorteoPrevio} onEliminar={eliminarSorteoPrevio} ejecutando={ejecutandoId === sp.id} />
                ))}
              </div>
            </section>
          )}

          {finalizados.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                Sorteos previos ejecutados
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{finalizados.length}</span>
              </h2>
              <div className="space-y-4">
                {finalizados.map((sp) => (
                  <TarjetaSorteoPrevio key={sp.id} sp={sp} onEjecutar={ejecutarSorteoPrevio} onEliminar={eliminarSorteoPrevio} ejecutando={ejecutandoId === sp.id} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <OverlayAnimacion
        activo={overlayActivo}
        numAnimacion={numAnimacion}
        animTerminada={animTerminada}
        onTerminado={() => setAnimTerminada(true)}
        onCerrar={cerrarOverlay}
        badge={pendienteNombre ?? "Sorteo Previo"}
        ganadores={pendienteGanadores}
        textoBoton="Ver resultados →"
      />
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "principal", label: "Sorteo Principal", icon: "🎰" },
  { id: "anticipadas", label: "Anticipadas", icon: "🎯" },
  { id: "grandes", label: "Grandes Sorteos", icon: "🏆" },
  { id: "previos", label: "Sorteos Previos", icon: "📋" },
];

export default function MotorSorteos() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<TabId>("principal");
  const [granSorteoIdPrevios, setGranSorteoIdPrevios] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  function irAPrevios(granSorteoId: string) {
    setGranSorteoIdPrevios(granSorteoId);
    setTabActivo("previos");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
              ← Panel Admin
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Motor de Sorteos</h1>
              <p className="text-gray-500 text-sm">Gestión centralizada de todos los sorteos</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabActivo(t.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    tabActivo === t.id
                      ? "border-b-2 border-[#1B4F8A] text-[#1B4F8A] bg-[#1B4F8A]/5"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tabActivo === "principal"  && <TabPrincipal />}
          {tabActivo === "anticipadas" && <TabAnticipadas />}
          {tabActivo === "grandes"    && <TabGrandes onVerPrevios={irAPrevios} />}
          {tabActivo === "previos"    && <TabPrevios initialGranSorteoId={granSorteoIdPrevios} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
