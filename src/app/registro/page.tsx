"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registroSchema, type RegistroFormData } from "@/lib/validaciones";
import { departamentos, ciudadesPorDepartamento, bancos } from "@/lib/colombia";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTiempo(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatWhatsappDisplay(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return val;
}

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
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] transition ${
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
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] transition bg-white ${
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

// ── Pantalla de verificación WhatsApp (paso 2) ────────────────────────────

interface VerificacionProps {
  whatsapp: string;
  verificacionId: string;
  datosRegistro: RegistroFormData;
  refCode: string;
  onReenviar: () => Promise<void>;
  onVolver: () => void;
}

function PantallaVerificacion({
  whatsapp,
  verificacionId,
  datosRegistro,
  refCode,
  onReenviar,
  onVolver,
}: VerificacionProps) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [tiempoRestante, setTiempoRestante] = useState(10 * 60);
  const [cooldown, setCooldown] = useState(60);
  const [reenviando, setReenviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Countdown expiración
  useEffect(() => {
    setTiempoRestante(10 * 60);
    const iv = setInterval(() => {
      setTiempoRestante((t) => (t <= 1 ? (clearInterval(iv), 0) : t - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [verificacionId]);

  // Cooldown reenvío
  useEffect(() => {
    setCooldown(60);
    const iv = setInterval(() => {
      setCooldown((c) => (c <= 1 ? (clearInterval(iv), 0) : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [verificacionId]);

  async function handleVerificar() {
    if (codigo.length !== 6) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificacionId,
          codigo,
          refCode: refCode || undefined,
          ...datosRegistro,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.mensaje ?? "Código incorrecto. Intenta nuevamente.");
        return;
      }
      router.push("/login?registro=exitoso");
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    setError("");
    setMensajeExito("");
    try {
      await onReenviar();
      setMensajeExito("Código reenviado correctamente.");
      setCodigo("");
    } catch {
      setError("Error al reenviar el código. Intenta nuevamente.");
    } finally {
      setReenviando(false);
    }
  }

  const expirado = tiempoRestante === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] flex flex-col">
      <div className="py-4 px-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 bg-[#F5A623] rounded-full flex items-center justify-center font-bold text-[#1B4F8A] text-sm">
            10K
          </div>
          <span className="text-white font-bold">Cajas Sorpresa 10K</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Cabecera verde WhatsApp */}
          <div className="px-8 py-7 text-center"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            <div className="text-5xl mb-3">📱</div>
            <h1 className="text-2xl font-extrabold text-white">Verifica tu WhatsApp</h1>
            <p className="text-green-100 text-sm mt-2">
              Enviamos un código de 6 dígitos a
            </p>
            <p className="text-white font-bold text-base mt-1">
              {formatWhatsappDisplay(whatsapp)}
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Éxito reenvío */}
            {mensajeExito && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-green-700 text-sm">{mensajeExito}</p>
              </div>
            )}

            {/* Contador expiración */}
            <div className="text-center bg-gray-50 rounded-xl py-4">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
                Código expira en
              </p>
              <p className={`text-3xl font-extrabold tabular-nums ${
                expirado ? "text-red-500" : tiempoRestante < 60 ? "text-orange-500" : "text-[#1B4F8A]"
              }`}>
                {expirado ? "Expirado" : formatTiempo(tiempoRestante)}
              </p>
            </div>

            {/* Input código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                disabled={expirado}
                className={`w-full px-4 py-4 border-2 rounded-xl text-center text-4xl font-extrabold tracking-[0.5em] text-[#1B4F8A] focus:outline-none transition ${
                  expirado
                    ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 focus:border-[#1B4F8A] bg-white"
                }`}
              />
            </div>

            {/* Botón verificar */}
            <button
              onClick={handleVerificar}
              disabled={codigo.length !== 6 || cargando || expirado}
              className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-lg transition-colors shadow-md"
            >
              {cargando ? "Verificando..." : "Confirmar código"}
            </button>

            {/* Reenviar */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-gray-400 text-sm">
                  Reenviar código en{" "}
                  <span className="font-bold text-gray-600 tabular-nums">{cooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleReenviar}
                  disabled={reenviando}
                  className="text-[#1B4F8A] text-sm font-semibold hover:underline disabled:opacity-50"
                >
                  {reenviando ? "Reenviando..." : "Reenviar código"}
                </button>
              )}
            </div>

            {/* Volver */}
            <button
              onClick={onVolver}
              className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              ← Cambiar número de WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Formulario de registro (paso 1) ───────────────────────────────────────

function FormularioRegistro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ciudades, setCiudades] = useState<string[]>([]);

  // Estado del flujo de 2 pasos
  const [paso, setPaso] = useState<1 | 2>(1);
  const [verificacionId, setVerificacionId] = useState("");
  const [datosRegistro, setDatosRegistro] = useState<RegistroFormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
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
      const res = await fetch("/api/auth/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, refCode: refCode || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.mensaje ?? "Error al enviar el código. Intenta nuevamente.");
        return;
      }
      setDatosRegistro(data);
      setVerificacionId(json.verificacionId);
      setPaso(2);
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    if (!datosRegistro) return;
    const res = await fetch("/api/auth/enviar-codigo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datosRegistro, refCode: refCode || undefined }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.mensaje ?? "Error al reenviar");
    setVerificacionId(json.verificacionId);
  }

  if (paso === 2 && datosRegistro) {
    return (
      <PantallaVerificacion
        whatsapp={datosRegistro.whatsapp}
        verificacionId={verificacionId}
        datosRegistro={datosRegistro}
        refCode={refCode}
        onReenviar={handleReenviar}
        onVolver={() => setPaso(1)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] flex flex-col">
      {/* Header simple */}
      <div className="py-4 px-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 bg-[#F5A623] rounded-full flex items-center justify-center font-bold text-[#1B4F8A] text-sm">
            10K
          </div>
          <span className="text-white font-bold">Cajas Sorpresa 10K</span>
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Cabecera */}
          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] px-8 py-6">
            <h1 className="text-2xl font-extrabold text-white">Crear cuenta</h1>
            <p className="text-blue-200 text-sm mt-1">
              Completa el formulario para adquirir tu caja sorpresa
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">
            {refCode && (
              <div className="bg-[#1B4F8A]/5 border border-[#1B4F8A]/20 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-[#1B4F8A] text-sm font-medium">
                  Fuiste invitado con el código <span className="font-extrabold">{refCode}</span> — ¡bienvenido!
                </p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Datos personales */}
            <section>
              <h2 className="text-[#1B4F8A] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1B4F8A] rounded-full text-white text-xs flex items-center justify-center">1</span>
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
                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp *{" "}
                    <span className="text-gray-400 font-normal text-xs">(para verificar tu cuenta)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none pointer-events-none">
                      <span className="text-sm">📱</span>
                    </span>
                    <input
                      type="tel"
                      placeholder="+57 300 000 0000"
                      maxLength={16}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] transition ${
                        errors.whatsapp ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
                      }`}
                      {...register("whatsapp")}
                    />
                  </div>
                  {errors.whatsapp && (
                    <p className="text-red-500 text-xs mt-1">{errors.whatsapp.message}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Ubicación */}
            <section>
              <h2 className="text-[#1B4F8A] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1B4F8A] rounded-full text-white text-xs flex items-center justify-center">2</span>
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
              <h2 className="text-[#1B4F8A] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1B4F8A] rounded-full text-white text-xs flex items-center justify-center">3</span>
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
              <h2 className="text-[#1B4F8A] font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1B4F8A] rounded-full text-white text-xs flex items-center justify-center">4</span>
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
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#1B4F8A] focus:ring-[#1B4F8A]"
                  {...register("terminos")}
                />
                <span className="text-sm text-gray-600">
                  Acepto los{" "}
                  <Link href="/terminos" className="text-[#1B4F8A] underline hover:no-underline" target="_blank">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="text-[#1B4F8A] underline hover:no-underline" target="_blank">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
              {errors.terminos && (
                <p className="text-red-500 text-xs mt-1">{errors.terminos.message}</p>
              )}
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl text-lg transition-colors shadow-lg"
            >
              {cargando ? "Enviando código..." : "Continuar → Verificar WhatsApp"}
            </button>

            <p className="text-center text-gray-400 text-xs -mt-2">
              Se enviará un código de verificación a tu WhatsApp
            </p>

            <p className="text-center text-gray-500 text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-[#1B4F8A] font-semibold hover:underline">
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
