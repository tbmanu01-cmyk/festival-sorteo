"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  icono: string;
  createdAt: string;
  leida: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  SISTEMA: "Sistema",
  SORTEO: "Selección",
  RETIRO: "Retiro",
  PROMO: "Promoción",
  MEMBRESIA: "Membresía",
};

function tiempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-.87 14.14A2 2 0 0 1 16.14 22H7.86a2 2 0 0 1-1.99-1.86L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default function ListaNotificaciones() {
  const { status } = useSession();
  const router = useRouter();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/notificaciones");
    if (res.ok) {
      const data = (await res.json()) as { notificaciones: Notif[]; noLeidas: number };
      setNotifs(data.notificaciones);
      setNoLeidas(data.noLeidas);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") cargar();
  }, [status, cargar]);

  const todasSeleccionadas = notifs.length > 0 && seleccion.size === notifs.length;

  function alternarTodas() {
    setSeleccion(todasSeleccionadas ? new Set() : new Set(notifs.map((n) => n.id)));
  }

  function alternarUna(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function marcarTodas() {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
  }

  async function marcarSeleccionadasLeidas() {
    const ids = Array.from(seleccion);
    setProcesando(true);
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => undefined);
    setNotifs((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, leida: true } : n)));
    setNoLeidas((prev) => Math.max(0, prev - notifs.filter((n) => ids.includes(n.id) && !n.leida).length));
    setSeleccion(new Set());
    setProcesando(false);
  }

  async function eliminar(n: Notif) {
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.leida) setNoLeidas((prev) => Math.max(0, prev - 1));
    setSeleccion((prev) => {
      if (!prev.has(n.id)) return prev;
      const next = new Set(prev);
      next.delete(n.id);
      return next;
    });
    await fetch(`/api/notificaciones/${n.id}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function eliminarSeleccionadas() {
    const ids = Array.from(seleccion);
    setProcesando(true);
    setNotifs((prev) => prev.filter((n) => !seleccion.has(n.id)));
    setNoLeidas((prev) => Math.max(0, prev - notifs.filter((n) => seleccion.has(n.id) && !n.leida).length));
    setSeleccion(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/notificaciones/${id}`, { method: "DELETE" }).catch(() => undefined)));
    setProcesando(false);
  }

  const encabezado =
    seleccion.size > 0 ? (
      <div className="flex items-center gap-3 bg-[#102463] text-white px-3.5 sm:px-4 py-2.5 rounded-t-2xl">
        <input
          type="checkbox"
          checked={todasSeleccionadas}
          onChange={alternarTodas}
          className="w-4 h-4 rounded accent-[#ffbd1f] cursor-pointer flex-shrink-0"
        />
        <span className="text-sm font-semibold flex-1">{seleccion.size} seleccionada{seleccion.size === 1 ? "" : "s"}</span>
        <button
          onClick={marcarSeleccionadasLeidas}
          disabled={procesando}
          className="text-xs font-medium text-blue-200 hover:text-white disabled:opacity-50"
        >
          Marcar leídas
        </button>
        <button
          onClick={eliminarSeleccionadas}
          disabled={procesando}
          className="flex items-center gap-1 text-xs font-medium text-red-300 hover:text-red-100 disabled:opacity-50"
        >
          <TrashIcon /> Eliminar
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3 px-3.5 sm:px-4 py-2.5 border-b border-gray-100">
        <input
          type="checkbox"
          checked={todasSeleccionadas}
          onChange={alternarTodas}
          disabled={notifs.length === 0}
          className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer flex-shrink-0"
        />
        <span className="text-sm text-gray-400 flex-1">Seleccionar todas</span>
        {noLeidas > 0 && (
          <button onClick={marcarTodas} className="text-xs text-[#1B4F8A] hover:underline font-medium">
            Marcar todas leídas
          </button>
        )}
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="text-lg font-bold text-gray-900 mb-4">🔔 Notificaciones</h1>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {cargando ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                Cargando...
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm">Sin notificaciones por ahora</p>
              </div>
            ) : (
              <>
                {encabezado}
                {notifs.map((n) => {
                  const marcada = seleccion.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`flex items-center gap-3 px-3.5 sm:px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                        marcada ? "bg-blue-50" : n.leida ? "bg-white hover:bg-black/[0.02]" : "bg-blue-50/40 hover:bg-blue-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarUna(n.id)}
                        className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer flex-shrink-0"
                      />

                      <Link
                        href={`/notificaciones/${n.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <span className="text-lg flex-shrink-0 w-6 text-center">{n.icono}</span>
                        <span className={`text-xs flex-shrink-0 w-20 truncate hidden sm:inline ${n.leida ? "text-gray-400" : "text-[#102463] font-bold"}`}>
                          {TIPO_LABEL[n.tipo] ?? n.tipo}
                        </span>
                        <p className="text-sm truncate min-w-0 flex-1">
                          <span className={n.leida ? "text-gray-600 font-normal" : "text-gray-900 font-bold"}>{n.titulo}</span>
                          <span className="text-gray-400 font-normal"> — {n.cuerpo}</span>
                        </p>
                      </Link>

                      <span className="text-xs text-gray-400 flex-shrink-0 w-9 text-right">{tiempoRelativo(n.createdAt)}</span>
                      <button
                        onClick={() => eliminar(n)}
                        aria-label="Eliminar notificación"
                        title="Eliminar"
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
