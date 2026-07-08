"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface PagoManual {
  id: string;
  referencia: string;
  numeroCaja: string;
  monto: number;
  nombrePagador: string;
  refBancaria: string;
  comprobanteUrl: string | null;
  notas: string | null;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  motivoRechazo: string | null;
  createdAt: string;
  aprobadoEn: string | null;
  usuario: { nombre: string; apellido: string; correo: string; celular: string };
  aprobadoPor: { nombre: string } | null;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700 border-amber-200",
  APROBADO: "bg-green-100 text-green-700 border-green-200",
  RECHAZADO: "bg-red-100 text-red-700 border-red-200",
};

export default function PaginaPagosAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  const [pagos, setPagos] = useState<PagoManual[]>([]);
  const [stats, setStats] = useState({ pendientes: 0, aprobados: 0, rechazados: 0 });
  const [filtro, setFiltro] = useState<"TODOS" | "PENDIENTE" | "APROBADO" | "RECHAZADO">("PENDIENTE");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  // Modal rechazo
  const [modalRechazo, setModalRechazo] = useState<PagoManual | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  // Modal detalle
  const [modalDetalle, setModalDetalle] = useState<PagoManual | null>(null);

  const cargar = useCallback(() => {
    fetch("/api/admin/pagos-manuales")
      .then((r) => r.json())
      .then((d: { pagos: PagoManual[]; pendientes: number; aprobados: number; rechazados: number }) => {
        setPagos(d.pagos ?? []);
        setStats({ pendientes: d.pendientes, aprobados: d.aprobados, rechazados: d.rechazados });
      });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function aprobar(pago: PagoManual) {
    setProcesando(pago.id);
    const res = await fetch(`/api/admin/pagos-manuales/${pago.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const json = await res.json() as { mensaje: string };
    setMensaje({ ok: res.ok, texto: json.mensaje });
    setProcesando(null);
    cargar();
    setTimeout(() => setMensaje(null), 5000);
  }

  async function rechazar() {
    if (!modalRechazo) return;
    setProcesando(modalRechazo.id);
    const res = await fetch(`/api/admin/pagos-manuales/${modalRechazo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivoRechazo }),
    });
    const json = await res.json() as { mensaje: string };
    setMensaje({ ok: res.ok, texto: json.mensaje });
    setModalRechazo(null);
    setMotivoRechazo("");
    setProcesando(null);
    cargar();
    setTimeout(() => setMensaje(null), 5000);
  }

  const pagosFiltrados = filtro === "TODOS" ? pagos : pagos.filter((p) => p.estado === filtro);
  const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  if (status === "loading") return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">

          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/admin" className="text-sm text-blue-600 hover:underline">← Panel admin</Link>
              <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Pagos por transferencia</h1>
            </div>
            <button onClick={cargar} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
              ↻ Actualizar
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Pendientes", valor: stats.pendientes, color: "border-amber-400", icon: "⏳" },
              { label: "Aprobados", valor: stats.aprobados, color: "border-green-400", icon: "✅" },
              { label: "Rechazados", valor: stats.rechazados, color: "border-red-400", icon: "❌" },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${s.color}`}>
                <p className="text-gray-500 text-xs">{s.label}</p>
                <p className="text-3xl font-extrabold text-gray-900 flex items-center gap-2 mt-1">
                  {s.icon} {s.valor}
                </p>
              </div>
            ))}
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium mb-4 flex items-center justify-between ${
              mensaje.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <span>{mensaje.ok ? "✅ " : "❌ "}{mensaje.texto}</span>
              <button onClick={() => setMensaje(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["PENDIENTE", "TODOS", "APROBADO", "RECHAZADO"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  filtro === f ? "bg-[#102463] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "TODOS" ? "Todos" : ESTADO_LABEL[f]}
                {f === "PENDIENTE" && stats.pendientes > 0 && (
                  <span className="ml-1.5 bg-amber-400 text-amber-900 rounded-full px-1.5 py-0.5 text-xs font-bold">{stats.pendientes}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tabla */}
          {pagosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold">No hay pagos {filtro === "TODOS" ? "" : ESTADO_LABEL[filtro].toLowerCase() + "s"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagosFiltrados.map((pago) => (
                <div key={pago.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ESTADO_COLOR[pago.estado]}`}>
                          {ESTADO_LABEL[pago.estado]}
                        </span>
                        <span className="text-2xl font-extrabold text-[#102463]">#{pago.numeroCaja}</span>
                        <span className="text-gray-900 font-bold">${fmt(pago.monto)} COP</span>
                      </div>

                      <p className="text-sm font-semibold text-gray-800">{pago.usuario.nombre} {pago.usuario.apellido}</p>
                      <p className="text-xs text-gray-400">{pago.usuario.correo} · {pago.usuario.celular}</p>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                        <div><span className="font-semibold">Titular:</span> {pago.nombrePagador}</div>
                        <div><span className="font-semibold">Ref. banco:</span> <span className="font-mono">{pago.refBancaria}</span></div>
                        <div><span className="font-semibold">Ref. sistema:</span> <span className="font-mono text-gray-400">{pago.referencia}</span></div>
                        <div><span className="font-semibold">Fecha:</span> {new Date(pago.createdAt).toLocaleString("es-CO")}</div>
                      </div>

                      {pago.notas && (
                        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                          <strong>Notas:</strong> {pago.notas}
                        </p>
                      )}

                      {pago.motivoRechazo && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                          <strong>Motivo rechazo:</strong> {pago.motivoRechazo}
                        </p>
                      )}

                      {pago.aprobadoPor && (
                        <p className="mt-1 text-xs text-gray-400">
                          Procesado por: {pago.aprobadoPor.nombre} · {pago.aprobadoEn ? new Date(pago.aprobadoEn).toLocaleString("es-CO") : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                      {pago.comprobanteUrl && (
                        <a
                          href={pago.comprobanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg text-center"
                        >
                          Ver comprobante
                        </a>
                      )}

                      {pago.estado === "PENDIENTE" && (
                        <>
                          <button
                            onClick={() => aprobar(pago)}
                            disabled={procesando === pago.id}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            {procesando === pago.id ? "..." : "Aprobar"}
                          </button>
                          <button
                            onClick={() => { setModalRechazo(pago); setMotivoRechazo(""); }}
                            disabled={procesando === pago.id}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Modal rechazo */}
      {modalRechazo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalRechazo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Rechazar pago</h3>
            <p className="text-sm text-gray-500 mb-4">
              Membresía <strong>#{modalRechazo.numeroCaja}</strong> de <strong>{modalRechazo.usuario.nombre}</strong>
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional — se enviará al usuario)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModalRechazo(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={rechazar}
                disabled={!!procesando}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl"
              >
                {procesando ? "Rechazando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
