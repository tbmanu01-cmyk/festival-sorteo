"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Bono {
  id: string;
  nombre: string;
  cadena: string;
  valorFace: number;
  precio: number;
  stock: number;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean;
  createdAt: string;
  _count: { compras: number };
}

const CADENAS_SUGERIDAS = ["Éxito", "Jumbo", "Carulla", "D1", "Alkosto", "Ara", "Olimpica", "Metro", "La 14", "Cencosud"];

const CAMPOS_FORM = {
  nombre: "",
  cadena: "",
  valorFace: "",
  precio: "",
  stock: "",
  descripcion: "",
};

type FormData = typeof CAMPOS_FORM;

function ModalBono({
  bono,
  onGuardar,
  onCerrar,
}: {
  bono: Bono | null;
  onGuardar: (data: FormData) => Promise<void>;
  onCerrar: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    bono
      ? {
          nombre: bono.nombre,
          cadena: bono.cadena,
          valorFace: String(bono.valorFace),
          precio: String(bono.precio),
          stock: String(bono.stock),
          descripcion: bono.descripcion ?? "",
        }
      : { ...CAMPOS_FORM }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.cadena || !form.valorFace || !form.precio || !form.stock) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-[#102463] mb-5">
          {bono ? "Editar bono" : "Nuevo bono"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={set("nombre")}
                placeholder="Ej: Bono Éxito $100.000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cadena *</label>
              <div className="flex gap-2">
                <select
                  value={CADENAS_SUGERIDAS.includes(form.cadena) ? form.cadena : ""}
                  onChange={(e) => {
                    if (e.target.value) setForm((p) => ({ ...p, cadena: e.target.value }));
                  }}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
                >
                  <option value="">Seleccionar...</option>
                  {CADENAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.cadena}
                  onChange={set("cadena")}
                  placeholder="o escribe aquí"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Valor del bono (COP) *</label>
              <input
                type="number"
                value={form.valorFace}
                onChange={set("valorFace")}
                placeholder="100000"
                min={0}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio de venta (COP) *</label>
              <input
                type="number"
                value={form.precio}
                onChange={set("precio")}
                placeholder="100000"
                min={0}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
              />
              {form.valorFace && form.precio && Number(form.valorFace) > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Margen: {(((Number(form.valorFace) - Number(form.precio)) / Number(form.valorFace)) * 100).toFixed(1)}%
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock inicial *</label>
              <input
                type="number"
                value={form.stock}
                onChange={set("stock")}
                placeholder="100"
                min={0}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={set("descripcion")}
                rows={3}
                placeholder="Descripción del bono para los usuarios..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463] resize-none"
              />
            </div>
          </div>

          {/* Distribución de cashback */}
          {form.precio && Number(form.precio) > 0 && (
            <div className="bg-[#102463]/5 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-[#102463] uppercase tracking-wider mb-2">Distribución de cashback</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comprador (7%)</span>
                <span className="font-bold text-green-600">+${(Number(form.precio) * 0.07).toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Nivel 1 — quien invitó (5%)</span>
                <span className="font-bold text-blue-600">+${(Number(form.precio) * 0.05).toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Nivel 2 — abuelo (3%)</span>
                <span className="font-bold text-purple-600">+${(Number(form.precio) * 0.03).toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5">
                <span className="text-gray-500">Plataforma (5%)</span>
                <span className="font-semibold text-gray-700">${(Number(form.precio) * 0.05).toLocaleString("es-CO")} COP</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-300 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-[#102463] hover:bg-[#173592] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-all"
            >
              {guardando ? "Guardando..." : bono ? "Guardar cambios" : "Crear bono"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBonos() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalBono, setModalBono] = useState<Bono | null | "nuevo">(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = async () => {
    setCargando(true);
    const res = await fetch("/api/admin/bonos");
    const data = await res.json();
    setBonos(data.bonos ?? []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const mostrarMensaje = (ok: boolean, texto: string) => {
    setMensaje({ ok, texto });
    setTimeout(() => setMensaje(null), 3500);
  };

  const guardarBono = async (form: FormData) => {
    const esEdicion = modalBono && modalBono !== "nuevo";
    const url = esEdicion ? `/api/admin/bonos/${(modalBono as Bono).id}` : "/api/admin/bonos";
    const method = esEdicion ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        cadena: form.cadena,
        valorFace: Number(form.valorFace),
        precio: Number(form.precio),
        stock: Number(form.stock),
        descripcion: form.descripcion || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Error al guardar");
    }

    setModalBono(null);
    await cargar();
    mostrarMensaje(true, esEdicion ? "Bono actualizado" : "Bono creado exitosamente");
  };

  const toggleActivo = async (bono: Bono) => {
    await fetch(`/api/admin/bonos/${bono.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !bono.activo }),
    });
    await cargar();
    mostrarMensaje(true, `Bono ${!bono.activo ? "activado" : "desactivado"}`);
  };

  const ajustarStock = async (bono: Bono, delta: number) => {
    const nuevoStock = Math.max(0, bono.stock + delta);
    await fetch(`/api/admin/bonos/${bono.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: nuevoStock }),
    });
    setBonos((prev) => prev.map((b) => b.id === bono.id ? { ...b, stock: nuevoStock } : b));
  };

  const eliminarBono = async (bono: Bono) => {
    if (!confirm(`¿Eliminar o desactivar "${bono.nombre}"?`)) return;
    const res = await fetch(`/api/admin/bonos/${bono.id}`, { method: "DELETE" });
    const data = await res.json();
    await cargar();
    mostrarMensaje(true, data.mensaje);
  };

  const totalStock = bonos.filter((b) => b.activo).reduce((s, b) => s + b.stock, 0);
  const totalCompras = bonos.reduce((s, b) => s + b._count.compras, 0);

  if (status === "loading" || cargando) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Cargando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <div style={{ background: "linear-gradient(135deg, #102463 0%, #173592 100%)" }} className="text-white py-7 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/admin" className="text-blue-300 hover:text-white text-sm transition-colors">Admin</Link>
                <span className="text-blue-400">›</span>
                <span className="text-white text-sm">Bonos</span>
              </div>
              <h1 className="text-2xl font-extrabold">Gestión de Bonos</h1>
              <p className="text-blue-200 text-sm mt-1">
                {bonos.filter((b) => b.activo).length} activos · {totalStock.toLocaleString("es-CO")} en stock · {totalCompras} ventas
              </p>
            </div>
            <button
              onClick={() => setModalBono("nuevo")}
              className="bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] font-bold px-5 py-2.5 rounded-full text-sm transition-all shadow-md"
            >
              + Nuevo bono
            </button>
          </div>
        </div>

        {/* Toast mensaje */}
        {mensaje && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold ${mensaje.ok ? "bg-green-600" : "bg-red-600"}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-6">
          {bonos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <p className="text-5xl mb-4">🏷️</p>
              <p className="font-bold text-gray-900 text-lg mb-2">No hay bonos</p>
              <p className="text-gray-500 text-sm mb-6">Crea el primer bono para empezar a vender.</p>
              <button
                onClick={() => setModalBono("nuevo")}
                className="bg-[#102463] hover:bg-[#173592] text-white font-bold px-8 py-3 rounded-full transition-all"
              >
                Crear primer bono
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bonos.map((bono) => (
                <div
                  key={bono.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${bono.activo ? "border-gray-100" : "border-gray-200 opacity-60"}`}
                >
                  {/* Cabecera */}
                  <div className={`px-5 pt-4 pb-3 rounded-t-2xl flex items-center justify-between ${bono.activo ? "bg-[#102463]/5" : "bg-gray-100"}`}>
                    <div>
                      <p className="font-extrabold text-[#102463] text-sm">{bono.cadena}</p>
                      <p className="text-gray-500 text-xs">{bono.nombre}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${bono.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      {bono.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {/* Precios */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Valor bono</p>
                        <p className="font-bold text-gray-900">${bono.valorFace.toLocaleString("es-CO")}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Precio venta</p>
                        <p className="font-bold text-[#102463]">${bono.precio.toLocaleString("es-CO")}</p>
                      </div>
                    </div>

                    {/* Stock con ajuste rápido */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-gray-400 text-xs">Stock</p>
                        <p className="font-extrabold text-gray-900 text-lg">{bono.stock.toLocaleString("es-CO")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => ajustarStock(bono, -10)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center transition-colors">−</button>
                        <button onClick={() => ajustarStock(bono, 10)} className="w-7 h-7 rounded-full bg-[#102463] hover:bg-[#173592] text-white font-bold text-sm flex items-center justify-center transition-colors">+</button>
                        <span className="text-xs text-gray-400">×10</span>
                      </div>
                    </div>

                    {/* Ventas */}
                    <p className="text-xs text-gray-400">
                      {bono._count.compras} {bono._count.compras === 1 ? "venta" : "ventas"} realizadas
                    </p>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setModalBono(bono)}
                        className="flex-1 text-sm font-semibold text-[#102463] border border-[#102463]/30 hover:border-[#102463] py-2 rounded-xl transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActivo(bono)}
                        className={`flex-1 text-sm font-semibold py-2 rounded-xl transition-colors ${bono.activo ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                      >
                        {bono.activo ? "Pausar" : "Activar"}
                      </button>
                      <button
                        onClick={() => eliminarBono(bono)}
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {modalBono !== null && (
        <ModalBono
          bono={modalBono === "nuevo" ? null : modalBono}
          onGuardar={guardarBono}
          onCerrar={() => setModalBono(null)}
        />
      )}
    </div>
  );
}
