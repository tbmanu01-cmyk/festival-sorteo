"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ConversacionResumen {
  id: string;
  estado: "BOT" | "ESPERANDO_ASESOR" | "EN_ATENCION" | "CERRADA";
  usuarioNombre: string;
  usuarioCorreo: string;
  asesorNombre: string | null;
  ultimoMensaje: string | null;
  updatedAt: string;
  noLeidos: number;
}

interface Msg {
  id: string;
  autor: "USER" | "BOT" | "ADMIN";
  contenido: string;
  createdAt: string;
}

interface ConversacionDetalle {
  id: string;
  estado: ConversacionResumen["estado"];
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioCelular: string;
  asesorNombre: string | null;
  mensajes: Msg[];
}

const ESTADO_BADGE: Record<ConversacionResumen["estado"], { label: string; color: string }> = {
  BOT: { label: "Bot", color: "bg-gray-100 text-gray-500" },
  ESPERANDO_ASESOR: { label: "Esperando asesor", color: "bg-amber-100 text-amber-700" },
  EN_ATENCION: { label: "En atención", color: "bg-emerald-100 text-emerald-700" },
  CERRADA: { label: "Cerrada", color: "bg-gray-100 text-gray-400" },
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

export default function AdminChats() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ConversacionDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN" && rol !== "ASISTENTE") router.push("/dashboard");
  }, [status, rol, router]);

  const cargarLista = useCallback(async () => {
    const res = await fetch("/api/admin/chats");
    if (res.ok) {
      const data = (await res.json()) as { conversaciones: ConversacionResumen[] };
      setConversaciones(data.conversaciones);
    }
    setCargandoLista(false);
  }, []);

  const esStaff = status === "authenticated" && (rol === "ADMIN" || rol === "ASISTENTE");

  useEffect(() => {
    if (!esStaff) return;
    cargarLista();
    const id = setInterval(cargarLista, 10_000);
    return () => clearInterval(id);
  }, [esStaff, cargarLista]);

  const cargarDetalle = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/chats/${id}`);
    if (res.ok) {
      const data = (await res.json()) as ConversacionDetalle;
      setDetalle(data);
      requestAnimationFrame(() => {
        if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
      });
    }
  }, []);

  function seleccionar(id: string) {
    setSeleccionId(id);
    setCargandoDetalle(true);
    cargarDetalle(id).finally(() => setCargandoDetalle(false));
    setConversaciones((prev) => prev.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)));
  }

  useEffect(() => {
    if (!seleccionId || !detalle) return;
    if (detalle.estado === "CERRADA") return;
    const id = setInterval(() => cargarDetalle(seleccionId), 5_000);
    return () => clearInterval(id);
  }, [seleccionId, detalle, cargarDetalle]);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    if (!seleccionId || !texto.trim() || enviando) return;
    setEnviando(true);
    const t = texto;
    setTexto("");
    const res = await fetch(`/api/admin/chats/${seleccionId}/mensaje`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: t }),
    });
    if (res.ok) {
      await cargarDetalle(seleccionId);
      cargarLista();
    }
    setEnviando(false);
  }

  async function cerrarConversacion() {
    if (!seleccionId) return;
    await fetch(`/api/admin/chats/${seleccionId}`, { method: "PATCH" });
    cargarDetalle(seleccionId);
    cargarLista();
  }

  if (status === "loading" || !esStaff) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900">💬 Chats de soporte</h1>
            <Link href="/admin/chats/faqs" className="text-sm text-[#1B4F8A] hover:underline font-medium">
              ⚙ Editar preguntas frecuentes
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex" style={{ height: "min(72vh, 640px)" }}>
            {/* Lista */}
            <div className={`${seleccionId ? "hidden md:flex" : "flex"} md:w-[320px] md:flex-shrink-0 md:border-r border-gray-100 flex-col min-h-0 w-full`}>
              <div className="flex-1 overflow-y-auto min-h-0">
                {cargandoLista ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                  </div>
                ) : conversaciones.length === 0 ? (
                  <div className="text-center py-14 text-gray-400 px-4">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm">Sin conversaciones todavía</p>
                  </div>
                ) : (
                  conversaciones.map((c) => {
                    const badge = ESTADO_BADGE[c.estado];
                    const activa = c.id === seleccionId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => seleccionar(c.id)}
                        className={`w-full text-left px-3.5 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                          activa ? "bg-[#1B4F8A]/10" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-bold text-gray-800 truncate">{c.usuarioNombre}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{tiempoRelativo(c.updatedAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mb-1.5">{c.ultimoMensaje ?? "Sin mensajes"}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                          {c.noLeidos > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                              {c.noLeidos}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detalle */}
            <div className={`${seleccionId ? "flex" : "hidden md:flex"} flex-1 min-h-0 flex-col`}>
              {!seleccionId || !detalle ? (
                <div className="h-full flex items-center justify-center text-center text-gray-400 p-8">
                  {cargandoDetalle ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                  ) : (
                    <div>
                      <p className="text-4xl mb-3">💬</p>
                      <p className="text-sm">Selecciona una conversación</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <button
                      onClick={() => setSeleccionId(null)}
                      className="md:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4F8A] font-medium"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{detalle.usuarioNombre}</p>
                      <p className="text-xs text-gray-400 truncate">{detalle.usuarioCorreo} · {detalle.usuarioCelular}</p>
                    </div>
                    {detalle.estado !== "CERRADA" && (
                      <button
                        onClick={cerrarConversacion}
                        className="text-xs font-medium text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>

                  <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50">
                    {detalle.mensajes.map((m) => (
                      <div key={m.id} className={`flex ${m.autor === "ADMIN" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm whitespace-pre-line ${
                            m.autor === "ADMIN"
                              ? "bg-[#102463] text-white rounded-br-sm"
                              : m.autor === "BOT"
                                ? "bg-white border border-dashed border-gray-200 text-gray-500 rounded-bl-sm"
                                : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
                          }`}
                        >
                          {m.autor === "BOT" && <p className="text-[10px] font-bold text-gray-400 mb-0.5">Asistente 10K</p>}
                          {m.contenido}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={responder} className="p-3 flex items-center gap-2 flex-shrink-0 border-t border-gray-100">
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder={detalle.estado === "CERRADA" ? "Esta conversación está cerrada" : "Responder..."}
                      disabled={enviando || detalle.estado === "CERRADA"}
                      className="flex-1 border border-gray-200 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 disabled:bg-gray-50"
                    />
                    <button
                      type="submit"
                      disabled={enviando || !texto.trim() || detalle.estado === "CERRADA"}
                      className="w-9 h-9 rounded-full bg-[#102463] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                      aria-label="Enviar"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
