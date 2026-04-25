"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Stats {
  vendidas: number; reservadas: number; disponibles: number;
  usuarios: number; retirosPendientes: number;
  totalRecaudo: number; fondoPremios: number; gananciaEstimada: number;
  precioCaja: number; porcentajeVendido: string;
}

interface Usuario {
  id: string; nombre: string; apellido: string; documento: string;
  correo: string; celular: string; ciudad: string; departamento: string;
  saldoPuntos: number; activo: boolean; confirmado: boolean;
  fechaRegistro: string; _count: { cajas: number };
}

interface CajaAdmin {
  id: string; numero: string; estado: string; fechaCompra: string | null;
  user: { nombre: string; apellido: string; correo: string; celular: string } | null;
}

interface Retiro {
  id: string; monto: number; estado: string; cuentaDestino: string; fecha: string;
  user: { nombre: string; apellido: string; correo: string; celular: string; banco: string | null };
}

type Tab = "stats" | "usuarios" | "cajas" | "retiros";

function StatCard({
  titulo, valor, subtitulo, color, icono,
}: { titulo: string; valor: string; subtitulo: string; color: string; icono: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{titulo}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{valor}</p>
          <p className="text-gray-400 text-xs mt-0.5">{subtitulo}</p>
        </div>
        <span className="text-3xl">{icono}</span>
      </div>
    </div>
  );
}

function TablaUsuarios() {
  const [data, setData] = useState<{ usuarios: Usuario[]; total: number } | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/usuarios?pagina=${pagina}`)
      .then((r) => r.json())
      .then(setData);
  }, [pagina]);

  if (!data) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Documento</th>
              <th className="px-4 py-3 font-semibold hidden lg:table-cell">Ciudad</th>
              <th className="px-4 py-3 font-semibold">Cajas</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                  <p className="text-gray-400 text-xs">{u.correo}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{u.documento}</td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{u.ciudad}</td>
                <td className="px-4 py-3 font-bold text-[#1B4F8A]">{u._count.cajas}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ${u.saldoPuntos.toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>{data.total} usuarios registrados</span>
        <div className="flex gap-2">
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            ‹ Anterior
          </button>
          <button onClick={() => setPagina(p => p + 1)} disabled={data.usuarios.length < 20}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  );
}

function TablaCajas() {
  const [data, setData] = useState<{ cajas: CajaAdmin[]; total: number } | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/cajas-vendidas?pagina=${pagina}`)
      .then((r) => r.json())
      .then(setData);
  }, [pagina]);

  if (!data) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Propietario</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.cajas.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-extrabold text-[#1B4F8A] text-lg tracking-widest">
                    {c.numero}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    c.estado === "VENDIDA"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.user ? (
                    <>
                      <p className="font-medium">{c.user.nombre} {c.user.apellido}</p>
                      <p className="text-gray-400 text-xs">{c.user.correo}</p>
                    </>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                  {c.fechaCompra
                    ? new Date(c.fechaCompra).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
        <span>{data.total} cajas ocupadas</span>
        <div className="flex gap-2">
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">‹</button>
          <button onClick={() => setPagina(p => p + 1)} disabled={data.cajas.length < 50}
            className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">›</button>
        </div>
      </div>
    </div>
  );
}

function TablaRetiros() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(() => {
    fetch("/api/admin/retiros").then((r) => r.json()).then((d) => setRetiros(d.retiros ?? []));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(id: string, accion: "aprobar" | "rechazar") {
    setProcesando(id);
    setMensaje("");
    const res = await fetch(`/api/admin/retiros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    const json = await res.json();
    setMensaje(json.mensaje);
    setProcesando(null);
    cargar();
  }

  if (retiros.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">✅</p>
        <p className="font-medium">No hay retiros pendientes</p>
      </div>
    );
  }

  return (
    <div>
      {mensaje && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-green-700 text-sm">
          {mensaje}
        </div>
      )}
      <div className="space-y-3">
        {retiros.map((r) => (
          <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">
                  {r.user.nombre} {r.user.apellido}
                </p>
                <p className="text-gray-500 text-xs">{r.user.correo} · {r.user.celular}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {r.user.banco} · {r.cuentaDestino}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(r.fecha).toLocaleString("es-CO")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold text-[#1B4F8A]">
                  ${r.monto.toLocaleString("es-CO")}
                </span>
                <button
                  onClick={() => accion(r.id, "aprobar")}
                  disabled={!!procesando}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {procesando === r.id ? "..." : "Aprobar"}
                </button>
                <button
                  onClick={() => accion(r.id, "rechazar")}
                  disabled={!!procesando}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>("stats");
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && (session.user as { rol?: string }).rol !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const cargarStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setUltimaActualizacion(new Date()); });
  }, []);

  useEffect(() => {
    cargarStats();
    intervaloRef.current = setInterval(cargarStats, 30_000);
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, [cargarStats]);

  if (status === "loading" || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Cargando panel...</div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "stats", label: "Resumen" },
    { key: "usuarios", label: "Usuarios", badge: stats.usuarios },
    { key: "cajas", label: "Cajas ocupadas", badge: stats.vendidas + stats.reservadas },
    { key: "retiros", label: "Retiros", badge: stats.retirosPendientes || undefined },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-[#1B4F8A]">Panel de Administración</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-500 text-sm">Cajas Sorpresa 10K</p>
                {ultimaActualizacion && (
                  <span className="text-gray-400 text-xs">
                    · Actualizado {ultimaActualizacion.toLocaleTimeString("es-CO", { timeStyle: "short" })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={cargarStats}
                className="border border-gray-200 hover:border-[#1B4F8A] text-gray-600 hover:text-[#1B4F8A] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                ↻ Actualizar
              </button>
              <Link
                href="/admin/reportes"
                className="border border-gray-200 hover:border-[#1B4F8A] text-gray-600 hover:text-[#1B4F8A] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                📊 Reportes
              </Link>
              <Link
                href="/admin/configuracion"
                className="border border-gray-200 hover:border-[#1B4F8A] text-gray-600 hover:text-[#1B4F8A] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                ⚙️ Configuración
              </Link>
              <Link
                href="/admin/anticipadas"
                className="border border-[#F5A623] text-[#b87b00] hover:bg-[#F5A623]/10 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                🎯 Anticipadas
              </Link>
              <Link
                href="/admin/sorteo"
                className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md text-sm flex items-center gap-1.5"
              >
                🎰 Sorteo Principal
              </Link>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              titulo="Cajas vendidas"
              valor={stats.vendidas.toLocaleString("es-CO")}
              subtitulo={`${stats.porcentajeVendido}% del total`}
              color="border-[#1B4F8A]"
              icono="📦"
            />
            <StatCard
              titulo="Recaudo total"
              valor={`$${(stats.totalRecaudo / 1_000_000).toFixed(1)}M`}
              subtitulo={`${stats.vendidas} × $${stats.precioCaja.toLocaleString("es-CO")}`}
              color="border-green-500"
              icono="💰"
            />
            <StatCard
              titulo="Fondo de premios"
              valor={`$${(stats.fondoPremios / 1_000_000).toFixed(1)}M`}
              subtitulo="60% del recaudo"
              color="border-[#F5A623]"
              icono="🏆"
            />
            <StatCard
              titulo="Ganancia operación"
              valor={`$${(stats.gananciaEstimada / 1_000_000).toFixed(1)}M`}
              subtitulo="40% del recaudo"
              color="border-purple-500"
              icono="🎪"
            />
          </div>

          {/* Barra de progreso de ventas */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progreso de ventas</span>
              <span className="text-gray-500">
                {stats.vendidas.toLocaleString("es-CO")} / 10,000
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-[#1B4F8A] to-[#F5A623] h-4 rounded-full transition-all"
                style={{ width: `${stats.porcentajeVendido}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span className="text-green-600 font-medium">{stats.disponibles.toLocaleString("es-CO")} disponibles</span>
              <span className="text-orange-500 font-medium">{stats.reservadas} reservadas</span>
              <span className="text-red-500 font-medium">{stats.vendidas} vendidas</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "border-b-2 border-[#1B4F8A] text-[#1B4F8A]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      t.key === "retiros" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "stats" && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Usuarios registrados", valor: stats.usuarios, icono: "👥" },
                    { label: "Cajas reservadas", valor: stats.reservadas, icono: "⏳" },
                    { label: "Retiros pendientes", valor: stats.retirosPendientes, icono: "💸" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                      <span className="text-3xl">{item.icono}</span>
                      <p className="text-2xl font-extrabold text-[#1B4F8A] mt-2">{item.valor}</p>
                      <p className="text-gray-500 text-sm">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "usuarios" && <TablaUsuarios />}
              {tab === "cajas" && <TablaCajas />}
              {tab === "retiros" && <TablaRetiros />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
