"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mascararCuenta } from "@/lib/mascara";

type Tab = "perfil" | "ubicacion" | "banco" | "password";

interface DatosPerfil {
  nombre: string; apellido: string; correo: string; celular: string;
  ciudad: string; departamento: string;
  banco: string | null; tipoCuenta: string | null; cuentaBancaria: string | null;
}

function Campo({
  label, value, onChange, type = "text", placeholder = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 text-gray-900"
      />
    </div>
  );
}

export default function PaginaPerfil() {
  const { status } = useSession();
  const router = useRouter();

  const [datos, setDatos] = useState<DatosPerfil | null>(null);
  const [tab, setTab] = useState<Tab>("perfil");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Campos de perfil
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");

  // Campos de contraseña
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
        .then(({ user }: { user: DatosPerfil }) => {
          setDatos(user);
          setNombre(user.nombre); setApellido(user.apellido);
          setCorreo(user.correo); setCelular(user.celular);
          setCiudad(user.ciudad); setDepartamento(user.departamento);
          setBanco(user.banco ?? ""); setTipoCuenta(user.tipoCuenta ?? "");
          setCuentaBancaria(user.cuentaBancaria ?? "");
        });
    }
  }, [status, router]);

  async function guardar() {
    setError(""); setExito(""); setGuardando(true);

    // Validación de contraseña
    if (tab === "password") {
      if (!passwordActual) { setError("Ingresa tu contraseña actual."); setGuardando(false); return; }
      if (nuevaPassword.length < 8) { setError("La nueva contraseña debe tener al menos 8 caracteres."); setGuardando(false); return; }
      if (nuevaPassword !== confirmarPassword) { setError("Las contraseñas no coinciden."); setGuardando(false); return; }
    }

    const body: Record<string, unknown> = {};

    if (tab === "perfil") {
      body.nombre = nombre; body.apellido = apellido;
      body.correo = correo; body.celular = celular;
    } else if (tab === "ubicacion") {
      body.ciudad = ciudad; body.departamento = departamento;
    } else if (tab === "banco") {
      body.banco = banco; body.tipoCuenta = tipoCuenta; body.cuentaBancaria = cuentaBancaria;
    } else if (tab === "password") {
      body.passwordActual = passwordActual;
      body.nuevaPassword = nuevaPassword;
    }

    const res = await fetch("/api/usuario/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { mensaje: string };
    setGuardando(false);

    if (!res.ok) { setError(json.mensaje); return; }
    setExito(json.mensaje);
    if (tab === "password") {
      setPasswordActual(""); setNuevaPassword(""); setConfirmarPassword("");
    }
    setTimeout(() => setExito(""), 4000);
  }

  if (status === "loading" || !datos) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icono: string }[] = [
    { id: "perfil",    label: "Información personal", icono: "👤" },
    { id: "ubicacion", label: "Ubicación",             icono: "📍" },
    { id: "banco",     label: "Datos bancarios",       icono: "🏦" },
    { id: "password",  label: "Contraseña",            icono: "🔒" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Encabezado */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[#1B4F8A] hover:underline">
            ← Volver al dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Editar mi perfil</h1>
          <p className="text-gray-500 text-sm">Actualiza tu información personal y datos de pago</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-gray-100">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(""); setExito(""); }}
                className={`py-3 px-2 text-center transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-[#1B4F8A] text-[#1B4F8A] bg-blue-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block text-lg">{t.icono}</span>
                <span className="block text-[11px] font-semibold mt-0.5 leading-tight">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="px-6 py-6 space-y-4">

            {/* ── Perfil ── */}
            {tab === "perfil" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="Nombre" value={nombre} onChange={setNombre} />
                  <Campo label="Apellido" value={apellido} onChange={setApellido} />
                </div>
                <Campo label="Correo electrónico" value={correo} onChange={setCorreo} type="email" />
                <Campo label="Celular" value={celular} onChange={setCelular} type="tel" placeholder="300 000 0000" />
              </>
            )}

            {/* ── Ubicación ── */}
            {tab === "ubicacion" && (
              <>
                <Campo label="Departamento" value={departamento} onChange={setDepartamento} placeholder="Ej: Cundinamarca" />
                <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ej: Bogotá" />
              </>
            )}

            {/* ── Banco ── */}
            {tab === "banco" && (
              <>
                <Campo label="Banco" value={banco} onChange={setBanco} placeholder="Ej: Bancolombia" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
                  <select
                    value={tipoCuenta}
                    onChange={(e) => setTipoCuenta(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="AHORROS">Cuenta de Ahorros</option>
                    <option value="CORRIENTE">Cuenta Corriente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de cuenta
                    {datos.cuentaBancaria && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        (actual: {mascararCuenta(datos.cuentaBancaria)})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={cuentaBancaria}
                    onChange={(e) => setCuentaBancaria(e.target.value)}
                    placeholder="Número completo de cuenta"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Estos datos se usan para procesar tus retiros de saldo.
                </p>
              </>
            )}

            {/* ── Contraseña ── */}
            {tab === "password" && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-700">
                    Para cambiar tu contraseña necesitas ingresar primero la actual. Mínimo 8 caracteres.
                  </p>
                </div>

                {/* Contraseña actual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                  <div className="relative">
                    <input
                      type={verActual ? "text" : "password"}
                      value={passwordActual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      placeholder="Tu contraseña actual"
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                    />
                    <button type="button" onClick={() => setVerActual((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <OjoIcono abierto={verActual} />
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={verNueva ? "text" : "password"}
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                    />
                    <button type="button" onClick={() => setVerNueva((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <OjoIcono abierto={verNueva} />
                    </button>
                  </div>
                </div>

                {/* Confirmar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                  />
                  {confirmarPassword && nuevaPassword !== confirmarPassword && (
                    <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
                  )}
                  {confirmarPassword && nuevaPassword === confirmarPassword && nuevaPassword.length >= 8 && (
                    <p className="text-xs text-green-600 mt-1 font-semibold">✓ Las contraseñas coinciden.</p>
                  )}
                </div>
              </>
            )}

            {/* Mensajes */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-semibold">⚠ {error}</p>
              </div>
            )}
            {exito && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-green-700 text-sm font-semibold">✓ {exito}</p>
              </div>
            )}

            {/* Botón guardar */}
            <button
              onClick={guardar}
              disabled={guardando}
              className="w-full py-3.5 bg-[#102463] disabled:bg-gray-300 text-white font-bold rounded-xl hover:bg-[#173592] transition-colors text-sm"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}

function OjoIcono({ abierto }: { abierto: boolean }) {
  return abierto ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}
