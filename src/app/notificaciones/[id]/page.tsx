"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useInbox } from "../inbox-context";

const EMOJIS = ["👍", "❤️", "😮", "😂", "🙏", "🔥"];

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  SISTEMA:   { label: "Sistema",    color: "bg-gray-100 text-gray-600" },
  SORTEO:    { label: "Selección",  color: "bg-[#102463]/10 text-[#102463]" },
  RETIRO:    { label: "Retiro",     color: "bg-emerald-100 text-emerald-700" },
  PROMO:     { label: "Promoción",  color: "bg-[#ffbd1f]/20 text-[#8a6400]" },
  MEMBRESIA: { label: "Membresía",  color: "bg-purple-100 text-purple-700" },
};

export default function DetalleNotificacion() {
  const params = useParams<{ id: string }>();
  const { notifs, cargando, marcarLeida, eliminar, reaccionar } = useInbox();
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const notif = notifs.find((n) => n.id === params.id) ?? null;

  useEffect(() => {
    if (notif && !notif.leida) marcarLeida(notif.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notif?.id]);

  if (cargando) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="h-full flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-500 text-sm mb-4">
            Esta notificación no existe o ya no está en tu bandeja.
          </p>
          <Link href="/notificaciones" className="text-[#1B4F8A] text-sm font-semibold hover:underline">
            Volver a notificaciones
          </Link>
        </div>
      </div>
    );
  }

  const tipoInfo = TIPO_LABEL[notif.tipo] ?? { label: notif.tipo, color: "bg-gray-100 text-gray-600" };
  const fecha = new Date(notif.createdAt).toLocaleString("es-CO", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  const totalReacc = Object.values(notif.reacciones).reduce((s, c) => s + c, 0);

  async function handleEliminar() {
    setEliminando(true);
    await eliminar(notif!.id);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <Link
          href="/notificaciones"
          className="md:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4F8A] font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full hidden md:inline-block ${tipoInfo.color}`}>
          {tipoInfo.label}
        </span>
        <button
          onClick={handleEliminar}
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

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">{notif.icono}</span>
            <div className="flex-1 min-w-0">
              <span className={`md:hidden inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${tipoInfo.color}`}>
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
                  onClick={() => reaccionar(notif.id, emoji)}
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
                    onClick={() => {
                      reaccionar(notif.id, emoji);
                      setPickerAbierto(false);
                    }}
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
  );
}
