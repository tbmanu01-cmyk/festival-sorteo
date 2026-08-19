"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import BotonPagoBold from "@/components/BotonPagoBold";

interface TipoMembresiaAPI {
  slug: string;
  nombre: string;
  precio: number;
}

export default function PaginaPagarLote() {
  return (
    <Suspense fallback={null}>
      <PaginaPagarLoteInner />
    </Suspense>
  );
}

function PaginaPagarLoteInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") ?? "";
  const numeros = (searchParams.get("numeros") ?? "").split(",").filter((n) => /^\d{4}$/.test(n));

  const [tipoMembresia, setTipoMembresia] = useState<TipoMembresiaAPI | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState<boolean | null>(null);
  const [confirmandoSaldo, setConfirmandoSaldo] = useState(false);
  const [pagandoSaldo, setPagandoSaldo] = useState(false);
  const [resultadoSaldo, setResultadoSaldo] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [reservando, setReservando] = useState(true);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?redirect=/membresias`);
      return;
    }
    if (numeros.length !== 5 || !tier) {
      router.push("/membresias");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tier, router]);

  // Reserva (o renueva) las 5 membresías al llegar aquí — cubre navegación
  // directa/actualización de página sin pasar por "Continuar al pago".
  useEffect(() => {
    if (status !== "authenticated" || numeros.length !== 5 || !tier) return;
    let cancelado = false;
    setReservando(true);
    Promise.all(
      numeros.map((numero) =>
        fetch(`/api/cajas/${tier}/${numero}/reservar`, { method: "POST" })
          .then(async (res) => ({ numero, ok: res.ok, json: await res.json() }))
          .catch(() => ({ numero, ok: false, json: { mensaje: "Error de conexión." } }))
      )
    ).then((resultados) => {
      if (cancelado) return;
      const fallidos = resultados.filter((r) => !r.ok);
      if (fallidos.length > 0) {
        setErrorReserva(`Las membresías ${fallidos.map((f) => "#" + f.numero).join(", ")} ya no están disponibles. Vuelve a armar tu paquete.`);
      }
    }).finally(() => { if (!cancelado) setReservando(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tier, numeros.join(",")]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { tiposMembresia?: TipoMembresiaAPI[] }) => {
        const tipo = c.tiposMembresia?.find((t) => t.slug === tier) ?? null;
        setTipoMembresia(tipo);
      })
      .catch(() => undefined);
  }, [tier]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/mis-cajas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { saldoPuntos?: number; confirmado?: boolean } | null) => {
        if (d && typeof d.saldoPuntos === "number") setSaldo(d.saldoPuntos);
        if (d && typeof d.confirmado === "boolean") setConfirmado(d.confirmado);
      })
      .catch(() => undefined);
  }, [status]);

  if (status === "loading" || !tipoMembresia) return null;
  if (numeros.length !== 5 || !tier) return null;

  const monto = tipoMembresia.precio * 5;
  const alcanzaConSaldo = saldo !== null && saldo >= monto;

  async function pagarConSaldo() {
    setPagandoSaldo(true);
    setResultadoSaldo(null);
    try {
      const res = await fetch("/api/cajas/comprar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, numeros }),
      });
      const json = await res.json() as { mensaje: string };
      setResultadoSaldo({ ok: res.ok, mensaje: json.mensaje });
    } catch {
      setResultadoSaldo({ ok: false, mensaje: "Error de conexión. Intenta nuevamente." });
    } finally {
      setPagandoSaldo(false);
      setConfirmandoSaldo(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4">

          {/* Encabezado */}
          <div className="bg-gradient-to-r from-[#102463] to-[#173592] rounded-2xl p-6 text-white mb-6">
            <Link
              href="/membresias"
              className="inline-flex items-center gap-1.5 bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] text-xs font-bold px-3 py-1.5 rounded-full mb-3 transition-colors shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Volver a membresías
            </Link>
            <p className="text-blue-200 text-sm mb-1">🎁 Paquete de 5 {tipoMembresia.nombre} — recibe una gift card de regalo</p>
            <div className="flex flex-wrap gap-2 my-3">
              {numeros.map((n) => (
                <span key={n} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-lg font-extrabold text-[#ffbd1f]">#{n}</span>
              ))}
            </div>
            <p className="text-2xl font-extrabold mt-2">
              ${monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
            </p>
          </div>

          {reservando ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#102463] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Reservando tus 5 membresías...</p>
            </div>
          ) : errorReserva ? (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 mb-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">No disponible</h3>
              <p className="text-gray-600 text-sm mb-5">{errorReserva}</p>
              <Link
                href="/membresias"
                className="inline-block bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 px-6 rounded-full transition-all"
              >
                Volver a armar el paquete
              </Link>
            </div>
          ) : confirmado === false ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
              <p className="text-amber-800 font-semibold text-sm mb-3">
                ⚠ Debes verificar tu correo electrónico antes de pagar membresías.
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-full transition-colors text-sm"
              >
                Verificar mi correo
              </Link>
            </div>
          ) : resultadoSaldo?.ok ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Paquete comprado!</h3>
              <p className="text-gray-600 text-sm mb-2">{resultadoSaldo.mensaje}</p>
              <p className="text-green-600 text-xs font-semibold mb-5">🎁 Si ya sumas 5 membresías, revisa tu billetera — puede que hayas ganado una gift card.</p>
              <Link
                href="/dashboard"
                className="inline-block bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 px-6 rounded-full transition-all"
              >
                Ir a mi cuenta
              </Link>
            </div>
          ) : (
            <>
              {/* Pagar con saldo disponible — solo si alcanza */}
              {alcanzaConSaldo && (
                <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 mb-4">
                  <h2 className="font-extrabold text-gray-900 text-lg mb-1">Pagar con tu saldo</h2>
                  <p className="text-gray-500 text-sm mb-1">
                    Saldo disponible: <span className="font-bold text-green-600">${saldo!.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</span>
                  </p>
                  <p className="text-gray-500 text-sm mb-5">Se descuenta al instante, sin pasarela externa.</p>
                  {resultadoSaldo && !resultadoSaldo.ok && (
                    <p className="text-red-600 text-xs font-semibold mb-3">⚠ {resultadoSaldo.mensaje}</p>
                  )}
                  {confirmandoSaldo ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmandoSaldo(false)}
                        disabled={pagandoSaldo}
                        className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={pagarConSaldo}
                        disabled={pagandoSaldo}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm"
                      >
                        {pagandoSaldo ? "Procesando..." : "Sí, pagar con saldo"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoSaldo(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-full transition-all shadow-md text-sm"
                    >
                      Pagar ${monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP con saldo
                    </button>
                  )}
                </div>
              )}

              {/* Pago con Bold */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="font-extrabold text-gray-900 text-lg mb-1">
                  {alcanzaConSaldo ? "O paga con tarjeta, PSE o Nequi" : "Pago con tarjeta, PSE o Nequi"}
                </h2>
                <p className="text-gray-500 text-sm mb-5">
                  Pago procesado por Bold. Tus 5 membresías se activan automáticamente al confirmarse.
                </p>
                <BotonPagoBold numeros={numeros} tier={tier} />
              </div>
            </>
          )}

          <p className="text-center text-gray-400 text-xs pb-4">
            ¿Tienes algún problema? Escríbenos directamente.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
