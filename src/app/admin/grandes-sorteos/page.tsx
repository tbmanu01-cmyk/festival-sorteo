"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RuletaSorteo from "@/components/RuletaSorteo";
import Link from "next/link";

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

interface Ganador {
  userId: string;
  nombre: string;
  apellido: string;
  correo: string;
  numeroCaja: string;
}

const FORM_INICIAL = {
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

// ── Formulario (crear / editar) ────────────────────────────────────────────

function FormGranSorteo({
  inicial,
  titulo,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  inicial: typeof FORM_INICIAL;
  titulo: string;
  onGuardar: (data: typeof FORM_INICIAL) => void;
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
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Gran Sorteo 10K — Edición 2026"
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
            onChange={(e) => set("premioDescripcion", e.target.value)}
            placeholder="Casa, carro, viaje, $50.000.000..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Valor por caja (COP) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.valorCaja}
            onChange={(e) => set("valorCaja", e.target.value)}
            min="1000"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Fecha de inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.fechaInicio}
            onChange={(e) => set("fechaInicio", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Fecha del sorteo <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.fechaSorteo}
            onChange={(e) => set("fechaSorteo", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado inicial</label>
          <select
            value={form.estado}
            onChange={(e) => set("estado", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          >
            <option value="PENDIENTE">Pendiente (no visible para compra)</option>
            <option value="ACTIVO">Activo (visible y en venta)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Descripción (opcional)
          </label>
          <input
            type="text"
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            placeholder="Detalles adicionales del Gran Sorteo..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onGuardar(form)}
          disabled={guardando}
          className="flex-1 bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-md"
        >
          {guardando ? "Guardando..." : "Guardar Gran Sorteo"}
        </button>
        <button
          onClick={onCancelar}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────

export default function AdminGrandesSorteos() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  async function cargar() {
    const res = await fetch("/api/gran-sorteos");
    const json = await res.json();
    setLista(json.granSorteos ?? []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crearGranSorteo(form: typeof FORM_INICIAL) {
    setErrorForm("");
    if (!form.nombre.trim() || !form.premioDescripcion.trim() || !form.valorCaja || !form.fechaInicio || !form.fechaSorteo) {
      setErrorForm("Nombre, premio, valor por caja, fecha inicio y fecha sorteo son requeridos.");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/gran-sorteos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valorCaja: Number(form.valorCaja),
      }),
    });
    const json = await res.json();
    setGuardando(false);
    if (!res.ok) { setErrorForm(json.mensaje); return; }
    setMostrarForm(false);
    setErrorForm("");
    cargar();
  }

  async function editarGranSorteo(form: typeof FORM_INICIAL) {
    if (!editando) return;
    setErrorForm("");
    setGuardando(true);
    const res = await fetch(`/api/gran-sorteos/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valorCaja: Number(form.valorCaja),
      }),
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

  function cerrarOverlay() {
    setOverlayActivo(false);
    setAnimTerminada(false);
    setPendienteGanadores(null);
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
    : FORM_INICIAL;

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                ← Panel Admin
              </Link>
              <div>
                <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Grandes Sorteos</h1>
                <p className="text-gray-500 text-sm">Sorteos especiales con premio mayor propio</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/sorteos-previos"
                className="border border-[#1B4F8A] text-[#1B4F8A] hover:bg-[#1B4F8A]/5 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                🎯 Sorteos Previos
              </Link>
              <button
                onClick={() => { setMostrarForm(!mostrarForm); setErrorForm(""); setEditando(null); }}
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm"
              >
                {mostrarForm ? "× Cancelar" : "+ Crear Gran Sorteo"}
              </button>
            </div>
          </div>

          {/* Formulario crear */}
          {mostrarForm && !editando && (
            <FormGranSorteo
              inicial={FORM_INICIAL}
              titulo="Crear nuevo Gran Sorteo"
              onGuardar={crearGranSorteo}
              onCancelar={() => { setMostrarForm(false); setErrorForm(""); }}
              guardando={guardando}
              error={errorForm}
            />
          )}

          {/* Formulario editar */}
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

          {/* Sin registros */}
          {lista.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-5xl mb-3">🏆</p>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No hay Grandes Sorteos</h2>
              <p className="text-gray-500 text-sm mb-4">
                Crea el primer Gran Sorteo para comenzar.
              </p>
              <button
                onClick={() => setMostrarForm(true)}
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-6 py-3 rounded-xl transition-colors shadow-md text-sm"
              >
                + Crear Gran Sorteo
              </button>
            </div>
          )}

          {/* Tabla */}
          {lista.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-left">
                      <th className="px-5 py-3.5 font-semibold">Nombre</th>
                      <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Premio</th>
                      <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">Fecha sorteo</th>
                      <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">Valor caja</th>
                      <th className="px-5 py-3.5 font-semibold">Participantes</th>
                      <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Recaudo</th>
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
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="font-semibold text-gray-700">
                              ${gs.valorCaja.toLocaleString("es-CO")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-[#1B4F8A]">{gs.participantes}</span>
                            <span className="text-gray-400 text-xs ml-1">cajas</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="font-semibold text-gray-700 text-xs">
                              ${(gs.valorCaja * gs.participantes).toLocaleString("es-CO")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ESTADO_BADGE[gs.estado]}`}>
                              {ESTADO_LABEL[gs.estado]}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => setDetalle(gs)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Ver
                              </button>
                              {gs.estado !== "FINALIZADO" && (
                                <>
                                  <button
                                    onClick={() => ejecutarGranSorteo(gs)}
                                    disabled={ejecutandoId === gs.id}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F5A623] text-[#1B4F8A] hover:bg-yellow-400 disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    {ejecutandoId === gs.id ? "..." : "Ejecutar"}
                                  </button>
                                  <button
                                    onClick={() => { setEditando(gs); setMostrarForm(false); setErrorForm(""); window.scrollTo(0, 0); }}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#1B4F8A]/30 text-[#1B4F8A] hover:bg-[#1B4F8A]/5 transition-colors"
                                  >
                                    Editar
                                  </button>
                                  {gs.estado === "ACTIVO" && (
                                    <button
                                      onClick={() => desactivarGranSorteo(gs)}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors"
                                    >
                                      Pausar
                                    </button>
                                  )}
                                </>
                              )}
                              {gs.estado === "PENDIENTE" && (
                                <button
                                  onClick={() => eliminarGranSorteo(gs)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                                >
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
        </div>
      </main>
      <Footer />

      {/* ── Modal detalles ─────────────────────────────────────────────────── */}
      {detalle && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setDetalle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1B4F8A]">{detalle.nombre}</h2>
                  {detalle.descripcion && (
                    <p className="text-gray-500 text-sm mt-0.5">{detalle.descripcion}</p>
                  )}
                </div>
                <button
                  onClick={() => setDetalle(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4"
                >
                  ×
                </button>
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
                    <p className="font-extrabold text-[#1B4F8A] text-3xl tracking-[0.4em]">
                      #{detalle.numeroGanador}
                    </p>
                  </div>
                </div>
              )}

              <Link
                href={`/admin/sorteos-previos?granSorteoId=${detalle.id}`}
                className="block w-full text-center bg-[#1B4F8A]/10 hover:bg-[#1B4F8A]/20 text-[#1B4F8A] font-semibold py-2.5 rounded-xl transition-colors text-sm"
                onClick={() => setDetalle(null)}
              >
                🎯 Ver Sorteos Previos de este Gran Sorteo →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay animación ─────────────────────────────────────────────── */}
      {overlayActivo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.97)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{ maxWidth: "520px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{
                background: "rgba(245,166,35,0.15)",
                border: "1px solid rgba(245,166,35,0.4)",
                color: "#F5A623",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "2px", textTransform: "uppercase",
                padding: "4px 14px", borderRadius: "20px",
              }}>
                🏆 Gran Sorteo — Premio Mayor
              </span>
            </div>

            <RuletaSorteo
              numeroGanador={numAnimacion}
              activo={overlayActivo}
              onTerminado={() => setAnimTerminada(true)}
            />

            {animTerminada && pendienteGanadores && pendienteGanadores.length > 0 && (
              <div style={{
                marginTop: "20px",
                background: "rgba(11,25,41,0.9)",
                borderRadius: "16px",
                border: "1px solid rgba(245,166,35,0.4)",
                padding: "20px",
              }}>
                <p style={{
                  color: "#F5A623", fontWeight: 900,
                  fontSize: "13px", letterSpacing: "1px",
                  textAlign: "center", marginBottom: "16px",
                }}>
                  🏆 GANADOR DEL PREMIO MAYOR
                </p>
                {pendienteGanadores.map((g) => (
                  <div key={g.userId} style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: "12px",
                  }}>
                    <div>
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: "16px", margin: 0 }}>
                        {g.nombre} {g.apellido}
                      </p>
                      <p style={{ color: "#7eb3e8", fontSize: "12px", margin: "4px 0 0" }}>{g.correo}</p>
                    </div>
                    <div style={{
                      fontFamily: "'Courier New', monospace",
                      color: "#F5A623", fontWeight: 900, fontSize: "24px",
                    }}>
                      #{g.numeroCaja}
                    </div>
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
