"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TIPOS = [
  { value: "PROMO",     label: "Promoción",  icono: "📢" },
  { value: "SORTEO",    label: "Sorteo",     icono: "🎰" },
  { value: "SISTEMA",   label: "Sistema",    icono: "⚙️" },
  { value: "MEMBRESIA", label: "Membresía",  icono: "🎁" },
  { value: "RETIRO",    label: "Retiro",     icono: "💸" },
];

const DESTINOS = [
  { value: "todos",    label: "Todos los usuarios",        desc: "Aparece en la campana de cada usuario" },
  { value: "admins",   label: "Admins y asistentes",       desc: "Solo visible para el equipo interno" },
  { value: "usuario",  label: "Usuario específico",        desc: "Buscar por correo electrónico" },
];

interface NotifAdmin {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  icono: string;
  paraAdmins: boolean;
  paraUsuarios: boolean;
  usuarioId: string | null;
  createdAt: string;
  lecturas: number;
}

function destinoLabel(n: NotifAdmin) {
  if (n.paraUsuarios) return { label: "Todos los usuarios", color: "bg-blue-100 text-blue-700" };
  if (n.paraAdmins)   return { label: "Admins / Asistentes", color: "bg-purple-100 text-purple-700" };
  return { label: "Usuario específico", color: "bg-gray-100 text-gray-600" };
}

export default function PaginaNotificaciones() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as unknown as { rol?: string })?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  // Form
  const [tipo,     setTipo]     = useState("PROMO");
  const [titulo,   setTitulo]   = useState("");
  const [cuerpo,   setCuerpo]   = useState("");
  const [icono,    setIcono]    = useState("");
  const [destino,  setDestino]  = useState("todos");
  const [correo,   setCorreo]   = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg,      setMsg]      = useState<{ ok: boolean; texto: string } | null>(null);

  // Historial
  const [historial,   setHistorial]   = useState<NotifAdmin[]>([]);
  const [cargandoH,   setCargandoH]   = useState(true);
  const [eliminando,  setEliminando]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/notificaciones")
      .then((r) => r.json())
      .then((d) => setHistorial((d as { notificaciones: NotifAdmin[] }).notificaciones ?? []))
      .finally(() => setCargandoH(false));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/notificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, titulo: titulo.trim(), cuerpo: cuerpo.trim(), icono: icono.trim() || undefined, destino, correoUsuario: correo.trim() || undefined }),
      });
      const data = await res.json() as { ok?: boolean; notif?: NotifAdmin; mensaje?: string };
      if (res.ok && data.notif) {
        setMsg({ ok: true, texto: "¡Notificación enviada!" });
        setTitulo(""); setCuerpo(""); setIcono(""); setCorreo("");
        setHistorial((prev) => [{ ...data.notif!, lecturas: 0 }, ...prev]);
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ ok: false, texto: data.mensaje ?? "Error al enviar." });
      }
    } catch {
      setMsg({ ok: false, texto: "Error de conexión." });
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id: string) {
    setEliminando(id);
    try {
      await fetch(`/api/admin/notificaciones?id=${id}`, { method: "DELETE" });
      setHistorial((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setEliminando(null);
    }
  }

  function tiempoRelativo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)   return "ahora";
    if (min < 60)  return `hace ${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)    return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }

  if (status === "loading") return null;

  const tipoActual = TIPOS.find((t) => t.value === tipo);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-sm text-[#1B4F8A] hover:underline">← Panel Admin</Link>
        </div>

        <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white mb-6">
          <h1 className="text-2xl font-extrabold mb-0.5">🔔 Notificaciones</h1>
          <p className="text-blue-200 text-sm">Envía avisos en masa, recordatorios y alertas al instante</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Formulario ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-5">Nueva notificación</h2>

            <form onSubmit={enviar} className="space-y-4">

              {/* Tipo */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        tipo === t.value
                          ? "bg-[#1B4F8A] text-white border-[#1B4F8A]"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1B4F8A]/40"
                      }`}
                    >
                      {t.icono} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Evento especial este lunes..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">{titulo.length}/80</p>
              </div>

              {/* Cuerpo */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Mensaje
                </label>
                <textarea
                  required
                  maxLength={300}
                  rows={3}
                  value={cuerpo}
                  onChange={(e) => setCuerpo(e.target.value)}
                  placeholder="Escribe el detalle de la notificación..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A] resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">{cuerpo.length}/300</p>
              </div>

              {/* Icono personalizado */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Ícono (emoji opcional)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl w-10 text-center">{icono || tipoActual?.icono}</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={icono}
                    onChange={(e) => setIcono(e.target.value)}
                    placeholder="🎉"
                    className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                  />
                  <span className="text-xs text-gray-400">Deja vacío para usar el del tipo</span>
                </div>
              </div>

              {/* Destino */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                  Destinatarios
                </label>
                <div className="space-y-2">
                  {DESTINOS.map((d) => (
                    <label key={d.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      destino === d.value ? "border-[#1B4F8A] bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="destino"
                        value={d.value}
                        checked={destino === d.value}
                        onChange={() => setDestino(d.value)}
                        className="mt-0.5 accent-[#1B4F8A]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{d.label}</p>
                        <p className="text-xs text-gray-400">{d.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Correo si es usuario específico */}
              {destino === "usuario" && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Correo del usuario
                  </label>
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="usuario@correo.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
              )}

              {/* Preview */}
              {titulo && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Vista previa</p>
                  <div className="flex gap-3">
                    <span className="text-xl">{icono || tipoActual?.icono}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{titulo || "Título"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cuerpo || "Mensaje..."}</p>
                    </div>
                  </div>
                </div>
              )}

              {msg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                  {msg.ok ? "✅ " : "❌ "}{msg.texto}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando || !titulo.trim() || !cuerpo.trim()}
                className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {enviando ? "Enviando..." : "Enviar notificación"}
              </button>
            </form>
          </div>

          {/* ── Historial ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Historial enviadas</h2>

            {cargandoH ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
                Cargando...
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">Aún no hay notificaciones enviadas</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {historial.map((n) => {
                  const dest = destinoLabel(n);
                  return (
                    <div key={n.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-lg flex-shrink-0">{n.icono}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-snug">{n.titulo}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.cuerpo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => eliminar(n.id)}
                          disabled={eliminando === n.id}
                          className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors text-sm"
                          title="Eliminar"
                        >
                          {eliminando === n.id ? "..." : "✕"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dest.color}`}>
                          {dest.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{tiempoRelativo(n.createdAt)}</span>
                        <span className="text-[10px] text-gray-400">{n.lecturas} leída{n.lecturas !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
