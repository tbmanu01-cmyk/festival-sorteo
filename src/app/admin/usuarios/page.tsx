"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mascararCuenta } from "@/lib/mascara";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface UsuarioLista {
  id: string; nombre: string; apellido: string; documento: string;
  correo: string; celular: string; ciudad: string; departamento: string;
  saldoPuntos: number; activo: boolean; confirmado: boolean; rol: string;
  fechaRegistro: string; _count: { cajas: number };
}

interface UsuarioDetalle extends UsuarioLista {
  banco: string | null; tipoCuenta: string | null; cuentaBancaria: string | null;
  codigoRef: string | null; loginIntentos: number; bloqueadoHasta: string | null;
  _count: { cajas: number; retiros: number; giftCards: number };
}

type TabEdicion = "perfil" | "ubicacion" | "banco" | "cuenta" | "password";

// ── Modal de edición ─────────────────────────────────────────────────────────

function ModalEdicion({
  userId,
  onClose,
  onGuardado,
}: {
  userId: string;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [user, setUser] = useState<UsuarioDetalle | null>(null);
  const [tab, setTab] = useState<TabEdicion>("perfil");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Campos del form
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [documento, setDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [activo, setActivo] = useState(true);
  const [confirmado, setConfirmado] = useState(false);
  const [rol, setRol] = useState("USER");
  const [ajusteSaldo, setAjusteSaldo] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [desbloquear, setDesbloquear] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/usuarios/${userId}`)
      .then((r) => r.json())
      .then(({ user: u }: { user: UsuarioDetalle }) => {
        setUser(u);
        setNombre(u.nombre); setApellido(u.apellido); setDocumento(u.documento);
        setCorreo(u.correo); setCelular(u.celular); setCiudad(u.ciudad);
        setDepartamento(u.departamento); setBanco(u.banco ?? "");
        setTipoCuenta(u.tipoCuenta ?? ""); setCuentaBancaria(u.cuentaBancaria ?? "");
        setActivo(u.activo); setConfirmado(u.confirmado); setRol(u.rol);
      });
  }, [userId]);

  async function guardar() {
    setGuardando(true); setError(""); setExito("");
    const body: Record<string, unknown> = {
      nombre, apellido, documento, correo, celular,
      ciudad, departamento, banco, tipoCuenta, cuentaBancaria,
      activo, confirmado, rol,
    };
    if (ajusteSaldo && ajusteSaldo !== "0") {
      body.ajusteSaldo = Number(ajusteSaldo);
      body.motivoAjuste = motivoAjuste || "Ajuste manual por administrador";
    }
    if (nuevaPassword.length >= 8) body.nuevaPassword = nuevaPassword;
    if (desbloquear) body.desbloquear = true;

    const res = await fetch(`/api/admin/usuarios/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { mensaje: string };
    setGuardando(false);
    if (!res.ok) { setError(json.mensaje); return; }
    setExito(json.mensaje);
    setAjusteSaldo(""); setMotivoAjuste(""); setNuevaPassword("");
    setDesbloquear(false);
    onGuardado();
    setTimeout(() => setExito(""), 3000);
  }

  const esBloqueado = user?.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date();

  const tabs: { id: TabEdicion; label: string }[] = [
    { id: "perfil",    label: "Perfil" },
    { id: "ubicacion", label: "Ubicación" },
    { id: "banco",     label: "Banco" },
    { id: "cuenta",    label: "Cuenta" },
    { id: "password",  label: "Contraseña" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#102463] to-[#173592] px-6 py-4 flex items-start justify-between">
          <div>
            {user ? (
              <>
                <h2 className="text-white font-extrabold text-lg leading-tight">
                  {user.nombre} {user.apellido}
                </h2>
                <p className="text-blue-200 text-xs mt-0.5">{user.correo}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {user._count.cajas} membresías
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    Saldo: ${user.saldoPuntos.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </span>
                  {esBloqueado && (
                    <span className="text-[10px] font-bold bg-red-400 text-white px-2 py-0.5 rounded-full">
                      🔒 Cuenta bloqueada
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-white text-sm">Cargando...</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none ml-4 flex-shrink-0">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-b-2 border-[#1B4F8A] text-[#1B4F8A] bg-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!user ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Tab: Perfil ── */}
              {tab === "perfil" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Nombre" value={nombre} onChange={setNombre} />
                    <Campo label="Apellido" value={apellido} onChange={setApellido} />
                  </div>
                  <Campo label="Correo electrónico" value={correo} onChange={setCorreo} type="email" />
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Documento" value={documento} onChange={setDocumento} />
                    <Campo label="Celular" value={celular} onChange={setCelular} type="tel" />
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
                    <p>Código referido: <span className="font-mono font-bold text-[#1B4F8A]">{user.codigoRef ?? "—"}</span></p>
                    <p>Registrado: {new Date(user.fechaRegistro).toLocaleDateString("es-CO")}</p>
                  </div>
                </div>
              )}

              {/* ── Tab: Ubicación ── */}
              {tab === "ubicacion" && (
                <div className="space-y-4">
                  <Campo label="Departamento" value={departamento} onChange={setDepartamento} />
                  <Campo label="Ciudad" value={ciudad} onChange={setCiudad} />
                </div>
              )}

              {/* ── Tab: Banco ── */}
              {tab === "banco" && (
                <div className="space-y-4">
                  <Campo label="Banco" value={banco} onChange={setBanco} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
                    <select
                      value={tipoCuenta}
                      onChange={(e) => setTipoCuenta(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                    >
                      <option value="">Selecciona tipo</option>
                      <option value="AHORROS">Cuenta de Ahorros</option>
                      <option value="CORRIENTE">Cuenta Corriente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de cuenta
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        (actual: {mascararCuenta(user.cuentaBancaria)})
                      </span>
                    </label>
                    <input
                      type="text"
                      value={cuentaBancaria}
                      onChange={(e) => setCuentaBancaria(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 font-mono"
                      placeholder="Número completo de cuenta"
                    />
                  </div>
                </div>
              )}

              {/* ── Tab: Cuenta ── */}
              {tab === "cuenta" && (
                <div className="space-y-5">
                  {/* Estado y rol */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={activo ? "activo" : "inactivo"}
                        onChange={(e) => setActivo(e.target.value === "activo")}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo (bloqueado)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                      <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                      >
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>

                  {/* Confirmado */}
                  <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={confirmado}
                      onChange={(e) => setConfirmado(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#102463]"
                    />
                    <span className="text-sm font-medium text-gray-700">Cuenta confirmada</span>
                  </label>

                  {/* Desbloquear intentos */}
                  {(esBloqueado || (user.loginIntentos ?? 0) > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-red-700 mb-2">
                        {esBloqueado
                          ? `Cuenta bloqueada hasta ${new Date(user.bloqueadoHasta!).toLocaleString("es-CO")}`
                          : `${user.loginIntentos} intento(s) fallido(s) acumulados`}
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={desbloquear}
                          onChange={(e) => setDesbloquear(e.target.checked)}
                          className="w-4 h-4 rounded border-red-300"
                        />
                        <span className="text-xs font-semibold text-red-700">Desbloquear cuenta y resetear intentos</span>
                      </label>
                    </div>
                  )}

                  {/* Ajuste de saldo */}
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-gray-700">
                      Ajuste de saldo
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Saldo actual: ${user.saldoPuntos.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Monto (+/-)</label>
                        <input
                          type="number"
                          value={ajusteSaldo}
                          onChange={(e) => setAjusteSaldo(e.target.value)}
                          placeholder="ej: 50000 o -20000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                        <input
                          type="text"
                          value={motivoAjuste}
                          onChange={(e) => setMotivoAjuste(e.target.value)}
                          placeholder="Razón del ajuste"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Positivo (+) suma al saldo. Negativo (-) descuenta. Se registra en el historial de transacciones.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Tab: Contraseña ── */}
              {tab === "password" && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-yellow-800 font-semibold">
                      ⚠️ Solo completa este campo si deseas cambiar la contraseña del usuario. Mínimo 8 caracteres.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={verPassword ? "text" : "password"}
                        value={nuevaPassword}
                        onChange={(e) => setNuevaPassword(e.target.value)}
                        placeholder="Dejar vacío para no cambiar"
                        className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setVerPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {verPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {nuevaPassword && nuevaPassword.length < 8 && (
                    <p className="text-xs text-red-500">La contraseña debe tener al menos 8 caracteres.</p>
                  )}
                  {nuevaPassword.length >= 8 && (
                    <p className="text-xs text-green-600 font-semibold">✓ Contraseña válida — se actualizará al guardar.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con mensajes y botón */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {error && <p className="text-red-600 text-xs font-semibold mb-3">⚠ {error}</p>}
          {exito && <p className="text-green-600 text-xs font-semibold mb-3">✓ {exito}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={guardar}
              disabled={guardando || !user}
              className="flex-1 py-2.5 bg-[#102463] disabled:bg-gray-300 text-white font-bold text-sm rounded-xl hover:bg-[#173592] transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente auxiliar de campo ─────────────────────────────────────────────

function Campo({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
      />
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function AdminUsuarios() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = useCallback(() => {
    setCargando(true);
    const params = new URLSearchParams({ pagina: String(pagina) });
    if (busqueda) params.set("busqueda", busqueda);
    fetch(`/api/admin/usuarios?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsuarios(data.usuarios ?? []);
        setTotal(data.total ?? 0);
        setTotalPaginas(data.totalPaginas ?? 1);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [pagina, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const rol = (session?.user as unknown as { rol?: string })?.rol;
  if (status === "loading") return null;
  if (rol !== "ADMIN") return <p className="p-8 text-center text-gray-500">No autorizado.</p>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link href="/admin" className="text-sm text-[#1B4F8A] hover:underline">← Panel Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Gestión de Usuarios</h1>
            <p className="text-gray-500 text-sm">{total} usuarios registrados</p>
          </div>
          <button
            onClick={cargar}
            className="text-sm px-4 py-2 border border-gray-200 rounded-xl hover:border-[#1B4F8A] text-gray-600 hover:text-[#1B4F8A] font-semibold transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>

        {/* Búsqueda */}
        <div className="mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre, correo o documento..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 bg-white"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin mr-3" />
              <span className="text-gray-400">Cargando usuarios...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p className="font-semibold">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Ciudad</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Membresías</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{u.nombre} {u.apellido}</p>
                        <p className="text-xs text-gray-400">{u.correo}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{u.documento}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell">{u.ciudad}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-[#1B4F8A]">{u._count.cajas}</td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-green-600">
                        ${u.saldoPuntos.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setEditandoId(u.id)}
                          className="bg-[#102463] hover:bg-[#173592] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-3 mt-5">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:border-[#1B4F8A] transition-colors">
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:border-[#1B4F8A] transition-colors">
              Siguiente →
            </button>
          </div>
        )}

      </main>

      {/* Modal de edición */}
      {editandoId && (
        <ModalEdicion
          userId={editandoId}
          onClose={() => setEditandoId(null)}
          onGuardado={cargar}
        />
      )}

      <Footer />
    </div>
  );
}
