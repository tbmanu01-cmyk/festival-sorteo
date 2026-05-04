"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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

function FormularioReseteo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="px-8 py-6 text-center space-y-4">
        <p className="text-red-600 font-semibold">Enlace inválido o expirado.</p>
        <Link href="/recuperar-password" className="text-[#102463] font-semibold hover:underline text-sm">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmar) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 8) { setError("Mínimo 8 caracteres."); return; }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resetear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json() as { mensaje: string };
      if (!res.ok) { setError(json.mensaje); return; }
      setExito(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="px-8 py-6">
      {exito ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">¡Contraseña actualizada!</h2>
          <p className="text-sm text-gray-500">Serás redirigido al inicio de sesión en unos segundos...</p>
          <Link href="/login" className="block w-full text-center bg-[#102463] text-white font-bold py-3 rounded-full text-sm hover:bg-[#173592] transition-colors">
            Ir al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition"
              />
              <button type="button" onClick={() => setVerPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <EyeIcon open={verPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={verConfirmar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition"
              />
              <button type="button" onClick={() => setVerConfirmar((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <EyeIcon open={verConfirmar} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !password || !confirmar}
            className="w-full bg-[#102463] disabled:bg-gray-300 text-white font-bold py-3.5 rounded-full text-base transition-all hover:bg-[#173592]"
          >
            {enviando ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetearPassword() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #0a1845 100%)" }}>
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div style={{ width: 48, height: 48, background: "#ffbd1f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#102463", fontSize: 13 }}>
          10K
        </div>
        <div>
          <p className="text-white font-bold text-xl">Club 10K</p>
          <p style={{ color: "#ffbd1f", fontSize: 13 }}>10,000 membresías</p>
        </div>
      </Link>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, #102463, #173592)", padding: "24px 32px" }}>
          <h1 className="text-2xl font-extrabold text-white">Nueva contraseña</h1>
          <p style={{ color: "rgba(255,255,255,0.70)", fontSize: 14, marginTop: 4 }}>
            Elige una contraseña segura para tu cuenta
          </p>
        </div>

        <Suspense fallback={<div className="px-8 py-6 text-center text-gray-400">Cargando...</div>}>
          <FormularioReseteo />
        </Suspense>
      </div>
    </div>
  );
}
