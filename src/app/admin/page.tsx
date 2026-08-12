"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Stats {
  vendidas: number; reservadas: number; disponibles: number;
  usuarios: number; retirosPendientes: number;
  totalRecaudo: number; fondoPremios: number; gananciaEstimada: number;
  precioCaja: number; porcentajeVendido: string;
}

interface Usuario {
  id: string; nombre: string; apellido: string; documento: string;
  correo: string; celular: string; ciudad: string; departamento: string;
  saldoPuntos: number; activo: boolean; confirmado: boolean;
  fechaRegistro: string; _count: { cajas: number };
}

interface CajaAdmin {
  id: string; numero: string; estado: string; fechaCompra: string | null;
  user: { nombre: string; apellido: string; correo: string; celular: string } | null;
}

interface Retiro {
  id: string; monto: number; montoNeto: number | null; estado: string;
  cuentaDestino: string; fecha: string; preAprobadoEn: string | null;
  retencion: number | null; porcentajeRetencion: number | null; notaRetencion: string | null;
  confirmado: boolean;
  user: { nombre: string; apellido: string; correo: string; celular: string; banco: string | null };
}

interface Concepto {
  id: string; nombre: string; porcentaje: number;
}

type Tab = "stats" | "usuarios" | "cajas" | "retiros";

function StatCard({
  titulo, valor, subtitulo, color, icono,
}: { titulo: string; valor: string; subtitulo: string; color: string; icono: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{titulo}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{valor}</p>
          <p className="text-gray-400 text-xs mt-0.5">{subtitulo}</p>
        </div>
        <span className="text-3xl">{icono}</span>
      </div>
    </div>
  );
}

function TablaUsuarios() {
  const [data, setData] = useState<{ usuarios: Usuario[]; total: number } | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/usuarios?pagina=${pagina}`)
      .then((r) => r.json())
      .then(setData);
  }, [pagina]);

  if (!data) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Documento</th>
              <th className="px-4 py-3 font-semibold hidden lg:table-cell">Ciudad</th>
              <th className="px-4 py-3 font-semibold">Membresías</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                  <p className="text-gray-400 text-xs">{u.correo}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{u.documento}</td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{u.ciudad}</td>
                <td className="px-4 py-3 font-bold text-[#1B4F8A]">{u._count.cajas}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ${u.saldoPuntos.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>{data.total} usuarios registrados</span>
        <div className="flex gap-2">
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            ‹ Anterior
          </button>
          <button onClick={() => setPagina(p => p + 1)} disabled={data.usuarios.length < 20}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  );
}

function TablaCajas() {
  const [data, setData] = useState<{ cajas: CajaAdmin[]; total: number } | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/cajas-vendidas?pagina=${pagina}`)
      .then((r) => r.json())
      .then(setData);
  }, [pagina]);

  if (!data) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Propietario</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.cajas.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-extrabold text-[#1B4F8A] text-lg tracking-widest">
                    {c.numero}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    c.estado === "VENDIDA"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.user ? (
                    <>
                      <p className="font-medium">{c.user.nombre} {c.user.apellido}</p>
                      <p className="text-gray-400 text-xs">{c.user.correo}</p>
                    </>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                  {c.fechaCompra
                    ? new Date(c.fechaCompra).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>{data.total} membresías ocupadas</span>
        <div className="flex gap-2">
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">‹</button>
          <button onClick={() => setPagina(p => p + 1)} disabled={data.cajas.length < 50}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">›</button>
        </div>
      </div>
    </div>
  );
}

function TablaRetiros() {
  const [retiros,    setRetiros]    = useState<Retiro[]>([]);
  const [pendientes, setPendientes] = useState<Retiro[]>([]);
  const [conceptos,  setConceptos]  = useState<Concepto[]>([]);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);
  const [mensaje,    setMensaje]    = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);

  // Modales
  const [modalRechazo,   setModalRechazo]   = useState<{ id: string; nombre: string } | null>(null);
  const [motivoRechazo,  setMotivoRechazo]  = useState("");
  const [modalConfirmar, setModalConfirmar] = useState<Retiro | null>(null);
  const [modalMasivo,    setModalMasivo]    = useState(false);

  // Pre-aprobar y aprobar en un solo paso (sin esperar al asistente)
  const [modalPreYAprobar, setModalPreYAprobar] = useState<{ id: string; monto: number; nombre: string } | null>(null);
  const [retencionesElegidas, setRetencionesElegidas] = useState<Set<string>>(new Set());

  // Selección masiva
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const cargar = useCallback(() => {
    Promise.all([
      fetch("/api/admin/retiros").then((r) => r.json()),
      fetch("/api/asistente/conceptos-retencion").then((r) => r.json()),
    ]).then(([d, dc]) => {
      setRetiros(d.retiros ?? []);
      setPendientes(d.pendientes ?? []);
      setConceptos(dc.conceptos ?? []);
      setSeleccionados(new Set()); // limpiar selección al recargar
    });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const calcularRetenciones = (monto: number) => {
    const lineas = conceptos
      .filter((c) => retencionesElegidas.has(c.id))
      .map((c) => ({ id: c.id, nombre: c.nombre, porcentaje: c.porcentaje, monto: Math.round(monto * (c.porcentaje / 100)) }));
    const totalRetenido = lineas.reduce((s, l) => s + l.monto, 0);
    return { lineas, totalRetenido, neto: monto - totalRetenido };
  };

  const { lineas: lineasPreYAprobar, totalRetenido: totalRetenidoPreYAprobar } = modalPreYAprobar
    ? calcularRetenciones(modalPreYAprobar.monto)
    : { lineas: [], totalRetenido: 0 };

  function toggleRetencion(id: string) {
    setRetencionesElegidas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Reusa los dos endpoints ya existentes (pre-aprobar del asistente, aprobar
  // del admin) en vez de duplicar la lógica de retenciones/transacción — si
  // el segundo paso llegara a fallar, el retiro queda PRE_APROBADO (visible
  // arriba para aprobarlo a mano), nunca en un estado roto a medias.
  async function confirmarPreYAprobar() {
    if (!modalPreYAprobar) return;
    const { id } = modalPreYAprobar;
    setProcesando(id);
    const resPre = await fetch(`/api/asistente/retiros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "pre-aprobar", conceptosIds: Array.from(retencionesElegidas) }),
    });
    if (!resPre.ok) {
      const json = await resPre.json();
      setMensaje({ texto: json.mensaje, tipo: "error" });
      setModalPreYAprobar(null);
      setRetencionesElegidas(new Set());
      setProcesando(null);
      cargar();
      return;
    }
    const resAprobar = await fetch(`/api/admin/retiros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const json = await resAprobar.json();
    setMensaje({ texto: json.mensaje, tipo: resAprobar.ok ? "ok" : "error" });
    setModalPreYAprobar(null);
    setRetencionesElegidas(new Set());
    setProcesando(null);
    cargar();
  }

  // ── Individual ──────────────────────────────────────────────────────────────
  async function aprobarUno(id: string) {
    setModalConfirmar(null);
    setProcesando(id);
    const res  = await fetch(`/api/admin/retiros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const json = await res.json() as { mensaje: string };
    setMensaje({ texto: json.mensaje, tipo: res.ok ? "ok" : "error" });
    setProcesando(null);
    cargar();
  }

  async function rechazar() {
    if (!modalRechazo) return;
    setProcesando(modalRechazo.id);
    const res  = await fetch(`/api/admin/retiros/${modalRechazo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivoRechazo }),
    });
    const json = await res.json() as { mensaje: string };
    setMensaje({ texto: json.mensaje, tipo: res.ok ? "ok" : "error" });
    setModalRechazo(null);
    setMotivoRechazo("");
    setProcesando(null);
    cargar();
  }

  // ── Masivo ──────────────────────────────────────────────────────────────────
  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleTodos() {
    if (seleccionados.size === retiros.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(retiros.map((r) => r.id)));
    }
  }

  async function aprobarMasivo() {
    setModalMasivo(false);
    setProcesandoMasivo(true);
    const ids = [...seleccionados];
    const res  = await fetch("/api/admin/retiros/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json() as { ok: number; error: number };
    setMensaje({
      texto: `${json.ok} retiro${json.ok !== 1 ? "s" : ""} aprobado${json.ok !== 1 ? "s" : ""}${json.error > 0 ? ` · ${json.error} con error` : ""}.`,
      tipo: json.error === 0 ? "ok" : "error",
    });
    setProcesandoMasivo(false);
    cargar();
  }

  // ── Datos derivados ─────────────────────────────────────────────────────────
  const retirosSeleccionados = retiros.filter((r) => seleccionados.has(r.id));
  const totalSeleccionado    = retirosSeleccionados.reduce((s, r) => s + (r.montoNeto ?? r.monto), 0);
  const todosSeleccionados   = retiros.length > 0 && seleccionados.size === retiros.length;
  const totalItems           = retiros.length + pendientes.length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">✅</p>
        <p className="font-medium">No hay retiros en proceso</p>
      </div>
    );
  }

  return (
    <div className="pb-24">

      {/* Mensaje de resultado */}
      {mensaje && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${
          mensaje.tipo === "ok"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {mensaje.texto}
          <button onClick={() => setMensaje(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* ── PRE_APROBADOS ─────────────────────────────────────────────────── */}
      {retiros.length > 0 && (
        <div className="mb-6">
          {/* Cabecera con "seleccionar todos" */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={toggleTodos}
                className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer"
                title="Seleccionar todos"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                Pre-aprobados — aprobación final ({retiros.length})
              </h3>
            </div>
            {seleccionados.size > 0 && (
              <span className="text-xs text-[#1B4F8A] font-semibold">
                {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {retiros.map((r) => {
              const montoFinal  = r.montoNeto ?? r.monto;
              const marcado     = seleccionados.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`rounded-xl p-4 border transition-colors ${
                    marcado
                      ? "bg-blue-50 border-[#1B4F8A]/40"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <div className="pt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleSeleccion(r.id)}
                        className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{r.user.nombre} {r.user.apellido}</p>
                        <p className="text-gray-500 text-xs">{r.user.correo} · {r.user.celular}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{r.user.banco} · {r.cuentaDestino}</p>
                        {r.retencion && r.retencion > 0 && (
                          <div className="mt-2 bg-white rounded-lg px-3 py-2 border border-amber-100 text-xs">
                            <p className="text-gray-500">
                              Bruto: <span className="font-semibold">${fmt(r.monto)}</span>
                              {" · "}
                              Retención ({r.porcentajeRetencion}%): <span className="font-semibold text-red-600">−${fmt(r.retencion)}</span>
                            </p>
                            {r.notaRetencion && <p className="text-gray-400 mt-0.5">{r.notaRetencion}</p>}
                            <p className="font-bold text-green-700 mt-0.5">Neto: ${fmt(montoFinal)}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Pre-aprobado: {r.preAprobadoEn ? new Date(r.preAprobadoEn).toLocaleString("es-CO") : "—"}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xl font-extrabold text-[#1B4F8A]">${fmt(montoFinal)}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModalConfirmar(r)}
                            disabled={!!procesando || procesandoMasivo}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            {procesando === r.id ? "..." : "Aprobar y pagar"}
                          </button>
                          <button
                            onClick={() => { setModalRechazo({ id: r.id, nombre: `${r.user.nombre} ${r.user.apellido}` }); setMotivoRechazo(""); }}
                            disabled={!!procesando || procesandoMasivo}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PENDIENTES ────────────────────────────────────────────────────── */}
      {pendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wide">
              Sin pre-aprobación del asistente ({pendientes.length})
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            No hace falta esperar al asistente — puedes pre-aprobar y aprobar tú mismo en un solo paso.
          </p>
          <div className="space-y-3">
            {pendientes.map((r) => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-700">{r.user.nombre} {r.user.apellido}</p>
                    <p className="text-gray-400 text-xs">{r.user.correo} · {r.user.celular}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.user.banco} · {r.cuentaDestino}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.fecha).toLocaleString("es-CO")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-lg font-extrabold text-gray-500">${fmt(r.monto)}</span>
                    {!r.confirmado && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium">⏳ Esperando OTP</span>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setModalPreYAprobar({ id: r.id, monto: r.monto, nombre: `${r.user.nombre} ${r.user.apellido}` });
                          setRetencionesElegidas(new Set());
                        }}
                        disabled={!!procesando || procesandoMasivo}
                        className="bg-[#102463] hover:bg-[#173592] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        {procesando === r.id ? "..." : "Pre-aprobar y aprobar"}
                      </button>
                      <button
                        onClick={() => { setModalRechazo({ id: r.id, nombre: `${r.user.nombre} ${r.user.apellido}` }); setMotivoRechazo(""); }}
                        disabled={!!procesando || procesandoMasivo}
                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Barra de acción masiva (sticky bottom) ──────────────────────── */}
      {seleccionados.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1B4F8A] shadow-2xl border-t border-blue-700 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="text-white">
              <p className="font-bold text-sm">
                {seleccionados.size} retiro{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
              </p>
              <p className="text-blue-200 text-xs">
                Total a pagar: <span className="font-bold text-white">${fmt(totalSeleccionado)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSeleccionados(new Set())}
                className="border border-blue-400 text-blue-200 hover:text-white hover:border-blue-200 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setModalMasivo(true)}
                disabled={procesandoMasivo}
                className="bg-[#F5A623] hover:bg-yellow-400 disabled:opacity-50 text-[#1B4F8A] font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md"
              >
                {procesandoMasivo ? "Procesando..." : `💸 Aprobar ${seleccionados.size} retiro${seleccionados.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación individual ────────────────────────────────── */}
      {modalConfirmar && (() => {
        const montoFinal = modalConfirmar.montoNeto ?? modalConfirmar.monto;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">💸</div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">¿Confirmar pago?</h2>
                  <p className="text-gray-400 text-xs">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Beneficiario</span>
                  <span className="font-semibold text-gray-900">{modalConfirmar.user.nombre} {modalConfirmar.user.apellido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Banco</span>
                  <span className="font-semibold text-gray-700">{modalConfirmar.user.banco ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cuenta destino</span>
                  <span className="font-semibold text-gray-700 text-right max-w-[60%]">{modalConfirmar.cuentaDestino}</span>
                </div>
                {modalConfirmar.retencion && modalConfirmar.retencion > 0 && (
                  <>
                    <div className="flex justify-between text-red-600">
                      <span>Retención ({modalConfirmar.porcentajeRetencion}%)</span>
                      <span className="font-semibold">−${fmt(modalConfirmar.retencion)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                  <span className="font-bold text-gray-800">Monto a consignar</span>
                  <span className="font-extrabold text-green-700 text-lg">${fmt(montoFinal)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalConfirmar(null)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => aprobarUno(modalConfirmar.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Confirmar pago
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal confirmación masiva ─────────────────────────────────────── */}
      {modalMasivo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-xl flex-shrink-0">💸</div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Aprobación masiva</h2>
                <p className="text-gray-400 text-xs">{seleccionados.size} pagos · Total ${fmt(totalSeleccionado)} COP</p>
              </div>
            </div>

            {/* Lista de retiros seleccionados */}
            <div className="max-h-56 overflow-y-auto space-y-2 mb-5">
              {retirosSeleccionados.map((r) => {
                const mf = r.montoNeto ?? r.monto;
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 leading-tight">{r.user.nombre} {r.user.apellido}</p>
                      <p className="text-xs text-gray-400">{r.cuentaDestino}</p>
                    </div>
                    <span className="font-bold text-green-700 flex-shrink-0 ml-3">${fmt(mf)}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200 flex justify-between items-center mb-5">
              <span className="text-sm font-bold text-gray-700">Total a pagar</span>
              <span className="text-xl font-extrabold text-green-700">${fmt(totalSeleccionado)}</span>
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center">
              Se notificará a cada usuario y se registrará en auditoría. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalMasivo(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={aprobarMasivo}
                className="flex-1 bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md"
              >
                Confirmar {seleccionados.size} pagos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rechazo individual ──────────────────────────────────────── */}
      {modalRechazo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-extrabold text-red-600 mb-1">Rechazar retiro</h2>
            <p className="text-gray-500 text-sm mb-4">{modalRechazo.nombre} — el saldo será devuelto al usuario.</p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
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

      {/* ── Modal pre-aprobar y aprobar (admin, sin esperar al asistente) ── */}
      {modalPreYAprobar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-extrabold text-[#102463]">Pre-aprobar y aprobar</h2>
              <p className="text-gray-500 text-sm mt-0.5">{modalPreYAprobar.nombre}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto solicitado</span>
                  <span className="font-bold">${fmt(modalPreYAprobar.monto)}</span>
                </div>
                {lineasPreYAprobar.map((l) => (
                  <div key={l.id} className="flex justify-between text-red-600">
                    <span>{l.nombre} ({l.porcentaje}%)</span>
                    <span>− ${fmt(l.monto)}</span>
                  </div>
                ))}
                {totalRetenidoPreYAprobar > 0 && (
                  <div className="flex justify-between text-red-700 font-semibold border-t border-gray-200 pt-1.5">
                    <span>Total retenido</span>
                    <span>− ${fmt(totalRetenidoPreYAprobar)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-green-700 border-t border-gray-200 pt-1.5">
                  <span>Monto neto a pagar</span>
                  <span>${fmt(modalPreYAprobar.monto - totalRetenidoPreYAprobar)}</span>
                </div>
              </div>

              {conceptos.length > 0 ? (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">Retenciones e impuestos a aplicar</p>
                  <div className="space-y-2">
                    {conceptos.map((c) => {
                      const checked = retencionesElegidas.has(c.id);
                      const montoConcepto = Math.round(modalPreYAprobar.monto * (c.porcentaje / 100));
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                            checked ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRetencion(c.id)}
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
                            {checked && <p className="text-xs text-red-500">−${fmt(montoConcepto)}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {retencionesElegidas.size === 0 && (
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
                onClick={() => { setModalPreYAprobar(null); setRetencionesElegidas(new Set()); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPreYAprobar}
                disabled={!!procesando}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {procesando ? "Procesando..." : `Pagar — $${fmt(modalPreYAprobar.monto - totalRetenidoPreYAprobar)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>("stats");
  const [descargandoBackup, setDescargandoBackup] = useState(false);

  async function descargarBackup() {
    setDescargandoBackup(true);
    try {
      const res = await fetch("/api/admin/backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-club10k-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargandoBackup(false);
    }
  }
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const cargarStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setUltimaActualizacion(new Date()); });
  }, []);

  useEffect(() => {
    cargarStats();
    intervaloRef.current = setInterval(cargarStats, 30_000);
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, [cargarStats]);

  if (status === "loading" || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando panel...</div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "stats", label: "Resumen" },
    { key: "usuarios", label: "Usuarios", badge: stats.usuarios },
    { key: "cajas", label: "Membresías ocupadas", badge: stats.vendidas + stats.reservadas },
    { key: "retiros", label: "Retiros", badge: stats.retirosPendientes || undefined },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Panel de Administración</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-500 text-sm">Tienda 10K</p>
                {ultimaActualizacion && (
                  <span className="text-gray-400 text-xs">
                    · Actualizado {ultimaActualizacion.toLocaleTimeString("es-CO", { timeStyle: "short" })}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={cargarStats}
              className="border border-gray-200 hover:border-[#1B4F8A] text-gray-500 hover:text-[#1B4F8A] font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              ↻ Actualizar
            </button>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              titulo="Membresías vendidas"
              valor={stats.vendidas.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              subtitulo={`${stats.porcentajeVendido}% del total`}
              color="border-[#1B4F8A]"
              icono="📦"
            />
            <StatCard
              titulo="Recaudo total"
              valor={`$${(stats.totalRecaudo / 1_000_000).toFixed(1)}M`}
              subtitulo={`${stats.vendidas} × $${stats.precioCaja.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`}
              color="border-green-500"
              icono="💰"
            />
            <StatCard
              titulo="Fondo de premios"
              valor={`$${(stats.fondoPremios / 1_000_000).toFixed(1)}M`}
              subtitulo="60% del recaudo"
              color="border-[#F5A623]"
              icono="🏆"
            />
            <StatCard
              titulo="Ganancia operación"
              valor={`$${(stats.gananciaEstimada / 1_000_000).toFixed(1)}M`}
              subtitulo="40% del recaudo"
              color="border-purple-500"
              icono="🎪"
            />
          </div>

          {/* Barra de progreso de ventas */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progreso de ventas</span>
              <span className="text-gray-500">
                {stats.vendidas.toLocaleString("es-CO", { maximumFractionDigits: 0 })} / 10,000
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-[#1B4F8A] to-[#F5A623] h-4 rounded-full transition-all"
                style={{ width: `${stats.porcentajeVendido}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span className="text-green-600 font-medium">{stats.disponibles.toLocaleString("es-CO", { maximumFractionDigits: 0 })} disponibles</span>
              <span className="text-orange-500 font-medium">{stats.reservadas} reservadas</span>
              <span className="text-red-500 font-medium">{stats.vendidas} vendidas</span>
            </div>
          </div>

          {/* ── Grid de módulos ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

            {/* Selecciones & Red */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Selecciones &amp; Red</p>
              </div>
              <div className="px-2 pb-3 space-y-1">
                <Link href="/admin/motor-sorteos"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F5A623]/10 hover:bg-[#F5A623]/20 border border-[#F5A623]/30 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-[#F5A623] flex items-center justify-center text-lg flex-shrink-0">🎯</span>
                  <div>
                    <p className="text-sm font-bold text-[#8a5a00] leading-tight">Centro de Selecciones</p>
                    <p className="text-[10px] text-yellow-700/60">Principal, Anticipadas, Grandes y Previas</p>
                  </div>
                  <span className="ml-auto text-[#b87b00] opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
              </div>
            </div>

            {/* Finanzas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1B4F8A]" />
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Finanzas</p>
              </div>
              <div className="px-2 pb-3 space-y-1">
                <Link href="/admin/usuarios"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">👤</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Gestión de Usuarios</p>
                    <p className="text-[10px] text-gray-400">Roles, saldo, cuenta bancaria</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/reportes"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">📊</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Reportes</p>
                    <p className="text-[10px] text-gray-400">Ventas, selecciones, usuarios CSV/PDF</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/retenciones"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Retenciones</p>
                    <p className="text-[10px] text-gray-400">Conceptos de descuento en retiros</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/pagos-manuales"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">📲</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Pagos por transferencia</p>
                    <p className="text-[10px] text-gray-400">Aprobar comprobantes Bre-b / QR</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
              </div>
            </div>

            {/* Sistema */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Sistema</p>
              </div>
              <div className="px-2 pb-3 space-y-1">
                <Link href="/admin/chats"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">💬</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Chats de soporte</p>
                    <p className="text-[10px] text-gray-400">Bot de FAQs + atención en vivo</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/notificaciones"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🔔</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Notificaciones</p>
                    <p className="text-[10px] text-gray-400">Avisos en masa y recordatorios</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/auditoria"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🔐</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Auditoría</p>
                    <p className="text-[10px] text-gray-400">Log de acciones del sistema</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <Link href="/admin/configuracion"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">⚙️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">Configuración</p>
                    <p className="text-[10px] text-gray-400">Precios, selección aleatoria, gift cards</p>
                  </div>
                  <span className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                </Link>
                <button
                  onClick={descargarBackup}
                  disabled={descargandoBackup}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 transition-colors group disabled:opacity-50 text-left"
                >
                  <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">💾</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">
                      {descargandoBackup ? "Generando..." : "Backup ahora"}
                    </p>
                    <p className="text-[10px] text-gray-400">Descarga JSON con todos los datos</p>
                  </div>
                  <span className="ml-auto text-green-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">↓</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Monitor en vivo ─────────────────────────────────────── */}
          <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-1">Monitor en vivo</p>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "border-b-2 border-[#1B4F8A] text-[#1B4F8A]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      t.key === "retiros" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "stats" && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Usuarios registrados", valor: stats.usuarios, icono: "👥" },
                    { label: "Membresías reservadas", valor: stats.reservadas, icono: "⏳" },
                    { label: "Retiros pendientes", valor: stats.retirosPendientes, icono: "💸" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                      <span className="text-3xl">{item.icono}</span>
                      <p className="text-2xl font-extrabold text-[#1B4F8A] mt-2">{item.valor}</p>
                      <p className="text-gray-500 text-sm">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "usuarios" && <TablaUsuarios />}
              {tab === "cajas" && <TablaCajas />}
              {tab === "retiros" && <TablaRetiros />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
