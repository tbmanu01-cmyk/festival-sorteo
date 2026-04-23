"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ── Tipos ─────────────────────────────────────────────────────────────────

interface CajaVenta {
  numero: string;
  fechaCompra: string | null;
  idCompra: string | null;
  user: { nombre: string; apellido: string; correo: string; celular: string; ciudad: string } | null;
}

interface PremioReporte {
  id: string;
  categoria: string;
  monto: number;
  pagado: boolean;
  user: { nombre: string; apellido: string; correo: string; celular: string };
}

interface SorteoReporte {
  id: string;
  fecha: string;
  numeroGanador: string | null;
  estado: string;
  totalVendidas: number;
  totalRecaudo: number;
  ganancia: number;
  fondoPremios: number;
  premios: PremioReporte[];
}

interface UsuarioReporte {
  nombre: string;
  apellido: string;
  documento: string;
  correo: string;
  celular: string;
  ciudad: string;
  departamento: string;
  banco: string | null;
  tipoCuenta: string | null;
  cuentaBancaria: string | null;
  saldoPuntos: number;
  activo: boolean;
  fechaRegistro: string;
  _count: { cajas: number };
}

type Tab = "ventas" | "sorteo" | "usuarios";

const NOMBRE_CAT: Record<string, string> = {
  CUATRO_CIFRAS: "4 cifras",
  TRES_CIFRAS:   "3 cifras",
  DOS_CIFRAS:    "2 cifras",
  UNA_CIFRA:     "1 cifra",
};

// ── Utilidades de exportación ─────────────────────────────────────────────

function descargarCSV(nombre: string, encabezados: string[], filas: (string | number | null | undefined)[][]) {
  const bom = "﻿";
  const csv = [encabezados, ...filas]
    .map((fila) =>
      fila.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function abrirPDF(titulo: string, subtitulo: string, tablaHTML: string) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) { alert("Activa las ventanas emergentes para exportar PDF."); return; }
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  body{font-family:Arial,sans-serif;margin:32px;color:#222;}
  .logo{color:#1B4F8A;font-size:22px;font-weight:900;margin-bottom:4px;}
  .sub{color:#888;font-size:13px;margin-bottom:24px;}
  h1{color:#1B4F8A;font-size:20px;margin:0 0 4px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;}
  th{background:#1B4F8A;color:#fff;padding:9px 12px;text-align:left;}
  td{padding:7px 12px;border-bottom:1px solid #eee;}
  tr:nth-child(even) td{background:#f8f8f8;}
  .footer{margin-top:32px;color:#aaa;font-size:11px;text-align:center;border-top:1px solid #eee;padding-top:12px;}
  .btn{margin-top:20px;background:#1B4F8A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700;}
  @media print{.btn{display:none;} body{margin:12px;}}
</style>
</head>
<body>
<div class="logo">🎁 Cajas Sorpresa 10K</div>
<div class="sub">${subtitulo}</div>
<h1>${titulo}</h1>
${tablaHTML}
<div class="footer">Generado el ${new Date().toLocaleString("es-CO")} · Cajas Sorpresa 10K</div>
<br>
<button class="btn" onclick="window.print()">Imprimir / Guardar como PDF</button>
</body></html>`);
  win.document.close();
}

// ── Reporte de ventas ─────────────────────────────────────────────────────

function ReporteVentas() {
  const [datos, setDatos] = useState<{ cajas: CajaVenta[]; total: number } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reportes/ventas")
      .then((r) => r.json())
      .then(setDatos)
      .finally(() => setCargando(false));
  }, []);

  function exportarCSV() {
    if (!datos) return;
    descargarCSV("reporte_ventas", ["#", "Número Caja", "Nombre", "Correo", "Celular", "Ciudad", "Fecha Compra", "ID Compra"], datos.cajas.map((c, i) => [
      i + 1, c.numero,
      c.user ? `${c.user.nombre} ${c.user.apellido}` : "—",
      c.user?.correo ?? "—", c.user?.celular ?? "—", c.user?.ciudad ?? "—",
      c.fechaCompra ? new Date(c.fechaCompra).toLocaleString("es-CO") : "—",
      c.idCompra ?? "—",
    ]));
  }

  function exportarPDF() {
    if (!datos) return;
    const filas = datos.cajas.map((c, i) => `<tr>
      <td>${i + 1}</td><td><strong>${c.numero}</strong></td>
      <td>${c.user ? `${c.user.nombre} ${c.user.apellido}` : "—"}</td>
      <td>${c.user?.correo ?? "—"}</td>
      <td>${c.user?.celular ?? "—"}</td>
      <td>${c.fechaCompra ? new Date(c.fechaCompra).toLocaleDateString("es-CO") : "—"}</td>
    </tr>`).join("");
    abrirPDF(
      "Reporte de Ventas",
      `Total vendidas: ${datos.total} cajas · Recaudo: $${(datos.total * 10000).toLocaleString("es-CO")} COP`,
      `<table><thead><tr><th>#</th><th>Caja</th><th>Comprador</th><th>Correo</th><th>Celular</th><th>Fecha</th></tr></thead><tbody>${filas}</tbody></table>`
    );
  }

  if (cargando) return <div className="py-20 text-center text-gray-400">Cargando ventas...</div>;
  if (!datos) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">
            Total: <strong>{datos.total}</strong> cajas vendidas ·{" "}
            Recaudo: <strong className="text-green-600">${(datos.total * 10_000).toLocaleString("es-CO")} COP</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            ↓ Excel / CSV
          </button>
          <button onClick={exportarPDF} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            ↓ PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B4F8A] text-white text-left">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Caja</th>
                <th className="px-4 py-3 font-semibold">Comprador</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Celular</th>
                <th className="px-4 py-3 font-semibold">Ciudad</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold text-xs font-mono">ID Compra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.cajas.map((c, i) => (
                <tr key={c.numero} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-extrabold text-[#1B4F8A] tracking-wider">{c.numero}</td>
                  <td className="px-4 py-3 font-medium">{c.user ? `${c.user.nombre} ${c.user.apellido}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.user?.correo ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.user?.celular ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.user?.ciudad ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.fechaCompra ? new Date(c.fechaCompra).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs max-w-xs truncate">{c.idCompra ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {datos.cajas.length === 0 && (
            <div className="py-16 text-center text-gray-400">No hay cajas vendidas aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reporte de sorteo ─────────────────────────────────────────────────────

function ReporteSorteo() {
  const [datos, setDatos] = useState<{ sorteo: SorteoReporte | null } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reportes/sorteo")
      .then((r) => r.json())
      .then(setDatos)
      .finally(() => setCargando(false));
  }, []);

  function exportarCSV() {
    if (!datos?.sorteo) return;
    const s = datos.sorteo;
    descargarCSV("reporte_sorteo", ["Categoría", "Ganador", "Correo", "Celular", "Monto Premio", "Pagado"], s.premios.map((p) => [
      NOMBRE_CAT[p.categoria] ?? p.categoria,
      `${p.user.nombre} ${p.user.apellido}`,
      p.user.correo, p.user.celular,
      `$${p.monto.toLocaleString("es-CO")}`,
      p.pagado ? "Sí" : "No",
    ]));
  }

  function exportarPDF() {
    if (!datos?.sorteo) return;
    const s = datos.sorteo;
    const resumen = `
      <table style="margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <tr><th style="background:#1B4F8A;color:#fff;padding:8px 16px;">Campo</th><th style="background:#1B4F8A;color:#fff;padding:8px 16px;">Valor</th></tr>
        <tr><td style="padding:7px 16px;">Número ganador</td><td style="padding:7px 16px;font-size:24px;font-weight:900;color:#1B4F8A;">${s.numeroGanador ?? "—"}</td></tr>
        <tr><td style="padding:7px 16px;">Fecha</td><td style="padding:7px 16px;">${new Date(s.fecha).toLocaleString("es-CO")}</td></tr>
        <tr><td style="padding:7px 16px;">Total vendidas</td><td style="padding:7px 16px;">${s.totalVendidas}</td></tr>
        <tr><td style="padding:7px 16px;">Total recaudo</td><td style="padding:7px 16px;color:green;font-weight:700;">$${s.totalRecaudo.toLocaleString("es-CO")}</td></tr>
        <tr><td style="padding:7px 16px;">Fondo de premios</td><td style="padding:7px 16px;">$${s.fondoPremios.toLocaleString("es-CO")}</td></tr>
        <tr><td style="padding:7px 16px;">Ganancia operación</td><td style="padding:7px 16px;font-weight:700;">$${s.ganancia.toLocaleString("es-CO")}</td></tr>
      </table>
      <h2 style="color:#1B4F8A;">Ganadores</h2>
      <table><thead><tr><th>Categoría</th><th>Nombre</th><th>Correo</th><th>Premio</th></tr></thead>
      <tbody>${s.premios.map((p) => `<tr><td>${NOMBRE_CAT[p.categoria] ?? p.categoria}</td><td>${p.user.nombre} ${p.user.apellido}</td><td>${p.user.correo}</td><td>$${p.monto.toLocaleString("es-CO")}</td></tr>`).join("")}</tbody></table>`;
    abrirPDF("Reporte de Sorteo", `Número ganador: ${s.numeroGanador} · Fecha: ${new Date(s.fecha).toLocaleDateString("es-CO")}`, resumen);
  }

  if (cargando) return <div className="py-20 text-center text-gray-400">Cargando sorteo...</div>;
  if (!datos?.sorteo) return (
    <div className="py-20 text-center text-gray-400">
      <p className="text-4xl mb-3">🎰</p>
      <p className="font-semibold">No hay sorteos finalizados aún.</p>
    </div>
  );

  const s = datos.sorteo;
  const conteo = { CUATRO_CIFRAS: 0, TRES_CIFRAS: 0, DOS_CIFRAS: 0, UNA_CIFRA: 0 } as Record<string, number>;
  for (const p of s.premios) conteo[p.categoria] = (conteo[p.categoria] ?? 0) + 1;

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">↓ Excel / CSV</button>
        <button onClick={exportarPDF} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">↓ PDF</button>
      </div>

      {/* Resumen */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Número ganador", valor: s.numeroGanador ?? "—", grande: true, color: "text-[#1B4F8A]" },
          { label: "Total recaudo", valor: `$${s.totalRecaudo.toLocaleString("es-CO")}`, color: "text-green-600" },
          { label: "Fondo premios", valor: `$${s.fondoPremios.toLocaleString("es-CO")}`, color: "text-[#F5A623]" },
          { label: "Ganancia operación", valor: `$${s.ganancia.toLocaleString("es-CO")}`, color: "text-purple-600" },
          { label: "Cajas vendidas", valor: String(s.totalVendidas), color: "text-gray-700" },
          { label: "Total ganadores", valor: String(s.premios.length), color: "text-gray-700" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">{c.label}</p>
            <p className={`font-extrabold text-xl ${c.color}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Ganadores por categoría */}
      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        {(["CUATRO_CIFRAS", "TRES_CIFRAS", "DOS_CIFRAS", "UNA_CIFRA"] as const).map((cat) => (
          <div key={cat} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{NOMBRE_CAT[cat]}</p>
            <p className="text-2xl font-extrabold text-[#F5A623]">{conteo[cat] ?? 0}</p>
            <p className="text-xs text-gray-400">ganadores</p>
          </div>
        ))}
      </div>

      {/* Tabla de ganadores */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Ganadores del sorteo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B4F8A] text-white text-left">
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Ganador</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Celular</th>
                <th className="px-4 py-3 font-semibold">Premio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {s.premios.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {NOMBRE_CAT[p.categoria] ?? p.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.user.nombre} {p.user.apellido}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.user.correo}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.user.celular}</td>
                  <td className="px-4 py-3 font-bold text-[#F5A623]">${p.monto.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {p.pagado ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Reporte de usuarios ───────────────────────────────────────────────────

function ReporteUsuarios() {
  const [datos, setDatos] = useState<{ usuarios: UsuarioReporte[]; total: number } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reportes/usuarios")
      .then((r) => r.json())
      .then(setDatos)
      .finally(() => setCargando(false));
  }, []);

  function exportarCSV() {
    if (!datos) return;
    descargarCSV("reporte_usuarios",
      ["#", "Nombre", "Apellido", "Documento", "Correo", "Celular", "Ciudad", "Departamento", "Banco", "Tipo Cuenta", "Cuenta Bancaria", "Saldo", "Cajas", "Activo", "Registro"],
      datos.usuarios.map((u, i) => [
        i + 1, u.nombre, u.apellido, u.documento, u.correo, u.celular, u.ciudad, u.departamento,
        u.banco ?? "", u.tipoCuenta ?? "", u.cuentaBancaria ?? "",
        `$${u.saldoPuntos.toLocaleString("es-CO")}`,
        u._count.cajas, u.activo ? "Sí" : "No",
        new Date(u.fechaRegistro).toLocaleDateString("es-CO"),
      ])
    );
  }

  function exportarPDF() {
    if (!datos) return;
    const filas = datos.usuarios.map((u, i) => `<tr>
      <td>${i + 1}</td>
      <td>${u.nombre} ${u.apellido}</td>
      <td>${u.correo}</td>
      <td>${u.celular}</td>
      <td>${u.ciudad}</td>
      <td>${u.banco ? `${u.banco} ${u.tipoCuenta ?? ""} ${u.cuentaBancaria ?? ""}`.trim() : "—"}</td>
      <td>$${u.saldoPuntos.toLocaleString("es-CO")}</td>
      <td>${u._count.cajas}</td>
    </tr>`).join("");
    abrirPDF(
      "Reporte de Usuarios",
      `Total registrados: ${datos.total}`,
      `<table><thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Celular</th><th>Ciudad</th><th>Cuenta</th><th>Saldo</th><th>Cajas</th></tr></thead><tbody>${filas}</tbody></table>`
    );
  }

  if (cargando) return <div className="py-20 text-center text-gray-400">Cargando usuarios...</div>;
  if (!datos) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Total: <strong>{datos.total}</strong> usuarios registrados</p>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">↓ Excel / CSV</button>
          <button onClick={exportarPDF} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">↓ PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B4F8A] text-white text-left">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Celular</th>
                <th className="px-4 py-3 font-semibold">Ciudad</th>
                <th className="px-4 py-3 font-semibold">Banco / Cuenta</th>
                <th className="px-4 py-3 font-semibold">Saldo</th>
                <th className="px-4 py-3 font-semibold">Cajas</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.usuarios.map((u, i) => (
                <tr key={u.correo} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{u.nombre} {u.apellido}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.correo}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.celular}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.ciudad}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.banco ? (
                      <span>{u.banco}<br /><span className="text-gray-300">{u.tipoCuenta} {u.cuentaBancaria}</span></span>
                    ) : <span className="text-gray-300">Sin cuenta</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-600 text-xs">${u.saldoPuntos.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] text-xs font-bold px-2 py-0.5 rounded-full">{u._count.cajas}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {datos.usuarios.length === 0 && (
            <div className="py-16 text-center text-gray-400">No hay usuarios registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icono: string }[] = [
  { id: "ventas",   label: "Ventas",   icono: "📦" },
  { id: "sorteo",   label: "Sorteo",   icono: "🎰" },
  { id: "usuarios", label: "Usuarios", icono: "👥" },
];

export default function PaginaReportes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ventas");

  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Encabezado */}
          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white mb-6">
            <h1 className="text-2xl font-extrabold mb-0.5">Reportes</h1>
            <p className="text-blue-200 text-sm">Consulta, filtra y exporta datos del sorteo</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  tab === t.id
                    ? "bg-[#1B4F8A] text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{t.icono}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          {tab === "ventas"   && <ReporteVentas />}
          {tab === "sorteo"   && <ReporteSorteo />}
          {tab === "usuarios" && <ReporteUsuarios />}

        </div>
      </main>
      <Footer />
    </div>
  );
}
