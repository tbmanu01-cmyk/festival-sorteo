"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registroSchema, type RegistroFormData } from "@/lib/validaciones";
import { departamentos, ciudadesPorDepartamento, bancos } from "@/lib/colombia";

// ── Componentes de campo ──────────────────────────────────────────────────

function CampoTexto({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition ${
          error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function CampoSelect({
  label,
  error,
  children,
  ...props
}: { label: string; error?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#102463] transition bg-white ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── Formulario de registro ────────────────────────────────────────────────

function FormularioRegistro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ciudades, setCiudades] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
  });

  const departamentoSeleccionado = watch("departamento");

  useEffect(() => {
    if (departamentoSeleccionado) {
      setCiudades(ciudadesPorDepartamento[departamentoSeleccionado] ?? []);
    }
  }, [departamentoSeleccionado]);

  async function onSubmit(data: RegistroFormData) {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, refCode: refCode || undefined }),
      });

      let json: Record<string, unknown> = {};
      try {
        json = await res.json();
      } catch {
        setError("Error inesperado del servidor. Intenta nuevamente.");
        return;
      }

      if (!res.ok) {
        setError((json.mensaje as string) ?? "Error al crear la cuenta. Intenta nuevamente.");
        return;
      }

      router.push("/login?registro=exitoso");
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen c10-hero-wrap flex flex-col" style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #0a1845 100%)" }}>
      {/* Header simple */}
      <div className="py-4 px-6" style={{ position: "relative", zIndex: 1 }}>
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div style={{ width: 36, height: 36, background: "#ffbd1f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#102463", fontSize: 12 }}>
            10K
          </div>
          <span className="text-white font-bold">Club 10K</span>
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center py-8 px-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Cabecera */}
          <div style={{ background: "linear-gradient(135deg, #102463, #173592)", padding: "24px 32px" }}>
            <h1 className="text-2xl font-extrabold text-white">Crear cuenta</h1>
            <p style={{ color: "rgba(255,255,255,0.70)", fontSize: 14, marginTop: 4 }}>
              Completa el formulario para adquirir tu membresía
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">
            {refCode && (
              <div className="bg-[#102463]/5 border border-[#1B4F8A]/20 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-[#102463] text-sm font-medium">
                  Fuiste invitado con el código <span className="font-extrabold">{refCode}</span> — ¡bienvenido!
                </p>
              </div>
            )}

            {/* Datos personales */}
            <section>
              <h2 className="text-[#102463] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#102463] rounded-full text-white text-xs flex items-center justify-center">1</span>
                Datos personales
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <CampoTexto
                  label="Nombre *"
                  placeholder="Tu nombre"
                  error={errors.nombre?.message}
                  {...register("nombre")}
                />
                <CampoTexto
                  label="Apellido *"
                  placeholder="Tu apellido"
                  error={errors.apellido?.message}
                  {...register("apellido")}
                />
                <CampoTexto
                  label="Número de documento *"
                  placeholder="Cédula de ciudadanía"
                  error={errors.documento?.message}
                  {...register("documento")}
                />
                <CampoTexto
                  label="Celular *"
                  placeholder="3XXXXXXXXX"
                  type="tel"
                  maxLength={10}
                  error={errors.celular?.message}
                  {...register("celular")}
                />
                <CampoTexto
                  label="Correo electrónico *"
                  placeholder="correo@ejemplo.com"
                  type="email"
                  error={errors.correo?.message}
                  {...register("correo")}
                />
              </div>
            </section>

            {/* Ubicación */}
            <section>
              <h2 className="text-[#102463] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#102463] rounded-full text-white text-xs flex items-center justify-center">2</span>
                Ubicación
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <CampoSelect
                  label="Departamento *"
                  error={errors.departamento?.message}
                  {...register("departamento")}
                >
                  <option value="">Selecciona departamento</option>
                  {departamentos.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </CampoSelect>
                <CampoSelect
                  label="Ciudad *"
                  error={errors.ciudad?.message}
                  disabled={ciudades.length === 0}
                  {...register("ciudad")}
                >
                  <option value="">
                    {ciudades.length === 0 ? "Primero elige departamento" : "Selecciona ciudad"}
                  </option>
                  {ciudades.map((ciudad) => (
                    <option key={ciudad} value={ciudad}>{ciudad}</option>
                  ))}
                </CampoSelect>
              </div>
            </section>

            {/* Datos bancarios */}
            <section>
              <h2 className="text-[#102463] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#102463] rounded-full text-white text-xs flex items-center justify-center">3</span>
                Datos bancarios
                <span className="text-gray-400 text-xs font-normal normal-case">(para recibir premios)</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <CampoSelect
                  label="Banco *"
                  error={errors.banco?.message}
                  {...register("banco")}
                >
                  <option value="">Selecciona banco</option>
                  {bancos.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </CampoSelect>
                <CampoSelect
                  label="Tipo de cuenta *"
                  error={errors.tipoCuenta?.message}
                  {...register("tipoCuenta")}
                >
                  <option value="">Selecciona tipo</option>
                  <option value="AHORROS">Cuenta de Ahorros</option>
                  <option value="CORRIENTE">Cuenta Corriente</option>
                </CampoSelect>
                <CampoTexto
                  label="Número de cuenta *"
                  placeholder="Número de cuenta bancaria"
                  className="sm:col-span-2"
                  error={errors.cuentaBancaria?.message}
                  {...register("cuentaBancaria")}
                />
              </div>
            </section>

            {/* Contraseña */}
            <section>
              <h2 className="text-[#102463] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#102463] rounded-full text-white text-xs flex items-center justify-center">4</span>
                Contraseña
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <CampoTexto
                  label="Contraseña *"
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  error={errors.password?.message}
                  {...register("password")}
                />
                <CampoTexto
                  label="Confirmar contraseña *"
                  placeholder="Repite la contraseña"
                  type="password"
                  error={errors.confirmarPassword?.message}
                  {...register("confirmarPassword")}
                />
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Mínimo 8 caracteres, una mayúscula y un número.
              </p>
            </section>

            {/* Términos */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#102463] focus:ring-[#102463]"
                  {...register("terminos")}
                />
                <span className="text-sm text-gray-600">
                  Acepto los{" "}
                  <Link href="/terminos" className="text-[#102463] underline hover:no-underline" target="_blank">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="text-[#102463] underline hover:no-underline" target="_blank">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
              {errors.terminos && (
                <p className="text-red-500 text-xs mt-1">{errors.terminos.message}</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#102463] disabled:bg-gray-400 text-white font-bold py-3.5 rounded-full text-lg transition-all shadow-lg hover:bg-[#173592]"
            >
              {cargando ? "Registrando..." : "Registrarse"}
            </button>

            <p className="text-center text-gray-500 text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: "#102463" }} className="font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaginaRegistro() {
  return (
    <Suspense>
      <FormularioRegistro />
    </Suspense>
  );
}
