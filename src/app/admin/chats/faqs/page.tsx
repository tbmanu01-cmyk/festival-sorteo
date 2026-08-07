"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Faq {
  id: string;
  categoria: string;
  pregunta: string;
  palabrasClave: string[];
  respuesta: string;
  orden: number;
  activo: boolean;
}

const FORM_VACIO = { categoria: "", pregunta: "", palabrasClave: "", respuesta: "", orden: "0" };

export default function AdminFaqs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN" && rol !== "ASISTENTE") router.push("/dashboard");
  }, [status, rol, router]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/admin/faqs");
    if (res.ok) {
      const data = (await res.json()) as { faqs: Faq[] };
      setFaqs(data.faqs);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && (rol === "ADMIN" || rol === "ASISTENTE")) cargar();
  }, [status, rol, cargar]);

  function abrirNueva() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(faq: Faq) {
    setEditandoId(faq.id);
    setForm({
      categoria: faq.categoria,
      pregunta: faq.pregunta,
      palabrasClave: faq.palabrasClave.join(", "),
      respuesta: faq.respuesta,
      orden: String(faq.orden),
    });
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const payload = { ...form, orden: Number(form.orden) || 0 };
    const res = await fetch(editandoId ? `/api/admin/faqs/${editandoId}` : "/api/admin/faqs", {
      method: editandoId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.mensaje ?? "Error al guardar.");
      return;
    }
    setModalAbierto(false);
    cargar();
  }

  async function alternarActivo(faq: Faq) {
    setFaqs((prev) => prev.map((f) => (f.id === faq.id ? { ...f, activo: !f.activo } : f)));
    await fetch(`/api/admin/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !faq.activo }),
    });
  }

  async function eliminar(faq: Faq) {
    setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
    await fetch(`/api/admin/faqs/${faq.id}`, { method: "DELETE" });
  }

  const porCategoria = faqs.reduce<Record<string, Faq[]>>((acc, f) => {
    (acc[f.categoria] ??= []).push(f);
    return acc;
  }, {});

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link href="/admin/chats" className="text-sm text-gray-500 hover:text-[#1B4F8A] font-medium mb-3 inline-block">
            ← Volver a Chats
          </Link>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-gray-900">❓ Preguntas frecuentes</h1>
              <p className="text-sm text-gray-500">El bot del chat responde con estas respuestas predefinidas.</p>
            </div>
            <button
              onClick={abrirNueva}
              className="bg-[#102463] hover:bg-[#173592] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              + Nueva FAQ
            </button>
          </div>

          {faqs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-14 text-gray-400">
              <p className="text-3xl mb-2">❓</p>
              <p className="text-sm">Aún no hay preguntas frecuentes configuradas.</p>
            </div>
          ) : (
            Object.entries(porCategoria).map(([categoria, items]) => (
              <div key={categoria} className="mb-6">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2">{categoria}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {items.map((faq) => (
                    <div key={faq.id} className={`px-4 py-3.5 flex items-start gap-3 ${!faq.activo ? "opacity-50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{faq.pregunta}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{faq.respuesta}</p>
                        {faq.palabrasClave.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {faq.palabrasClave.map((p) => (
                              <span key={p} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => alternarActivo(faq)}
                          className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                            faq.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {faq.activo ? "Activa" : "Inactiva"}
                        </button>
                        <button onClick={() => abrirEditar(faq)} className="text-xs text-[#1B4F8A] hover:underline font-medium">
                          Editar
                        </button>
                        <button onClick={() => eliminar(faq)} className="text-xs text-red-500 hover:underline font-medium">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editandoId ? "Editar FAQ" : "Nueva FAQ"}</h2>
            <form onSubmit={guardar} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Categoría</label>
                <input
                  required
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  placeholder="Ej: Membresías"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Pregunta</label>
                <input
                  required
                  value={form.pregunta}
                  onChange={(e) => setForm((f) => ({ ...f, pregunta: e.target.value }))}
                  placeholder="Ej: ¿Cómo compro una membresía?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Palabras clave (separadas por coma)
                </label>
                <input
                  value={form.palabrasClave}
                  onChange={(e) => setForm((f) => ({ ...f, palabrasClave: e.target.value }))}
                  placeholder="comprar, membresia, pago"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Respuesta</label>
                <textarea
                  required
                  rows={4}
                  value={form.respuesta}
                  onChange={(e) => setForm((f) => ({ ...f, respuesta: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Orden</label>
                <input
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-[#102463] hover:bg-[#173592] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
