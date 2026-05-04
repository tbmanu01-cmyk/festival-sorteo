"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const json = await res.json() as { mensaje: string };
      if (!res.ok) { setError(json.mensaje); return; }
      setEnviado(true);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

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
          <h1 className="text-2xl font-extrabold text-white">Recuperar contraseña</h1>
          <p style={{ color: "rgba(255,255,255,0.70)", fontSize: 14, marginTop: 4 }}>
            Te enviaremos un enlace para crear una nueva contraseña
          </p>
        </div>

        <div className="px-8 py-6">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Revisa tu correo</h2>
              <p className="text-sm text-gray-500">
                Si <strong>{correo}</strong> tiene una cuenta registrada, recibirás un enlace para restablecer tu contraseña. Recuerda revisar la carpeta de spam.
              </p>
              <Link href="/login" className="block w-full text-center bg-[#102463] text-white font-bold py-3 rounded-full text-sm mt-4 hover:bg-[#173592] transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102463] transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={enviando || !correo}
                className="w-full bg-[#102463] disabled:bg-gray-300 text-white font-bold py-3.5 rounded-full text-base transition-all hover:bg-[#173592]"
              >
                {enviando ? "Enviando..." : "Enviar enlace"}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-[#102463] font-semibold hover:underline">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
