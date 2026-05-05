"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mascararCuenta } from "@/lib/mascara";

type Seccion = "personal" | "ubicacion" | "banco" | "password" | null;

interface DatosPerfil {
  nombre: string; apellido: string; correo: string; celular: string;
  ciudad: string; departamento: string;
  banco: string | null; tipoCuenta: string | null; cuentaBancaria: string | null;
}

// ── Icono flecha derecha ───────────────────────────────────────────────────────
const IcoFlecha = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// ── Icono chevron abajo ────────────────────────────────────────────────────────
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// ── Ojo ───────────────────────────────────────────────────────────────────────
const IcoOjo = ({ abierto }: { abierto: boolean }) =>
  abierto ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

// ── Campo de texto ─────────────────────────────────────────────────────────────
function Campo({
  label, value, onChange, type = "text", placeholder = "", mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#6b7693] uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-[#f7f8fc] border border-[#e3e7f2] rounded-2xl text-sm text-[#0e1424] focus:outline-none focus:ring-2 focus:ring-[#102463]/20 focus:border-[#102463] transition-all ${mono ? "font-mono" : "font-medium"}`}
      />
    </div>
  );
}

// ── Fila de sección ───────────────────────────────────────────────────────────
function FilaSeccion({
  icono, titulo, subtitulo, abierta, onToggle, children,
}: {
  icono: string; titulo: string; subtitulo: string;
  abierta: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={`border-b border-[#e3e7f2] last:border-b-0 transition-all ${abierta ? "bg-[#f7f8fc]" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#f7f8fc] transition-colors"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#eef4ff] text-[#102463] flex items-center justify-center text-xl flex-shrink-0">
          {icono}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#0e1424] text-sm">{titulo}</p>
          <p className="text-xs text-[#98a2bf] mt-0.5 truncate">{subtitulo}</p>
        </div>
        <div className="text-[#98a2bf] flex-shrink-0">
          <IcoChevron open={abierta} />
        </div>
      </button>

      {abierta && (
        <div className="px-5 pb-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Botón guardar ──────────────────────────────────────────────────────────────
function BtnGuardar({ guardando, onClick }: { guardando: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={guardando}
      className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white transition-all disabled:opacity-50"
      style={{
        background: guardando ? "#98a2bf" : "linear-gradient(135deg, #102463, #173592)",
        boxShadow: guardando ? "none" : "0 8px 20px -4px rgba(16,36,99,0.45)",
      }}
    >
      {guardando ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function PaginaPerfil() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [datos, setDatos] = useState<DatosPerfil | null>(null);
  const [seccionAbierta, setSeccionAbierta] = useState<Seccion>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string }>>({});

  // Personal
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  // Ubicación
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  // Banco
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  // Contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/usuario/perfil")
        .then((r) => r.json())
        .then(({ user: u }: { user: DatosPerfil }) => {
          setDatos(u);
          setNombre(u.nombre); setApellido(u.apellido);
          setCorreo(u.correo); setCelular(u.celular);
          setCiudad(u.ciudad ?? ""); setDepartamento(u.departamento ?? "");
          setBanco(u.banco ?? ""); setTipoCuenta(u.tipoCuenta ?? "");
          setCuentaBancaria(u.cuentaBancaria ?? "");
        });
    }
  }, [status, router]);

  function toggleSeccion(s: Seccion) {
    setSeccionAbierta((prev) => (prev === s ? null : s));
  }

  function mostrarMensaje(seccion: string, ok: boolean, texto: string) {
    setMensajes((prev) => ({ ...prev, [seccion]: { ok, texto } }));
    setTimeout(() => setMensajes((prev) => { const n = { ...prev }; delete n[seccion]; return n; }), 4000);
  }

  async function guardar(seccion: Seccion) {
    if (!seccion) return;
    setGuardando(true);

    let body: Record<string, unknown> = {};

    if (seccion === "personal") {
      body = { nombre, apellido, correo, celular };
    } else if (seccion === "ubicacion") {
      body = { ciudad, departamento };
    } else if (seccion === "banco") {
      body = { banco, tipoCuenta, cuentaBancaria };
    } else if (seccion === "password") {
      if (!passwordActual) { mostrarMensaje("password", false, "Ingresa tu contraseña actual."); setGuardando(false); return; }
      if (nuevaPassword.length < 8) { mostrarMensaje("password", false, "La nueva contraseña debe tener al menos 8 caracteres."); setGuardando(false); return; }
      if (nuevaPassword !== confirmarPassword) { mostrarMensaje("password", false, "Las contraseñas no coinciden."); setGuardando(false); return; }
      body = { passwordActual, nuevaPassword };
    }

    const res = await fetch("/api/usuario/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { mensaje: string };
    setGuardando(false);
    mostrarMensaje(seccion, res.ok, json.mensaje);

    if (res.ok) {
      if (seccion === "password") { setPasswordActual(""); setNuevaPassword(""); setConfirmarPassword(""); }
      // Actualiza el dato mostrado en el subtítulo
      if (seccion === "personal") setDatos((d) => d ? { ...d, nombre, apellido, correo, celular } : d);
      if (seccion === "ubicacion") setDatos((d) => d ? { ...d, ciudad, departamento } : d);
      if (seccion === "banco") setDatos((d) => d ? { ...d, banco, tipoCuenta, cuentaBancaria } : d);
    }
  }

  if (status === "loading" || !datos) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f8fc]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#102463] border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Iniciales para el avatar
  const iniciales = `${datos.nombre.charAt(0)}${datos.apellido.charAt(0)}`.toUpperCase();
  const nombreCompleto = `${datos.nombre} ${datos.apellido}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fc]">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">

        {/* Volver */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#102463] hover:text-[#173592] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver al inicio
        </Link>

        {/* ── Hero card ── */}
        <div
          className="rounded-3xl p-6 text-white overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #102463 0%, #173592 60%, #0a1845 100%)" }}
        >
          {/* Círculo decorativo dorado */}
          <div
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,189,31,0.25) 0%, transparent 70%)" }}
          />

          <div className="relative flex items-center gap-4">
            {/* Avatar con iniciales */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold flex-shrink-0"
              style={{ background: "#ffbd1f", color: "#102463" }}
            >
              {iniciales}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight tracking-tight">{nombreCompleto}</h1>
              <p className="text-blue-200 text-xs mt-0.5 truncate">{datos.correo}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {datos.celular && (
                  <span className="text-[11px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">
                    📱 {datos.celular}
                  </span>
                )}
                {datos.ciudad && (
                  <span className="text-[11px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">
                    📍 {datos.ciudad}
                  </span>
                )}
              </div>
            </div>
          </div>

          {datos.banco && (
            <div className="relative mt-4 pt-4 border-t border-white/15 flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Banco</span>
              <span className="text-[11px] font-bold text-white">{datos.banco}</span>
              {datos.cuentaBancaria && (
                <>
                  <span className="text-blue-300 mx-1">·</span>
                  <span className="text-[11px] font-mono text-white">{mascararCuenta(datos.cuentaBancaria)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Secciones editables ── */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e3e7f2]">

          {/* Información personal */}
          <FilaSeccion
            icono="👤"
            titulo="Información personal"
            subtitulo={`${datos.nombre} ${datos.apellido} · ${datos.correo}`}
            abierta={seccionAbierta === "personal"}
            onToggle={() => toggleSeccion("personal")}
          >
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre" value={nombre} onChange={setNombre} />
              <Campo label="Apellido" value={apellido} onChange={setApellido} />
            </div>
            <Campo label="Correo electrónico" value={correo} onChange={setCorreo} type="email" />
            <Campo label="Celular" value={celular} onChange={setCelular} type="tel" placeholder="300 000 0000" />
            {mensajes.personal && (
              <p className={`text-xs font-bold ${mensajes.personal.ok ? "text-[#0a8a4a]" : "text-[#c8312a]"}`}>
                {mensajes.personal.ok ? "✓" : "⚠"} {mensajes.personal.texto}
              </p>
            )}
            <BtnGuardar guardando={guardando} onClick={() => guardar("personal")} />
          </FilaSeccion>

          {/* Ubicación */}
          <FilaSeccion
            icono="📍"
            titulo="Ubicación"
            subtitulo={datos.ciudad ? `${datos.ciudad}, ${datos.departamento}` : "Sin configurar"}
            abierta={seccionAbierta === "ubicacion"}
            onToggle={() => toggleSeccion("ubicacion")}
          >
            <Campo label="Departamento" value={departamento} onChange={setDepartamento} placeholder="Ej: Cundinamarca" />
            <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ej: Bogotá" />
            {mensajes.ubicacion && (
              <p className={`text-xs font-bold ${mensajes.ubicacion.ok ? "text-[#0a8a4a]" : "text-[#c8312a]"}`}>
                {mensajes.ubicacion.ok ? "✓" : "⚠"} {mensajes.ubicacion.texto}
              </p>
            )}
            <BtnGuardar guardando={guardando} onClick={() => guardar("ubicacion")} />
          </FilaSeccion>

          {/* Datos bancarios */}
          <FilaSeccion
            icono="🏦"
            titulo="Datos bancarios"
            subtitulo={datos.banco ? `${datos.banco} · ${mascararCuenta(datos.cuentaBancaria)}` : "Sin configurar"}
            abierta={seccionAbierta === "banco"}
            onToggle={() => toggleSeccion("banco")}
          >
            <Campo label="Banco" value={banco} onChange={setBanco} placeholder="Ej: Bancolombia" />
            <div>
              <label className="block text-xs font-bold text-[#6b7693] uppercase tracking-wide mb-1.5">Tipo de cuenta</label>
              <select
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                className="w-full px-4 py-3 bg-[#f7f8fc] border border-[#e3e7f2] rounded-2xl text-sm font-medium text-[#0e1424] focus:outline-none focus:ring-2 focus:ring-[#102463]/20 focus:border-[#102463] transition-all"
              >
                <option value="">Selecciona el tipo</option>
                <option value="AHORROS">Cuenta de Ahorros</option>
                <option value="CORRIENTE">Cuenta Corriente</option>
              </select>
            </div>
            <Campo
              label="Número de cuenta"
              value={cuentaBancaria}
              onChange={setCuentaBancaria}
              placeholder="Número completo"
              mono
            />
            <p className="text-xs text-[#98a2bf]">Estos datos se usan para transferirte tus ganancias.</p>
            {mensajes.banco && (
              <p className={`text-xs font-bold ${mensajes.banco.ok ? "text-[#0a8a4a]" : "text-[#c8312a]"}`}>
                {mensajes.banco.ok ? "✓" : "⚠"} {mensajes.banco.texto}
              </p>
            )}
            <BtnGuardar guardando={guardando} onClick={() => guardar("banco")} />
          </FilaSeccion>

          {/* Contraseña */}
          <FilaSeccion
            icono="🔒"
            titulo="Contraseña"
            subtitulo="Cambiar contraseña de acceso"
            abierta={seccionAbierta === "password"}
            onToggle={() => toggleSeccion("password")}
          >
            <div className="bg-[#e7f0ff] border border-[#b6cdff] rounded-2xl px-4 py-3">
              <p className="text-xs text-[#1e44b8] font-semibold">
                Necesitas ingresar tu contraseña actual para cambiarla. Mínimo 8 caracteres.
              </p>
            </div>

            {/* Actual */}
            <div>
              <label className="block text-xs font-bold text-[#6b7693] uppercase tracking-wide mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={verActual ? "text" : "password"}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full px-4 py-3 pr-11 bg-[#f7f8fc] border border-[#e3e7f2] rounded-2xl text-sm font-medium text-[#0e1424] focus:outline-none focus:ring-2 focus:ring-[#102463]/20 focus:border-[#102463] transition-all"
                />
                <button type="button" onClick={() => setVerActual((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a2bf] hover:text-[#6b7693]">
                  <IcoOjo abierto={verActual} />
                </button>
              </div>
            </div>

            {/* Nueva */}
            <div>
              <label className="block text-xs font-bold text-[#6b7693] uppercase tracking-wide mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={verNueva ? "text" : "password"}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 pr-11 bg-[#f7f8fc] border border-[#e3e7f2] rounded-2xl text-sm font-medium text-[#0e1424] focus:outline-none focus:ring-2 focus:ring-[#102463]/20 focus:border-[#102463] transition-all"
                />
                <button type="button" onClick={() => setVerNueva((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a2bf] hover:text-[#6b7693]">
                  <IcoOjo abierto={verNueva} />
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div>
              <label className="block text-xs font-bold text-[#6b7693] uppercase tracking-wide mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-4 py-3 bg-[#f7f8fc] border border-[#e3e7f2] rounded-2xl text-sm font-medium text-[#0e1424] focus:outline-none focus:ring-2 focus:ring-[#102463]/20 focus:border-[#102463] transition-all"
              />
              {confirmarPassword && nuevaPassword !== confirmarPassword && (
                <p className="text-xs text-[#c8312a] font-semibold mt-1.5">Las contraseñas no coinciden.</p>
              )}
              {confirmarPassword && nuevaPassword === confirmarPassword && nuevaPassword.length >= 8 && (
                <p className="text-xs text-[#0a8a4a] font-semibold mt-1.5">✓ Las contraseñas coinciden.</p>
              )}
            </div>

            {mensajes.password && (
              <p className={`text-xs font-bold ${mensajes.password.ok ? "text-[#0a8a4a]" : "text-[#c8312a]"}`}>
                {mensajes.password.ok ? "✓" : "⚠"} {mensajes.password.texto}
              </p>
            )}
            <BtnGuardar guardando={guardando} onClick={() => guardar("password")} />
          </FilaSeccion>

        </div>

        {/* Pie */}
        <p className="text-center text-xs text-[#98a2bf] pb-4">
          Tu información está protegida y nunca se comparte con terceros.
        </p>

      </main>
      <Footer />
    </div>
  );
}
