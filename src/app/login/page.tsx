"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validaciones";

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

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
      setError("Correo o contraseña incorrectos. Verifica tus datos.");
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
          className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] transition ${
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
          <Link href="/recuperar-password" className="text-xs text-[#1B4F8A] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          type="password"
          placeholder="Tu contraseña"
          autoComplete="current-password"
          className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] transition ${
            errors.password ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl text-lg transition-colors shadow-lg"
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
        <Link href="/registro" className="text-[#1B4F8A] font-semibold hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4F8A] to-[#0d3b6e] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 bg-[#F5A623] rounded-full flex items-center justify-center font-bold text-[#1B4F8A] text-lg">
          FS
        </div>
        <div>
          <p className="text-white font-bold text-xl">10K</p>
          <p className="text-[#F5A623] text-sm">Club</p>
        </div>
      </Link>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] px-8 py-6">
          <h1 className="text-2xl font-extrabold text-white">Iniciar sesión</h1>
          <p className="text-blue-200 text-sm mt-1">Accede a tu cuenta para gestionar tus cajas</p>
        </div>

        <Suspense fallback={<div className="px-8 py-6 text-center text-gray-500">Cargando...</div>}>
          <FormularioLogin />
        </Suspense>
      </div>

      <p className="text-blue-200 text-xs mt-6 text-center">
        Al ingresar aceptas nuestros{" "}
        <Link href="/terminos" className="underline hover:text-white">
          términos y condiciones
        </Link>
      </p>
    </div>
  );
}
