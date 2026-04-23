"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RuletaSorteo from "@/components/RuletaSorteo";
import CountdownAnticipada from "@/components/CountdownAnticipada";
import Link from "next/link";

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

const FORM_INICIAL = {
  nombre: "",
  descripcion: "",
  premioDescripcion: "",
  premioValor: "",
  cantidadGanadores: "5",
  soloVendidas: true,
  minCajas: false,
  fecha: "",
};

// ── Tarjeta de selección ────────────────────────────────────────────────────

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
      {/* Cabecera */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-gray-900 text-lg truncate">{a.nombre}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                a.estado === "EJECUTADO"
                  ? "bg-green-100 text-green-700"
                  : yaFue
                  ? "bg-orange-100 text-orange-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {a.estado === "EJECUTADO" ? "✓ Ejecutado" : yaFue ? "Pendiente de ejecución" : "Próximamente"}
              </span>
            </div>
            {a.descripcion && (
              <p className="text-gray-500 text-sm">{a.descripcion}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#F5A623]/10 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Premio</p>
            <p className="font-extrabold text-[#b87b00] text-sm leading-tight">{a.premioDescripcion}</p>
            {a.premioValor && (
              <p className="text-xs text-gray-400">${a.premioValor.toLocaleString("es-CO")}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Ganadores</p>
            <p className="font-extrabold text-[#1B4F8A]">{a.cantidadGanadores}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Elegibles</p>
            <p className="font-extrabold text-gray-700 text-sm">{a.soloVendidas ? "Solo vendidas" : "Vendidas + reservadas"}</p>
            {a.minCajas > 0 && (
              <p className="text-xs text-purple-600 font-semibold mt-0.5">⭐ {a.minCajas}+ cajas</p>
            )}
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

        {/* Countdown o ganadores count */}
        {a.estado === "PENDIENTE" && !yaFue && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-500 text-sm">Faltan:</span>
            <CountdownAnticipada fecha={a.fecha} />
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          {a.estado === "PENDIENTE" && (
            <button
              onClick={() => onEjecutar(a.id)}
              disabled={ejecutando}
              className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg"
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

      {/* Lista de ganadores */}
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

// ── Página principal ────────────────────────────────────────────────────────

export default function AdminAnticipadas() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [anticipadas, setAnticipadas] = useState<Anticipada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ejecutandoId, setEjecutandoId] = useState<string | null>(null);

  // Animación
  const [overlayActivo, setOverlayActivo] = useState(false);
  const [numAnimacion, setNumAnimacion] = useState("0000");
  const [animTerminada, setAnimTerminada] = useState(false);
  const [pendienteGanadores, setPendienteGanadores] = useState<Ganador[] | null>(null);
  const [pendienteId, setPendienteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  async function cargar() {
    const res = await fetch("/api/admin/anticipadas");
    const json = await res.json();
    setAnticipadas(json.anticipadas ?? []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

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
    setForm(FORM_INICIAL);
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

    if (!res.ok) {
      alert(json.mensaje);
      cargar();
      return;
    }

    // Iniciar animación con el número de caja del primer ganador
    const ganadores: Ganador[] = json.ganadores ?? [];
    const numParaAnimar = ganadores[0]?.numeroCaja ?? String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setPendienteGanadores(ganadores);
    setPendienteId(id);
    setNumAnimacion(numParaAnimar);
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
    if (pendienteId) {
      cargar();
      setPendienteId(null);
      setPendienteGanadores(null);
    }
  }

  const pendientes = anticipadas.filter((a) => a.estado === "PENDIENTE");
  const ejecutadas = anticipadas.filter((a) => a.estado === "EJECUTADO");

  if (status === "loading" || cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
                ← Panel Admin
              </Link>
              <div>
                <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Selecciones Anticipadas</h1>
                <p className="text-gray-500 text-sm">Sorteos previos al evento principal</p>
              </div>
            </div>
            <button
              onClick={() => { setMostrarForm(!mostrarForm); setErrorForm(""); }}
              className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm"
            >
              {mostrarForm ? "× Cancelar" : "+ Nueva selección"}
            </button>
          </div>

          {/* Formulario */}
          {mostrarForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Crear nueva selección anticipada</h2>

              {errorForm && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                  <p className="text-red-700 text-sm">{errorForm}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nombre del evento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setField("nombre", e.target.value)}
                    placeholder="Selección Viernes #1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Descripción del premio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.premioDescripcion}
                    onChange={(e) => setField("premioDescripcion", e.target.value)}
                    placeholder="$100.000, Licuadora, Mercado..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valor del premio en pesos (opcional)
                  </label>
                  <input
                    type="number"
                    value={form.premioValor}
                    onChange={(e) => setField("premioValor", e.target.value)}
                    placeholder="100000"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Cantidad de ganadores
                  </label>
                  <input
                    type="number"
                    value={form.cantidadGanadores}
                    onChange={(e) => setField("cantidadGanadores", e.target.value)}
                    min="1"
                    max="100"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Fecha y hora del evento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha}
                    onChange={(e) => setField("fecha", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Descripción adicional (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.descripcion}
                    onChange={(e) => setField("descripcion", e.target.value)}
                    placeholder="Detalles del evento..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="soloVendidas"
                  checked={form.soloVendidas}
                  onChange={(e) => setField("soloVendidas", e.target.checked)}
                  className="w-4 h-4 accent-[#1B4F8A]"
                />
                <label htmlFor="soloVendidas" className="text-sm font-medium text-gray-700">
                  Solo cajas vendidas (recomendado — excluye reservas no completadas)
                </label>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <input
                  type="checkbox"
                  id="minCajas"
                  checked={form.minCajas}
                  onChange={(e) => setField("minCajas", e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <label htmlFor="minCajas" className="text-sm font-medium text-gray-700">
                  <span className="text-purple-700 font-bold">⭐ Exclusivo para compradores de 10+ cajas</span>
                  <span className="text-gray-400 ml-1">(participan solo quienes hayan comprado 10 o más cajas)</span>
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

          {/* Sin selecciones */}
          {anticipadas.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No hay selecciones anticipadas</h2>
              <p className="text-gray-500 text-sm mb-4">
                Crea la primera selección para empezar a sortear premios anticipados.
              </p>
              <button
                onClick={() => setMostrarForm(true)}
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm"
              >
                + Nueva selección
              </button>
            </div>
          )}

          {/* Pendientes */}
          {pendientes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                Próximas selecciones
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendientes.length}
                </span>
              </h2>
              <div className="space-y-4">
                {pendientes.map((a) => (
                  <TarjetaAnticipada
                    key={a.id}
                    a={a}
                    onEjecutar={ejecutarAnticipada}
                    onEliminar={eliminarAnticipada}
                    ejecutando={ejecutandoId === a.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ejecutadas */}
          {ejecutadas.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                Selecciones ejecutadas
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {ejecutadas.length}
                </span>
              </h2>
              <div className="space-y-4">
                {ejecutadas.map((a) => (
                  <TarjetaAnticipada
                    key={a.id}
                    a={a}
                    onEjecutar={ejecutarAnticipada}
                    onEliminar={eliminarAnticipada}
                    ejecutando={ejecutandoId === a.id}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
      <Footer />

      {/* ── Overlay de animación ──────────────────────────────────────────── */}
      {overlayActivo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{ maxWidth: "520px", width: "100%" }}>

            {/* Título de la selección */}
            {pendienteId && (
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <span style={{
                  background: "rgba(245,166,35,0.15)",
                  border: "1px solid rgba(245,166,35,0.4)",
                  color: "#F5A623",
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "2px", textTransform: "uppercase",
                  padding: "4px 14px", borderRadius: "20px",
                }}>
                  {anticipadas.find(a => a.id === pendienteId)?.nombre ?? "Selección anticipada"}
                </span>
              </div>
            )}

            <RuletaSorteo
              numeroGanador={numAnimacion}
              activo={overlayActivo}
              onTerminado={() => setAnimTerminada(true)}
            />

            {animTerminada && pendienteGanadores && (
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
                {pendienteGanadores.map((g, i) => (
                  <div key={g.userId + g.numeroCaja} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 0",
                    borderBottom: i < pendienteGanadores.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
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
              <div style={{ marginTop: "16px", textAlign: "center" }}>
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
                  Ver resultados →
                </button>
              </div>
            )}

            {!animTerminada && (
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <button
                  onClick={cerrarOverlay}
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
      )}
    </div>
  );
}
