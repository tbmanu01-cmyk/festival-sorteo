"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const EMOJIS = ["👍", "❤️", "😮", "😂", "🙏", "🔥"];

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  SISTEMA:   { label: "Sistema",    color: "bg-gray-100 text-gray-600" },
  SORTEO:    { label: "Selección",  color: "bg-[#102463]/10 text-[#102463]" },
  RETIRO:    { label: "Retiro",     color: "bg-emerald-100 text-emerald-700" },
  PROMO:     { label: "Promoción",  color: "bg-[#ffbd1f]/20 text-[#8a6400]" },
  MEMBRESIA: { label: "Membresía",  color: "bg-purple-100 text-purple-700" },
};

interface NotifDetalle {
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

export default function DetalleNotificacion() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [notif, setNotif] = useState<NotifDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/notificaciones/${params.id}`);
    if (!res.ok) {
      setNoEncontrada(true);
      setCargando(false);
      return;
    }
    const data = (await res.json()) as NotifDetalle;
    setNotif(data);
    setCargando(false);

    // Marcar como leída al abrir el detalle
    if (!data.leida) {
      fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [data.id] }),
      }).catch(() => undefined);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "authenticated") cargar();
  }, [status, cargar]);

  async function reaccionar(emoji: string) {
    if (!notif) return;
    const res = await fetch(`/api/notificaciones/${notif.id}/reaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { accion: string; emoji: string | null };
    setPickerAbierto(false);
    setNotif((prev) => {
      if (!prev) return prev;
      const r = { ...prev.reacciones };
      if (prev.miReaccion) {
        r[prev.miReaccion] = (r[prev.miReaccion] ?? 1) - 1;
        if (r[prev.miReaccion] <= 0) delete r[prev.miReaccion];
      }
      if (data.accion === "guardada" && data.emoji) {
        r[data.emoji] = (r[data.emoji] ?? 0) + 1;
      }
      return { ...prev, reacciones: r, miReaccion: data.emoji };
    });
  }

  async function eliminar() {
    if (!notif) return;
    setEliminando(true);
    await fetch(`/api/notificaciones/${notif.id}`, { method: "DELETE" }).catch(() => undefined);
    router.push("/notificaciones");
  }

  if (status === "loading" || cargando) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (noEncontrada || !notif) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-500 text-sm mb-4">
              Esta notificación no existe o no está disponible para tu cuenta.
            </p>
            <Link href="/dashboard" className="text-[#1B4F8A] text-sm font-semibold hover:underline">
              Volver a mi cuenta
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tipoInfo = TIPO_LABEL[notif.tipo] ?? { label: notif.tipo, color: "bg-gray-100 text-gray-600" };
  const fecha = new Date(notif.createdAt).toLocaleString("es-CO", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  const totalReacc = Object.values(notif.reacciones).reduce((s, c) => s + c, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4F8A] font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Volver
            </button>
            <button
              onClick={eliminar}
              disabled={eliminando}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 font-medium transition-colors disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-.87 14.14A2 2 0 0 1 16.14 22H7.86a2 2 0 0 1-1.99-1.86L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              {eliminando ? "Eliminando..." : "Eliminar"}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{notif.icono}</span>
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${tipoInfo.color}`}>
                    {tipoInfo.label}
                  </span>
                  <h1 className="text-lg font-bold text-gray-900 leading-snug">{notif.titulo}</h1>
                  <p className="text-xs text-gray-400 mt-1">{fecha}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mt-4 whitespace-pre-line">
                {notif.cuerpo}
              </p>
            </div>

            {/* Reacciones */}
            <div className="border-t border-gray-100 px-6 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {totalReacc > 0 ? (
                  Object.entries(notif.reacciones).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => reaccionar(emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                        notif.miReaccion === emoji
                          ? "bg-blue-100 border-blue-300 text-blue-700 font-bold"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {emoji} <span>{count}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-300 select-none">Sé el primero en reaccionar</span>
                )}
              </div>

              <div className="relative flex-shrink-0">
                {pickerAbierto && (
                  <div className="absolute bottom-full right-0 mb-1.5 flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2.5 py-1.5 z-10">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => reaccionar(emoji)}
                        className={`text-lg transition-all hover:scale-125 p-0.5 rounded-full ${
                          notif.miReaccion === emoji ? "bg-blue-100 scale-110" : ""
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setPickerAbierto((v) => !v)}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors ${
                    notif.miReaccion
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                  title="Reaccionar"
                >
                  {notif.miReaccion ?? "+"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
