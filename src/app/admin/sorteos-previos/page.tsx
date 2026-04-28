"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RuletaSorteo from "@/components/RuletaSorteo";
import Link from "next/link";

interface GranSorteo {
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
  requisitos: {
    soloVendidas: boolean;
    minCajas: number;
    soloEsteGranSorteo: boolean;
  } | null;
  estado: "ACTIVO" | "FINALIZADO";
  ganadores: Ganador[] | null;
}

interface Ganador {
  userId: string;
  nombre: string;
  apellido: string;
  correo: string;
  numeroCaja: string;
}

const FORM_INICIAL = {
  nombre: "",
  premioDescripcion: "",
  premioValor: "",
  fechaSorteo: "",
  soloVendidas: true,
  minCajas: false,
  soloEsteGranSorteo: false,
  cantidadGanadores: "5",
};

// ── Tarjeta de sorteo previo ───────────────────────────────────────────────

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
            {sp.premioValor && (
              <p className="text-xs text-gray-400">${sp.premioValor.toLocaleString("es-CO")}</p>
            )}
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
            <button
              onClick={() => onEjecutar(sp.id)}
              disabled={ejecutando}
              className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg"
            >
              {ejecutando ? "⏳ Ejecutando..." : "🎯 Ejecutar sorteo previo"}
            </button>
          )}

          {esEjecutado && sp.ganadores && (
            <button
              onClick={() => setGanadoresAbiertos(!ganadoresAbiertos)}
              className="flex-1 border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl text-sm transition-all"
            >
              {ganadoresAbiertos
                ? "▲ Ocultar ganadores"
                : `▼ Ver ${sp.ganadores.length} ganador${sp.ganadores.length !== 1 ? "es" : ""}`}
            </button>
          )}

          {!esEjecutado && (
            <button
              onClick={() => onEliminar(sp.id)}
              disabled={ejecutando}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Lista de ganadores */}
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

// ── Contenido interno (usa searchParams) ──────────────────────────────────

function ContenidoSorteosPrevios() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const granSorteoIdInicial = searchParams.get("granSorteoId") ?? "";

  const [granSorteos, setGranSorteos] = useState<GranSorteo[]>([]);
  const [granSorteoSeleccionado, setGranSorteoSeleccionado] = useState(granSorteoIdInicial);
  const [sorteosPrevios, setSorteosPrevios] = useState<SorteoPrevio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ejecutandoId, setEjecutandoId] = useState<string | null>(null);

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

  useEffect(() => {
    fetch("/api/gran-sorteos")
      .then((r) => r.json())
      .then((d) => setGranSorteos(d.granSorteos ?? []));
  }, []);

  async function cargarPrevios(gsId: string) {
    if (!gsId) { setSorteosPrevios([]); setCargando(false); return; }
    setCargando(true);
    const res = await fetch(`/api/sorteos-previos?granSorteoId=${gsId}`);
    const json = await res.json();
    setSorteosPrevios(json.sorteosPrevios ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarPrevios(granSorteoSeleccionado);
  }, [granSorteoSeleccionado]);

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
    setForm(FORM_INICIAL);
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
    const numParaAnimar = ganadores[0]?.numeroCaja ?? String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setPendienteGanadores(ganadores);
    setPendienteId(id);
    setNumAnimacion(numParaAnimar);
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
    }
  }

  const granSorteoActual = granSorteos.find((gs) => gs.id === granSorteoSeleccionado);
  const activos = sorteosPrevios.filter((sp) => sp.estado === "ACTIVO");
  const finalizados = sorteosPrevios.filter((sp) => sp.estado === "FINALIZADO");

  if (status === "loading") {
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
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                ← Panel Admin
              </Link>
              <div>
                <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Sorteos Previos</h1>
                <p className="text-gray-500 text-sm">Sorteos previos vinculados a Grandes Sorteos</p>
              </div>
            </div>
            <Link
              href="/admin/grandes-sorteos"
              className="border border-[#1B4F8A] text-[#1B4F8A] hover:bg-[#1B4F8A]/5 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              🏆 Grandes Sorteos
            </Link>
          </div>

          {/* Selector Gran Sorteo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ¿A qué Gran Sorteo pertenecen estos sorteos previos?
            </label>
            {granSorteos.length === 0 ? (
              <div className="flex items-center gap-3">
                <p className="text-gray-400 text-sm">No hay Grandes Sorteos creados aún.</p>
                <Link href="/admin/grandes-sorteos" className="text-[#1B4F8A] font-semibold text-sm hover:underline">
                  Crear uno →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={granSorteoSeleccionado}
                  onChange={(e) => {
                    setGranSorteoSeleccionado(e.target.value);
                    setMostrarForm(false);
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                >
                  <option value="">— Selecciona un Gran Sorteo —</option>
                  {granSorteos.map((gs) => (
                    <option key={gs.id} value={gs.id}>
                      {gs.nombre} ({gs.estado})
                    </option>
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

          {/* Formulario crear */}
          {mostrarForm && granSorteoSeleccionado && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Crear sorteo previo</h2>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setField("nombre", e.target.value)}
                    placeholder="Previo #1 — Viernes de cajas"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Premio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.premioDescripcion}
                    onChange={(e) => setField("premioDescripcion", e.target.value)}
                    placeholder="$200.000, Mercado, Cena para dos..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valor del premio (opcional)
                  </label>
                  <input
                    type="number"
                    value={form.premioValor}
                    onChange={(e) => setField("premioValor", e.target.value)}
                    placeholder="200000"
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
                    min="1" max="100"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Fecha y hora <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fechaSorteo}
                    onChange={(e) => setField("fechaSorteo", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
              </div>

              {/* Requisitos */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
                <p className="text-sm font-bold text-gray-700 mb-2">Requisitos de participación</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 accent-[#1B4F8A]"
                  />
                  <span className="text-sm text-gray-700">
                    Solo participantes del Gran Sorteo{" "}
                    <span className="text-gray-400">(siempre activo)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.soloEsteGranSorteo}
                    onChange={(e) => setField("soloEsteGranSorteo", e.target.checked)}
                    className="w-4 h-4 accent-[#1B4F8A]"
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-[#1B4F8A]">Solo cajas de este Gran Sorteo</span>
                    <span className="text-gray-400 ml-1">(excluye cajas del sorteo principal)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.soloVendidas}
                    onChange={(e) => setField("soloVendidas", e.target.checked)}
                    className="w-4 h-4 accent-[#1B4F8A]"
                  />
                  <span className="text-sm text-gray-700">
                    Solo cajas vendidas{" "}
                    <span className="text-gray-400">(excluye reservas no completadas)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.minCajas}
                    onChange={(e) => setField("minCajas", e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">
                    <span className="text-purple-700 font-bold">⭐ Exclusivo para compradores de 10+ cajas</span>
                  </span>
                </label>
              </div>

              <button
                onClick={crearSorteoPrevio}
                disabled={creando}
                className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                {creando ? "Creando..." : "Crear sorteo previo"}
              </button>
            </div>
          )}

          {/* Sin Gran Sorteo seleccionado */}
          {!granSorteoSeleccionado && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Selecciona un Gran Sorteo</h2>
              <p className="text-gray-500 text-sm">
                Elige el Gran Sorteo para gestionar sus sorteos previos.
              </p>
            </div>
          )}

          {/* Contenido */}
          {granSorteoSeleccionado && !cargando && (
            <>
              {sorteosPrevios.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">🎯</p>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">No hay sorteos previos</h2>
                  <p className="text-gray-500 text-sm mb-4">Crea el primer sorteo previo para este Gran Sorteo.</p>
                  <button
                    onClick={() => setMostrarForm(true)}
                    className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm"
                  >
                    + Nuevo sorteo previo
                  </button>
                </div>
              )}

              {activos.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Próximos sorteos previos
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {activos.length}
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {activos.map((sp) => (
                      <TarjetaSorteoPrevio
                        key={sp.id}
                        sp={sp}
                        onEjecutar={ejecutarSorteoPrevio}
                        onEliminar={eliminarSorteoPrevio}
                        ejecutando={ejecutandoId === sp.id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {finalizados.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Sorteos previos ejecutados
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {finalizados.length}
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {finalizados.map((sp) => (
                      <TarjetaSorteoPrevio
                        key={sp.id}
                        sp={sp}
                        onEjecutar={ejecutarSorteoPrevio}
                        onEliminar={eliminarSorteoPrevio}
                        ejecutando={ejecutandoId === sp.id}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {granSorteoSeleccionado && cargando && (
            <div className="text-center py-12 text-gray-400">Cargando sorteos previos...</div>
          )}
        </div>
      </main>
      <Footer />

      {/* ── Overlay animación ─────────────────────────────────────────────── */}
      {overlayActivo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{ maxWidth: "520px", width: "100%" }}>
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
                  {sorteosPrevios.find((s) => s.id === pendienteId)?.nombre ?? "Sorteo Previo"}
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

// ── Export con Suspense (requerido para useSearchParams) ───────────────────

export default function AdminSorteosPrevios() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    }>
      <ContenidoSorteosPrevios />
    </Suspense>
  );
}
