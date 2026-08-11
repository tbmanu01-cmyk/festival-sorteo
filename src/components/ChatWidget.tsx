"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useChatWidget } from "@/lib/chatContext";

interface Msg {
  id: string;
  autor: "USER" | "BOT" | "ADMIN";
  contenido: string;
  createdAt: string;
}

interface FaqOpt {
  id: string;
  pregunta: string;
}

interface Categoria {
  categoria: string;
  items: FaqOpt[];
}

interface ConversacionInfo {
  id: string;
  estado: "BOT" | "ESPERANDO_ASESOR" | "EN_ATENCION" | "CERRADA";
  asesorNombre: string | null;
}

const ESTADO_LABEL: Record<ConversacionInfo["estado"], string> = {
  BOT: "Asistente 10K • en línea",
  ESPERANDO_ASESOR: "Esperando un asesor...",
  EN_ATENCION: "En atención",
  CERRADA: "Conversación cerrada",
};

export default function ChatWidget() {
  const { status } = useSession();
  const pathname = usePathname();
  const { abierto, setAbierto, noLeidos, setNoLeidos } = useChatWidget();

  const [cargando, setCargando] = useState(false);
  const [conversacion, setConversacion] = useState<ConversacionInfo | null>(null);
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sugerencias, setSugerencias] = useState<FaqOpt[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  const scrollAbajo = useCallback(() => {
    requestAnimationFrame(() => {
      if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
    });
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/chat");
    if (res.ok) {
      const data = await res.json();
      setConversacion(data.conversacion);
      setMensajes(data.mensajes);
      setCategorias(data.categorias);
      setNoLeidos(0);
      setSugerencias([]);
    }
    setCargando(false);
    scrollAbajo();
  }, [scrollAbajo]);

  const oculto = pathname?.startsWith("/admin") ?? false;

  // Badge de no leídos en segundo plano (no marca como leído)
  useEffect(() => {
    if (status !== "authenticated" || abierto || oculto) return;
    let cancelado = false;
    async function chequear() {
      const res = await fetch("/api/chat?marcar=0");
      if (res.ok && !cancelado) {
        const data = await res.json();
        setNoLeidos(data.noLeidos ?? 0);
      }
    }
    chequear();
    const id = setInterval(chequear, 30_000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [status, abierto, oculto]);

  // Cargar la conversación al abrir el panel, sin importar qué botón lo disparó
  // (burbuja de escritorio o el ícono dentro de la barra flotante en mobile)
  useEffect(() => {
    if (abierto) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // El estado "abierto" vive en un contexto montado una sola vez en el layout
  // raíz, así que sobrevive a la navegación entre páginas (Next.js no
  // desmonta el layout en cada cambio de ruta). Sin esto, el panel se queda
  // abierto "en segundo plano" al cambiar de pantalla — hay que minimizarlo
  // explícitamente cada vez que cambia el pathname.
  const primerRenderRef = useRef(true);
  useEffect(() => {
    if (primerRenderRef.current) {
      primerRenderRef.current = false;
      return;
    }
    setAbierto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Mientras el panel está abierto y hay un asesor de por medio, refresca cada 5s
  useEffect(() => {
    if (!abierto || !conversacion) return;
    if (conversacion.estado !== "ESPERANDO_ASESOR" && conversacion.estado !== "EN_ATENCION") return;
    const id = setInterval(cargar, 5_000);
    return () => clearInterval(id);
  }, [abierto, conversacion, cargar]);

  function abrir() {
    setAbierto(true);
  }

  async function enviar(textoMsg: string, faqItemId?: string) {
    if (!textoMsg.trim() || enviando) return;
    setEnviando(true);
    setTexto("");
    setMensajes((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, autor: "USER", contenido: textoMsg, createdAt: new Date().toISOString() },
    ]);
    scrollAbajo();

    const res = await fetch("/api/chat/mensaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: textoMsg, faqItemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversacion((prev) => (prev ? { ...prev, estado: data.conversacion.estado } : { ...data.conversacion, asesorNombre: null }));
      if (data.botReply) {
        setMensajes((prev) => [...prev.filter((m) => !m.id.startsWith("tmp-")), data.mensajeUsuario, data.botReply]);
        setSugerencias(data.sugerencias ?? []);
        if (data.categorias) setCategorias(data.categorias);
      } else {
        setMensajes((prev) => [...prev.filter((m) => !m.id.startsWith("tmp-")), data.mensajeUsuario]);
      }
    }
    setEnviando(false);
    scrollAbajo();
  }

  async function solicitarAsesor() {
    setEnviando(true);
    const res = await fetch("/api/chat/solicitar-asesor", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setConversacion((prev) => (prev ? { ...prev, estado: data.conversacion.estado } : { ...data.conversacion, asesorNombre: null }));
      setMensajes((prev) => [...prev, { id: `sys-${Date.now()}`, ...data.mensaje }]);
      setSugerencias([]);
    }
    setEnviando(false);
    scrollAbajo();
  }

  if (status !== "authenticated" || oculto) return null;

  const puedeEscalar = !conversacion || conversacion.estado === "BOT";
  const mostrarCategorias = puedeEscalar && (mensajes.length === 0 || sugerencias.length > 0 || mensajes[mensajes.length - 1]?.autor === "BOT");

  return (
    <>
      {/* Burbuja flotante — solo desktop; en mobile el trigger vive en NavMobile */}
      <button
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl items-center justify-center transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, #102463, #173592)" }}
        aria-label="Chat de soporte"
      >
        {abierto ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {!abierto && noLeidos > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {noLeidos > 9 ? "9+" : noLeidos}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[22rem] max-w-[calc(100vw-2rem)] h-[32rem] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3.5 text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #102463, #173592)" }}>
            <p className="font-bold text-sm">Soporte Tienda 10K</p>
            <p className="text-xs text-blue-200">
              {conversacion?.estado === "EN_ATENCION" && conversacion.asesorNombre
                ? `Hablando con ${conversacion.asesorNombre}`
                : conversacion
                  ? ESTADO_LABEL[conversacion.estado]
                  : ESTADO_LABEL.BOT}
            </p>
          </div>

          <div ref={listaRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-gray-50">
            {cargando ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {mensajes.length === 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-700 shadow-sm max-w-[85%]">
                      Hola 👋 soy el Asistente 10K de Tienda 10K. Elige un tema o escribe tu pregunta.
                    </div>
                  </div>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.autor === "USER" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm whitespace-pre-line ${
                        m.autor === "USER"
                          ? "bg-[#102463] text-white rounded-br-sm"
                          : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
                      }`}
                    >
                      {m.autor === "ADMIN" && <p className="text-[10px] font-bold text-[#1B4F8A] mb-0.5">Asesor</p>}
                      {m.contenido}
                    </div>
                  </div>
                ))}

                {mostrarCategorias && (
                  <div className="flex flex-col gap-2 pt-1">
                    {(sugerencias.length > 0 ? [{ categoria: "¿Quisiste decir?", items: sugerencias }] : categorias).map((cat) => (
                      <div key={cat.categoria}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 px-1">{cat.categoria}</p>
                        <div className="flex flex-col gap-1.5">
                          {cat.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => enviar(item.pregunta, item.id)}
                              disabled={enviando}
                              className="text-left text-xs font-medium bg-white border border-[#1B4F8A]/20 text-[#1B4F8A] px-3 py-2 rounded-xl hover:bg-[#1B4F8A]/5 transition-colors disabled:opacity-50"
                            >
                              {item.pregunta}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {puedeEscalar && (
            <div className="px-3 pt-2 flex-shrink-0">
              <button
                onClick={solicitarAsesor}
                disabled={enviando}
                className="w-full text-xs font-semibold text-center text-[#173592] bg-[#ffbd1f]/20 hover:bg-[#ffbd1f]/30 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                🙋 Hablar con un asesor
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="p-3 flex items-center gap-2 flex-shrink-0 border-t border-gray-100"
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={conversacion?.estado === "CERRADA" ? "Esta conversación está cerrada" : "Escribe tu mensaje..."}
              disabled={enviando || conversacion?.estado === "CERRADA"}
              className="flex-1 border border-gray-200 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim() || conversacion?.estado === "CERRADA"}
              className="w-9 h-9 rounded-full bg-[#102463] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
              aria-label="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
