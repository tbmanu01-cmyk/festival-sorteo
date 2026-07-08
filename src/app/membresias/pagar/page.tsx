"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import SubirImagen from "@/components/SubirImagen";

interface DatosPago {
  qrPagoUrl: string;
  brebKey: string;
  datosBancarios: string;
  precioCaja: number;
}

export default function PaginaPagar() {
  return (
    <Suspense fallback={null}>
      <PaginaPagarInner />
    </Suspense>
  );
}

function PaginaPagarInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const numero = searchParams.get("numero") ?? "";

  const [datos, setDatos] = useState<DatosPago | null>(null);
  const [nombrePagador, setNombrePagador] = useState("");
  const [refBancaria, setRefBancaria] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string; referencia?: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?redirect=/membresias/pagar?numero=${numero}`);
      return;
    }
    if (!numero || !/^\d{4}$/.test(numero)) {
      router.push("/membresias");
    }
  }, [status, numero, router]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: DatosPago) => setDatos(c))
      .catch(() => undefined);
  }, []);

  async function enviarComprobante(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch("/api/pagos-manuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroCaja: numero, nombrePagador, refBancaria, comprobanteUrl, notas }),
      });
      const json = await res.json() as { mensaje: string; referencia?: string };
      setResultado({ ok: res.ok, mensaje: json.mensaje, referencia: json.referencia });
    } catch {
      setResultado({ ok: false, mensaje: "Error de conexión. Intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  if (status === "loading" || !datos) return null;
  if (!numero || !/^\d{4}$/.test(numero)) return null;

  const monto = datos.precioCaja;

  if (resultado?.ok) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">¡Comprobante enviado!</h2>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Recibimos tu comprobante para la membresía <strong className="text-[#102463]">#{numero}</strong>.
              Revisaremos tu pago y te notificaremos por correo.
            </p>
            {resultado.referencia && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-xs text-gray-500">
                Ref. de seguimiento: <span className="font-mono font-bold text-gray-700">{resultado.referencia}</span>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Link href="/dashboard" className="block bg-[#102463] hover:bg-[#173592] text-white font-bold py-3.5 rounded-full text-center transition-all">
                Ir a mi cuenta
              </Link>
              <Link href="/membresias" className="block border-2 border-[#102463] text-[#102463] font-bold py-3.5 rounded-full text-center transition-all hover:bg-[#102463]/5">
                Ver más membresías
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4">

          {/* Encabezado */}
          <div className="bg-gradient-to-r from-[#102463] to-[#173592] rounded-2xl p-6 text-white mb-6">
            <Link href="/membresias" className="text-blue-300 text-sm font-medium flex items-center gap-1 mb-3 hover:text-white transition-colors">
              ← Volver a membresías
            </Link>
            <p className="text-blue-200 text-sm mb-1">Membresía seleccionada</p>
            <div className="text-6xl font-extrabold tracking-widest text-[#ffbd1f]">#{numero}</div>
            <p className="text-2xl font-extrabold mt-2">
              ${monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
            </p>
          </div>

          {/* Instrucciones de pago */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
            <h2 className="font-extrabold text-gray-900 text-lg mb-4">Cómo pagar</h2>

            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 bg-[#102463] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-gray-700 text-sm pt-0.5">Abre tu app bancaria o de pagos (Nequi, Daviplata, Bancolombia, etc.)</p>
            </div>
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 bg-[#102463] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-gray-700 text-sm pt-0.5">Escanea el código QR o usa la llave/número de la cuenta que aparece abajo</p>
            </div>
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 bg-[#102463] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-gray-700 text-sm pt-0.5">Transfiere exactamente <strong>${monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#102463] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p className="text-gray-700 text-sm pt-0.5">Llena el formulario de abajo con los datos de tu transferencia y envíalo</p>
            </div>

            {/* QR y datos bancarios */}
            <div className="mt-6 space-y-4">
              {datos.qrPagoUrl && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-semibold text-gray-600">Escanea el QR</p>
                  <div className="border-4 border-[#102463]/20 rounded-2xl p-2 bg-white inline-block">
                    <Image
                      src={datos.qrPagoUrl}
                      alt="Código QR de pago"
                      width={200}
                      height={200}
                      className="rounded-xl"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {datos.brebKey && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Llave / número Bre-b</p>
                  <p className="font-extrabold text-[#102463] text-xl tracking-widest">{datos.brebKey}</p>
                </div>
              )}

              {datos.datosBancarios && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Datos bancarios</p>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{datos.datosBancarios}</p>
                </div>
              )}

              {!datos.qrPagoUrl && !datos.brebKey && !datos.datosBancarios && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                  Los datos de pago serán configurados pronto. Contacta al administrador.
                </div>
              )}
            </div>
          </div>

          {/* Formulario comprobante */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-extrabold text-gray-900 text-lg mb-1">Ya pagué — enviar comprobante</h2>
            <p className="text-gray-500 text-sm mb-5">Completa estos datos para que podamos verificar tu pago.</p>

            {resultado && !resultado.ok && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-4 flex items-center justify-between">
                <span>{resultado.mensaje}</span>
                <button onClick={() => setResultado(null)} className="ml-3 text-lg leading-none opacity-60 hover:opacity-100">×</button>
              </div>
            )}

            <form onSubmit={enviarComprobante} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nombre del titular de la cuenta que pagó <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombrePagador}
                  onChange={(e) => setNombrePagador(e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]/30 focus:border-[#102463] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Número de confirmación / referencia del banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={refBancaria}
                  onChange={(e) => setRefBancaria(e.target.value)}
                  placeholder="Ej: 20240619123456789"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]/30 focus:border-[#102463] transition"
                />
                <p className="text-xs text-gray-400 mt-1">El número de transacción que te mostró tu app bancaria.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Captura de pantalla del comprobante <span className="text-gray-400 font-normal">(opcional pero recomendado)</span>
                </label>
                <SubirImagen
                  tipo="comprobante"
                  onSubida={(url) => setComprobanteUrl(url)}
                  placeholder="Haz clic para subir tu captura de pantalla"
                  disabled={enviando}
                />
                {comprobanteUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    ✓ Imagen subida correctamente
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Cualquier información adicional para el equipo..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463]/30 focus:border-[#102463] transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-[#ffbd1f] hover:bg-yellow-300 disabled:bg-gray-200 disabled:text-gray-400 text-[#102463] font-extrabold py-4 rounded-full transition-all shadow-md text-base"
              >
                {enviando ? "Enviando..." : "Enviar comprobante de pago"}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs pb-4">
            ¿Tienes algún problema? Escríbenos directamente.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
