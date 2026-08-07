"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { InboxContext, type Notif } from "./inbox-context";

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

export default function NotificacionesLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [procesando, setProcesando] = useState(false);

  const activeId = pathname.startsWith("/notificaciones/") ? pathname.split("/")[2] : null;

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

  // ── Acciones compartidas via contexto con el panel de detalle ──────────────
  const marcarLeida = useCallback(async (id: string) => {
    let eraNoLeida = false;
    setNotifs((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        eraNoLeida = !n.leida;
        return { ...n, leida: true };
      })
    );
    if (eraNoLeida) setNoLeidas((prev) => Math.max(0, prev - 1));
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => undefined);
  }, []);

  const eliminar = useCallback(
    async (id: string) => {
      let eraNoLeida = false;
      setNotifs((prev) => {
        const encontrada = prev.find((n) => n.id === id);
        eraNoLeida = !!encontrada && !encontrada.leida;
        return prev.filter((n) => n.id !== id);
      });
      if (eraNoLeida) setNoLeidas((prev) => Math.max(0, prev - 1));
      setSeleccion((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (activeId === id) router.push("/notificaciones");
      await fetch(`/api/notificaciones/${id}`, { method: "DELETE" }).catch(() => undefined);
    },
    [activeId, router]
  );

  const eliminarSeleccionadas = useCallback(async () => {
    const ids = Array.from(seleccion);
    setProcesando(true);
    setNotifs((prev) => prev.filter((n) => !seleccion.has(n.id)));
    setNoLeidas((prev) => Math.max(0, prev - notifs.filter((n) => seleccion.has(n.id) && !n.leida).length));
    setSeleccion(new Set());
    if (activeId && ids.includes(activeId)) router.push("/notificaciones");
    await Promise.all(ids.map((id) => fetch(`/api/notificaciones/${id}`, { method: "DELETE" }).catch(() => undefined)));
    setProcesando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion, activeId, router]);

  const reaccionar = useCallback(async (id: string, emoji: string) => {
    const res = await fetch(`/api/notificaciones/${id}/reaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { accion: string; emoji: string | null };
    setNotifs((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const r = { ...n.reacciones };
        if (n.miReaccion) {
          r[n.miReaccion] = (r[n.miReaccion] ?? 1) - 1;
          if (r[n.miReaccion] <= 0) delete r[n.miReaccion];
        }
        if (data.accion === "guardada" && data.emoji) {
          r[data.emoji] = (r[data.emoji] ?? 0) + 1;
        }
        return { ...n, reacciones: r, miReaccion: data.emoji };
      })
    );
  }, []);

  return (
    <InboxContext.Provider value={{ notifs, cargando, marcarLeida, eliminar, reaccionar }}>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-gray-50 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h1 className="text-lg font-bold text-gray-900 mb-4">🔔 Notificaciones</h1>

            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex"
              style={{ height: "min(72vh, 640px)" }}
            >
              {/* Lista lateral */}
              <div
                className={`${activeId ? "hidden md:flex" : "flex"} md:w-[360px] md:flex-shrink-0 md:border-r border-gray-100 flex-col min-h-0 w-full`}
              >
                {notifs.length > 0 &&
                  (seleccion.size > 0 ? (
                    <div className="flex items-center gap-2.5 bg-[#102463] text-white px-3.5 py-2.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={todasSeleccionadas}
                        onChange={alternarTodas}
                        className="w-4 h-4 rounded accent-[#ffbd1f] cursor-pointer flex-shrink-0"
                      />
                      <span className="text-xs font-semibold flex-1">{seleccion.size} sel.</span>
                      <button
                        onClick={marcarSeleccionadasLeidas}
                        disabled={procesando}
                        className="text-[11px] font-medium text-blue-200 hover:text-white disabled:opacity-50"
                      >
                        Leídas
                      </button>
                      <button
                        onClick={eliminarSeleccionadas}
                        disabled={procesando}
                        className="flex items-center gap-1 text-[11px] font-medium text-red-300 hover:text-red-100 disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-100 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={todasSeleccionadas}
                        onChange={alternarTodas}
                        className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer flex-shrink-0"
                      />
                      <span className="text-xs text-gray-400 flex-1">Todas</span>
                      {noLeidas > 0 && (
                        <button onClick={marcarTodas} className="text-[11px] text-[#1B4F8A] hover:underline font-medium">
                          Marcar leídas
                        </button>
                      )}
                    </div>
                  ))}

                <div className="flex-1 overflow-y-auto min-h-0">
                  {cargando ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                      <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                      Cargando...
                    </div>
                  ) : notifs.length === 0 ? (
                    <div className="text-center py-14 text-gray-400 px-4">
                      <p className="text-3xl mb-2">🔔</p>
                      <p className="text-sm">Sin notificaciones por ahora</p>
                    </div>
                  ) : (
                    notifs.map((n) => {
                      const marcada = seleccion.has(n.id);
                      const activa = n.id === activeId;
                      return (
                        <div
                          key={n.id}
                          className={`flex items-center gap-2.5 px-3.5 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                            activa
                              ? "bg-[#1B4F8A]/10"
                              : marcada
                                ? "bg-blue-50"
                                : n.leida
                                  ? "bg-white hover:bg-black/[0.02]"
                                  : "bg-blue-50/40 hover:bg-blue-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() => alternarUna(n.id)}
                            className="w-4 h-4 rounded accent-[#1B4F8A] cursor-pointer flex-shrink-0"
                          />
                          <Link href={`/notificaciones/${n.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm flex-shrink-0">{n.icono}</span>
                              <span className={`text-xs truncate ${n.leida ? "text-gray-400" : "text-[#102463] font-bold"}`}>
                                {TIPO_LABEL[n.tipo] ?? n.tipo}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{tiempoRelativo(n.createdAt)}</span>
                            </div>
                            <p className={`text-sm truncate ${n.leida ? "text-gray-600 font-normal" : "text-gray-900 font-bold"}`}>
                              {n.titulo}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{n.cuerpo}</p>
                          </Link>
                          <button
                            onClick={() => eliminar(n.id)}
                            aria-label="Eliminar notificación"
                            title="Eliminar"
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel de detalle */}
              <div className={`${activeId ? "flex" : "hidden md:flex"} flex-1 min-h-0 flex-col overflow-y-auto`}>
                {children}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </InboxContext.Provider>
  );
}
