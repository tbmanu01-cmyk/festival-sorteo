"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface LogItem {
  id: string;
  accion: string;
  detalle: string | null;
  ip: string | null;
  fecha: string;
  user: { nombre: string; apellido: string; correo: string } | null;
}

const ACCION_STYLE: Record<string, { bg: string; text: string }> = {
  LOGIN_OK:                { bg: "bg-green-100",  text: "text-green-700" },
  LOGIN_FALLIDO:           { bg: "bg-red-100",    text: "text-red-700" },
  PASSWORD_CAMBIADO:       { bg: "bg-blue-100",   text: "text-blue-700" },
  RECUPERACION_SOLICITADA: { bg: "bg-yellow-100", text: "text-yellow-700" },
  RECUPERACION_BLOQUEADA:  { bg: "bg-orange-100", text: "text-orange-700" },
  RESET_TOKEN_INVALIDO:    { bg: "bg-red-100",    text: "text-red-700" },
  RETIRO_SOLICITADO:       { bg: "bg-purple-100", text: "text-purple-700" },
  RETIRO_APROBADO:         { bg: "bg-green-100",  text: "text-green-700" },
  RETIRO_RECHAZADO:        { bg: "bg-red-100",    text: "text-red-700" },
};

function badgeStyle(accion: string) {
  return ACCION_STYLE[accion] ?? { bg: "bg-gray-100", text: "text-gray-600" };
}

export default function PaginaAuditoria() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [filtroAccion, setFiltroAccion] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = useCallback(() => {
    setCargando(true);
    const params = new URLSearchParams({ pagina: String(pagina) });
    if (filtroAccion) params.set("accion", filtroAccion);
    fetch(`/api/admin/auditoria?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setPaginas(data.paginas ?? 1);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [pagina, filtroAccion]);

  useEffect(() => { cargar(); }, [cargar]);

  const rol = (session?.user as unknown as { rol?: string })?.rol;
  if (status === "loading") return null;
  if (rol !== "ADMIN") return <p className="p-8 text-center text-gray-500">No autorizado.</p>;

  const acciones = [
    "Todas", "LOGIN_OK", "LOGIN_FALLIDO", "PASSWORD_CAMBIADO",
    "RECUPERACION_SOLICITADA", "RECUPERACION_BLOQUEADA",
    "RETIRO_SOLICITADO", "RETIRO_APROBADO", "RETIRO_RECHAZADO",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link href="/admin" className="text-sm text-[#1B4F8A] hover:underline">← Panel Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Registro de Auditoría</h1>
            <p className="text-gray-500 text-sm">{total} eventos registrados</p>
          </div>
          <button onClick={cargar} className="text-sm px-4 py-2 border border-gray-200 rounded-xl hover:border-[#1B4F8A] text-gray-600 hover:text-[#1B4F8A] font-semibold transition-colors">
            ↻ Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-5">
          {acciones.map((a) => (
            <button
              key={a}
              onClick={() => { setFiltroAccion(a === "Todas" ? "" : a); setPagina(1); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                (a === "Todas" && !filtroAccion) || filtroAccion === a
                  ? "bg-[#1B4F8A] text-white border-[#1B4F8A]"
                  : "border-gray-200 text-gray-600 hover:border-[#1B4F8A] hover:text-[#1B4F8A]"
              }`}
            >
              {a === "Todas" ? "Todas" : a.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin mr-3" />
              <span className="text-gray-400">Cargando logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">Sin eventos registrados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Acción</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Detalle</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const s = badgeStyle(log.accion);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.fecha).toLocaleString("es-CO")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                            {log.accion.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.user ? (
                            <div>
                              <p className="font-semibold text-gray-800 text-xs">{log.user.nombre} {log.user.apellido}</p>
                              <p className="text-[10px] text-gray-400">{log.user.correo}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                          {log.detalle ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {log.ip ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {paginas > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:border-[#1B4F8A] transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {pagina} / {paginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
              disabled={pagina === paginas}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:border-[#1B4F8A] transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
