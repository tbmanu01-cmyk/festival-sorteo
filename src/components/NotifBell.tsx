"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const EMOJIS = ["👍", "❤️", "😮", "😂", "🙏", "🔥"];

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  icono: string;
  createdAt: string;
  leida: boolean;
  reacciones: Record<string, number>;
  miReaccion: string | null;
}

export default function NotifBell() {
  const [abierto,  setAbierto]  = useState(false);
  const [notifs,   setNotifs]   = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Polling del badge cada 30s
  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch("/api/notificaciones/no-leidas");
      if (r.ok) setNoLeidas(((await r.json()) as { count: number }).count);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  async function abrir() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) {
      setCargando(true);
      try {
        const r = await fetch("/api/notificaciones");
        if (r.ok) {
          const d = await r.json() as { notificaciones: Notif[]; noLeidas: number };
          setNotifs(d.notificaciones);
          setNoLeidas(d.noLeidas);
        }
      } finally {
        setCargando(false);
      }
    }
  }

  async function marcarTodas() {
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
  }

  async function reaccionar(notifId: string, emoji: string) {
    const res = await fetch(`/api/notificaciones/${notifId}/reaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const data = await res.json() as { accion: string; emoji: string | null };

    setNotifs((prev) => prev.map((n) => {
      if (n.id !== notifId) return n;
      const nuevasReacciones = { ...n.reacciones };
      // Quitar la reacción anterior si existía
      if (n.miReaccion) {
        nuevasReacciones[n.miReaccion] = (nuevasReacciones[n.miReaccion] ?? 1) - 1;
        if (nuevasReacciones[n.miReaccion] <= 0) delete nuevasReacciones[n.miReaccion];
      }
      // Añadir la nueva si no fue "quitada"
      if (data.accion === "guardada" && data.emoji) {
        nuevasReacciones[data.emoji] = (nuevasReacciones[data.emoji] ?? 0) + 1;
      }
      return { ...n, reacciones: nuevasReacciones, miReaccion: data.emoji };
    }));
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function tiempoRelativo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1)  return "ahora";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="relative" ref={ref}>
      {/* Botón campana */}
      <button
        onClick={abrir}
        className="relative p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" style={{ width: "22rem" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800 text-sm">Notificaciones</span>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="text-xs text-[#1B4F8A] hover:underline font-medium">
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[32rem] overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                Cargando...
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${n.leida ? "bg-white" : "bg-blue-50"}`}
                >
                  {/* Contenido */}
                  <div className="flex gap-3 px-4 pt-3 pb-2">
                    <span className="text-xl flex-shrink-0 mt-0.5">{n.icono}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${n.leida ? "text-gray-700" : "text-gray-900"}`}>
                          {n.titulo}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{tiempoRelativo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.cuerpo}</p>
                    </div>
                  </div>

                  {/* Reacciones existentes + picker */}
                  <div className="flex items-center justify-between px-4 pb-2.5">
                    {/* Resumen de reacciones */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {Object.entries(n.reacciones).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => reaccionar(n.id, emoji)}
                          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            n.miReaccion === emoji
                              ? "bg-blue-100 border-blue-300 text-blue-700 font-bold"
                              : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>

                    {/* Picker de emojis */}
                    <div className="flex items-center gap-0.5 ml-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => reaccionar(n.id, emoji)}
                          title={`Reaccionar con ${emoji}`}
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-sm transition-all hover:scale-125 ${
                            n.miReaccion === emoji ? "bg-blue-100 scale-110" : "hover:bg-gray-100"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
