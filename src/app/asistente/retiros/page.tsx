"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface RetiroItem {
  id: string;
  monto: number;
  estado: string;
  cuentaDestino: string;
  fecha: string;
  user: {
    nombre: string;
    apellido: string;
    correo: string;
    celular: string;
    banco: string | null;
    cuentaBancaria: string | null;
    tipoCuenta: string | null;
  };
}

interface Concepto {
  id: string;
  nombre: string;
  porcentaje: number;
}

interface ModalState {
  retiroId: string;
  monto: number;
  nombre: string;
}

function fmt(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export default function AsistenteRetirosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [retiros, setRetiros] = useState<RetiroItem[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);

  // Modal pre-aprobación
  const [modalAprobacion, setModalAprobacion] = useState<ModalState | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  // Modal rechazo
  const [modalRechazo, setModalRechazo] = useState<ModalState | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const rol = (session.user as { rol?: string }).rol;
      if (rol !== "ASISTENTE" && rol !== "ADMIN") router.push("/dashboard");
    }
  }, [session, status, router]);

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([
      fetch("/api/asistente/retiros").then((r) => r.json()),
      fetch("/api/asistente/conceptos-retencion").then((r) => r.json()),
    ]).then(([dataRetiros, dataConceptos]) => {
      setRetiros(dataRetiros.retiros ?? []);
      setConceptos(dataConceptos.conceptos ?? []);
      setCargando(false);
    });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Cálculo en tiempo real basado en conceptos seleccionados
  const calcularRetenciones = (monto: number) => {
    const lineas = conceptos
      .filter((c) => seleccionados.has(c.id))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        porcentaje: c.porcentaje,
        monto: Math.round(monto * (c.porcentaje / 100)),
      }));
    const totalRetenido = lineas.reduce((s, l) => s + l.monto, 0);
    const neto = monto - totalRetenido;
    return { lineas, totalRetenido, neto };
  };

  const { lineas, totalRetenido, neto } = modalAprobacion
    ? calcularRetenciones(modalAprobacion.monto)
    : { lineas: [], totalRetenido: 0, neto: 0 };

  function toggleConcepto(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function preAprobar() {
    if (!modalAprobacion) return;
    setProcesando(modalAprobacion.retiroId);
    const res = await fetch(`/api/asistente/retiros/${modalAprobacion.retiroId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "pre-aprobar",
        conceptosIds: Array.from(seleccionados),
      }),
    });
    const json = await res.json();
    setMensaje({ texto: json.mensaje, tipo: res.ok ? "ok" : "error" });
    setModalAprobacion(null);
    setSeleccionados(new Set());
    setProcesando(null);
    cargar();
  }

  async function rechazar() {
    if (!modalRechazo) return;
    setProcesando(modalRechazo.retiroId);
    const res = await fetch(`/api/asistente/retiros/${modalRechazo.retiroId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivoRechazo }),
    });
    const json = await res.json();
    setMensaje({ texto: json.mensaje, tipo: res.ok ? "ok" : "error" });
    setModalRechazo(null);
    setMotivoRechazo("");
    setProcesando(null);
    cargar();
  }

  if (status === "loading" || cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#102463]">Pre-aprobación de Retiros</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {retiros.length === 0 ? "No hay solicitudes pendientes" : `${retiros.length} solicitud${retiros.length !== 1 ? "es" : ""} pendiente${retiros.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={cargar}
              className="border border-gray-200 hover:border-[#102463] text-gray-600 hover:text-[#102463] font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              ↻ Actualizar
            </button>
          </div>

          {mensaje && (
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm font-medium ${
              mensaje.tipo === "ok"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {mensaje.texto}
              <button onClick={() => setMensaje(null)} className="float-right font-bold">×</button>
            </div>
          )}

          {conceptos.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
              ⚠️ El administrador aún no ha configurado conceptos de retención. Podrás pre-aprobar retiros sin aplicar retenciones.
            </div>
          )}

          {retiros.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-semibold text-gray-700">No hay retiros pendientes</p>
              <p className="text-gray-400 text-sm mt-1">Todas las solicitudes han sido procesadas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {retiros.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-lg">
                        {r.user.nombre} {r.user.apellido}
                      </p>
                      <p className="text-gray-500 text-sm">{r.user.correo} · {r.user.celular}</p>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {r.user.banco} · {r.user.tipoCuenta} · {r.user.cuentaBancaria}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Solicitado: {new Date(r.fecha).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="text-2xl font-extrabold text-[#102463]">
                        ${fmt(r.monto)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setModalAprobacion({ retiroId: r.id, monto: r.monto, nombre: `${r.user.nombre} ${r.user.apellido}` });
                            setSeleccionados(new Set());
                          }}
                          disabled={!!procesando}
                          className="bg-[#102463] hover:bg-[#173592] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                        >
                          Pre-aprobar
                        </button>
                        <button
                          onClick={() => {
                            setModalRechazo({ retiroId: r.id, monto: r.monto, nombre: `${r.user.nombre} ${r.user.apellido}` });
                            setMotivoRechazo("");
                          }}
                          disabled={!!procesando}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* ── Modal pre-aprobación ── */}
      {modalAprobacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-extrabold text-[#102463]">Pre-aprobar retiro</h2>
              <p className="text-gray-500 text-sm mt-0.5">{modalAprobacion.nombre}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Resumen de montos */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto solicitado</span>
                  <span className="font-bold">${fmt(modalAprobacion.monto)}</span>
                </div>
                {lineas.map((l) => (
                  <div key={l.id} className="flex justify-between text-red-600">
                    <span>{l.nombre} ({l.porcentaje}%)</span>
                    <span>− ${fmt(l.monto)}</span>
                  </div>
                ))}
                {totalRetenido > 0 && (
                  <div className="flex justify-between text-red-700 font-semibold border-t border-gray-200 pt-1.5">
                    <span>Total retenido</span>
                    <span>− ${fmt(totalRetenido)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-green-700 border-t border-gray-200 pt-1.5">
                  <span>Monto neto a pagar</span>
                  <span>${fmt(modalAprobacion.monto - totalRetenido)}</span>
                </div>
              </div>

              {/* Conceptos */}
              {conceptos.length > 0 ? (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    Retenciones e impuestos a aplicar
                  </p>
                  <div className="space-y-2">
                    {conceptos.map((c) => {
                      const checked = seleccionados.has(c.id);
                      const montoConcepto = Math.round(modalAprobacion.monto * (c.porcentaje / 100));
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                            checked
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleConcepto(c.id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#102463] cursor-pointer"
                            />
                            <span className={`text-sm font-semibold ${checked ? "text-red-700" : "text-gray-700"}`}>
                              {c.nombre}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-bold ${checked ? "text-red-600" : "text-gray-500"}`}>
                              {c.porcentaje}%
                            </span>
                            {checked && (
                              <p className="text-xs text-red-500">−${fmt(montoConcepto)}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {seleccionados.size === 0 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Sin retenciones seleccionadas — se aprobará el monto completo.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
                  No hay conceptos configurados. Se aprobará el monto completo.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setModalAprobacion(null); setSeleccionados(new Set()); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={preAprobar}
                disabled={!!procesando}
                className="flex-1 bg-[#102463] hover:bg-[#173592] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {procesando ? "Enviando..." : `Confirmar — ${fmt(neto || modalAprobacion.monto)} COP`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rechazo ── */}
      {modalRechazo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-extrabold text-red-600 mb-1">Rechazar retiro</h2>
            <p className="text-gray-500 text-sm mb-1">{modalRechazo.nombre}</p>
            <p className="text-gray-500 text-sm mb-5">
              El saldo de <span className="font-bold">${fmt(modalRechazo.monto)}</span> será devuelto al usuario.
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalRechazo(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={rechazar}
                disabled={!!procesando}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {procesando ? "..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
