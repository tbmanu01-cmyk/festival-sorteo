"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validaciones";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
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

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("registro") === "exitoso") {
      setExito("¡Cuenta creada exitosamente! Ya puedes iniciar sesión.");
    }
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") {
      setError("Correo o contraseña incorrectos.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setCargando(true);
    setError("");
    const result = await signIn("credentials", {
      correo: data.correo,
      password: data.password,
      redirect: false,
    });
    setCargando(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-5">
      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-green-700 text-sm">{exito}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition ${
            errors.correo ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
          {...register("correo")}
        />
        {errors.correo && (
          <p className="text-red-500 text-xs mt-1">{errors.correo.message}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <Link href="/recuperar-password" className="text-xs text-[#102463] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <input
            type={verPassword ? "text" : "password"}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            className={`w-full px-4 py-3 pr-11 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition ${
              errors.password ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
            {...register("password")}
          />
          <button type="button" onClick={() => setVerPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <EyeIcon open={verPassword} />
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="w-full disabled:bg-gray-400 text-white font-bold py-3.5 rounded-full text-lg transition-all shadow-lg"
        style={{ background: "#102463" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#173592")}
        onMouseLeave={e => (e.currentTarget.style.background = "#102463")}
      >
        {cargando ? "Ingresando..." : "Ingresar"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-gray-400">o</span>
        </div>
      </div>

      <p className="text-center text-gray-600 text-sm">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-[#102463] font-semibold hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 c10-hero-wrap" style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #0a1845 100%)" }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ width: 48, height: 48, background: "#ffbd1f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#102463", fontSize: 13 }}>
          10K
        </div>
        <div>
          <p className="text-white font-bold text-xl">Club 10K</p>
          <p style={{ color: "#ffbd1f", fontSize: 13 }}>10,000 membresías</p>
        </div>
      </Link>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(135deg, #102463, #173592)", padding: "24px 32px" }}>
          <h1 className="text-2xl font-extrabold text-white">Iniciar sesión</h1>
          <p style={{ color: "rgba(255,255,255,0.70)", fontSize: 14, marginTop: 4 }}>Accede a tu cuenta para gestionar tus membresías</p>
        </div>

        <Suspense fallback={<div className="px-8 py-6 text-center text-gray-500">Cargando...</div>}>
          <FormularioLogin />
        </Suspense>
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: "rgba(255,255,255,0.55)", position: "relative", zIndex: 1 }}>
        Al ingresar aceptas nuestros{" "}
        <Link href="/terminos" className="underline hover:text-white">
          términos y condiciones
        </Link>
      </p>
    </div>
  );
}
