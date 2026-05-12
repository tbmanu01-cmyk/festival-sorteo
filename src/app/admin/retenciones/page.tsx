"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Concepto {
  id: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
  createdAt: string;
}

export default function AdminRetenciones() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  // Formulario nuevo
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [creando, setCreando] = useState(false);

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPct, setEditPct] = useState("");

  const cargar = useCallback(() => {
    setCargando(true);
    fetch("/api/admin/retenciones")
      .then((r) => r.json())
      .then((d) => { setConceptos(d.conceptos ?? []); setCargando(false); });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function flash(ok: boolean, texto: string) {
    setMensaje({ ok, texto });
    if (ok) setTimeout(() => setMensaje(null), 3000);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    const res = await fetch("/api/admin/retenciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, porcentaje: parseFloat(porcentaje) }),
    });
    const json = await res.json();
    setCreando(false);
    if (!res.ok) { flash(false, json.mensaje); return; }
    setNombre(""); setPorcentaje("");
    flash(true, "Concepto creado.");
    cargar();
  }

  async function toggleActivo(c: Concepto) {
    const res = await fetch(`/api/admin/retenciones/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !c.activo }),
    });
    if (res.ok) cargar();
  }

  async function guardarEdicion(id: string) {
    const res = await fetch(`/api/admin/retenciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre, porcentaje: parseFloat(editPct) }),
    });
    const json = await res.json();
    if (!res.ok) { flash(false, json.mensaje); return; }
    setEditandoId(null);
    flash(true, "Concepto actualizado.");
    cargar();
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Los retiros ya procesados conservan su información.`)) return;
    const res = await fetch(`/api/admin/retenciones/${id}`, { method: "DELETE" });
    if (res.ok) { flash(true, "Eliminado."); cargar(); }
  }

  if (status === "loading" || cargando) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white mb-6">
            <Link href="/admin" className="text-blue-200 hover:text-white text-sm mb-2 inline-block">
              ← Panel Admin
            </Link>
            <h1 className="text-2xl font-extrabold">Conceptos de Retención</h1>
            <p className="text-blue-200 text-sm mt-0.5">
              Define los impuestos y retenciones que el asistente puede aplicar al pre-aprobar retiros.
            </p>
          </div>

          {mensaje && (
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm font-medium flex items-center justify-between ${
              mensaje.ok
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <span>{mensaje.ok ? "✅ " : "❌ "}{mensaje.texto}</span>
              <button onClick={() => setMensaje(null)} className="ml-3 text-lg leading-none opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {/* Formulario nuevo concepto */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Agregar concepto</h2>
            <form onSubmit={crear} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Retención en la fuente"
                required
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
              />
              <div className="relative w-36 shrink-0">
                <input
                  type="number"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  required
                  className="w-full px-4 py-2.5 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <button
                type="submit"
                disabled={creando}
                className="bg-[#102463] hover:bg-[#173592] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
              >
                {creando ? "..." : "Agregar"}
              </button>
            </form>
          </div>

          {/* Lista de conceptos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                Conceptos configurados
                <span className="ml-2 text-sm font-normal text-gray-400">({conceptos.length})</span>
              </h2>
            </div>

            {conceptos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-medium">Aún no hay conceptos configurados</p>
                <p className="text-sm mt-1">Agrega impuestos o retenciones para que el asistente pueda aplicarlos.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {conceptos.map((c) => (
                  <div key={c.id} className={`px-6 py-4 transition-colors ${!c.activo ? "bg-gray-50 opacity-60" : ""}`}>
                    {editandoId === c.id ? (
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="flex-1 px-3 py-2 border border-[#102463] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                        <div className="relative w-32 shrink-0">
                          <input
                            type="number"
                            value={editPct}
                            onChange={(e) => setEditPct(e.target.value)}
                            min="0.01" max="99.99" step="0.01"
                            className="w-full px-3 py-2 pr-7 border border-[#102463] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => guardarEdicion(c.id)}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-2 rounded-lg text-sm transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${c.activo ? "bg-green-500" : "bg-gray-400"}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{c.nombre}</p>
                            <p className="text-xs text-gray-400">
                              {c.activo ? "Activo" : "Inactivo"} · Creado {new Date(c.createdAt).toLocaleDateString("es-CO")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-lg font-extrabold text-[#102463] w-16 text-right">
                            {c.porcentaje}%
                          </span>
                          <button
                            onClick={() => { setEditandoId(c.id); setEditNombre(c.nombre); setEditPct(String(c.porcentaje)); }}
                            className="border border-gray-200 hover:border-[#102463] text-gray-500 hover:text-[#102463] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleActivo(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                              c.activo
                                ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                                : "border-green-200 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {c.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => eliminar(c.id, c.nombre)}
                            className="border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Los conceptos desactivados no aparecen en el panel del asistente. Los registros históricos no se ven afectados.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
