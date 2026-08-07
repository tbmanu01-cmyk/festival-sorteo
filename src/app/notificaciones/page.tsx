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

function tiempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ListaNotificaciones() {
  const { status } = useSession();
  const router = useRouter();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);

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

  async function marcarTodas() {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
  }

  async function eliminar(n: Notif) {
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.leida) setNoLeidas((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notificaciones/${n.id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900">🔔 Notificaciones</h1>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="text-xs text-[#1B4F8A] hover:underline font-medium">
                Marcar todas leídas
              </button>
            )}
          </div>

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
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-stretch border-b border-gray-50 last:border-0 ${n.leida ? "bg-white" : "bg-blue-50"}`}
                >
                  <Link
                    href={`/notificaciones/${n.id}`}
                    className="flex flex-1 min-w-0 gap-3 px-4 py-3.5 hover:bg-black/[0.02] transition-colors"
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{n.icono}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${n.leida ? "text-gray-700" : "text-gray-900"}`}>
                          {n.titulo}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{tiempoRelativo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.cuerpo}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => eliminar(n)}
                    aria-label="Eliminar notificación"
                    title="Eliminar"
                    className="flex-shrink-0 w-11 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-.87 14.14A2 2 0 0 1 16.14 22H7.86a2 2 0 0 1-1.99-1.86L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
