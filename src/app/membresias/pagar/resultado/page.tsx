"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ResultadoPagoBold() {
  return (
    <Suspense fallback={null}>
      <ResultadoInner />
    </Suspense>
  );
}

function ResultadoInner() {
  const searchParams = useSearchParams();
  // Bold agrega este parámetro automáticamente al volver — es nuestro propio
  // data-order-id, no un id interno de Bold, pese al nombre.
  const orderId = searchParams.get("bold-order-id") ?? "";

  const [numero, setNumero] = useState("");
  const [numeros, setNumeros] = useState<string[]>([]);
  const [tier, setTier] = useState("");
  const [estado, setEstado] = useState<"PENDIENTE" | "APROBADO" | "RECHAZADO" | "ERROR">(
    orderId ? "PENDIENTE" : "ERROR"
  );
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    if (!orderId || estado !== "PENDIENTE" || intentos >= 15) return;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pagos/bold/estado?orderId=${encodeURIComponent(orderId)}`);
        const json = await res.json() as { estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO"; numeroCaja?: string; numerosCaja?: string[]; tier?: string };
        if (json.numeroCaja) setNumero(json.numeroCaja);
        if (json.numerosCaja && json.numerosCaja.length > 0) setNumeros(json.numerosCaja);
        if (json.tier) setTier(json.tier);
        if (res.ok && json.estado && json.estado !== "PENDIENTE") {
          setEstado(json.estado);
        } else {
          setIntentos((n) => n + 1);
        }
      } catch {
        setIntentos((n) => n + 1);
      }
    }, 2000);

    return () => clearTimeout(t);
  }, [orderId, estado, intentos]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          {estado === "PENDIENTE" && (
            <>
              <div className="w-20 h-20 border-4 border-[#102463]/20 border-t-[#102463] rounded-full animate-spin mx-auto mb-5" />
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Verificando tu pago…</h2>
              <p className="text-gray-500 text-sm">
                {intentos >= 15
                  ? "Tu pago sigue en revisión. Te notificaremos por correo apenas se confirme."
                  : "Esto toma unos segundos, no cierres esta página."}
              </p>
            </>
          )}
          {estado === "APROBADO" && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pago aprobado!</h2>
              {numeros.length > 0 ? (
                <>
                  <p className="text-gray-500 mb-2 text-sm">Tus {numeros.length} membresías ya están activas. ¡Mucha suerte!</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {numeros.map((n) => (
                      <span key={n} className="bg-[#102463]/5 text-[#102463] font-bold text-sm px-3 py-1 rounded-full">#{n}</span>
                    ))}
                  </div>
                  <p className="text-green-600 text-xs font-semibold mb-4">🎁 Si ya sumas 5 membresías, revisa tu billetera — puede que hayas ganado una gift card.</p>
                </>
              ) : (
                <p className="text-gray-500 mb-6 text-sm">
                  Tu membresía <strong className="text-[#102463]">#{numero}</strong> ya está activa. ¡Mucha suerte!
                </p>
              )}
              <Link href="/dashboard" className="block bg-[#102463] hover:bg-[#173592] text-white font-bold py-3.5 rounded-full text-center transition-all">
                Ir a mi cuenta
              </Link>
            </>
          )}
          {(estado === "RECHAZADO" || estado === "ERROR") && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Pago no aprobado</h2>
              <p className="text-gray-500 mb-6 text-sm">
                {numeros.length > 0
                  ? "No pudimos confirmar el pago de tu paquete de membresías. Puedes volver a intentarlo."
                  : <>No pudimos confirmar tu pago para la membresía <strong>#{numero}</strong>. Puedes intentar de nuevo.</>}
              </p>
              <Link
                href={numeros.length > 0 ? `/membresias/pagar-lote?tier=${tier}&numeros=${numeros.join(",")}` : `/membresias/pagar?tier=${tier}&numero=${numero}`}
                className="block bg-[#102463] hover:bg-[#173592] text-white font-bold py-3.5 rounded-full text-center transition-all"
              >
                Intentar de nuevo
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
