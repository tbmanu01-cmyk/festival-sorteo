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

export default function PaginaPagar() {
  return (
    <Suspense fallback={null}>
      <PaginaPagarInner />
    </Suspense>
  );
}

function PaginaPagarInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const numero = searchParams.get("numero") ?? "";
  const tier = searchParams.get("tier") ?? "";

  const [tipoMembresia, setTipoMembresia] = useState<TipoMembresiaAPI | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?redirect=/membresias/pagar?tier=${tier}&numero=${numero}`);
      return;
    }
    if (!numero || !/^\d{4}$/.test(numero) || !tier) {
      router.push("/membresias");
    }
  }, [status, numero, tier, router]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { tiposMembresia?: TipoMembresiaAPI[] }) => {
        const tipo = c.tiposMembresia?.find((t) => t.slug === tier) ?? null;
        setTipoMembresia(tipo);
      })
      .catch(() => undefined);
  }, [tier]);

  if (status === "loading" || !tipoMembresia) return null;
  if (!numero || !/^\d{4}$/.test(numero) || !tier) return null;

  const monto = tipoMembresia.precio;

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
            <p className="text-blue-200 text-sm mb-1">{tipoMembresia.nombre} seleccionada</p>
            <div className="text-6xl font-extrabold tracking-widest text-[#ffbd1f]">#{numero}</div>
            <p className="text-2xl font-extrabold mt-2">
              ${monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
            </p>
          </div>

          {/* Pago con Bold — única acción */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-extrabold text-gray-900 text-lg mb-1">Pago con tarjeta, PSE o Nequi</h2>
            <p className="text-gray-500 text-sm mb-5">
              Pago procesado por Bold. Tu membresía se activa automáticamente al confirmarse.
            </p>
            <BotonPagoBold numeroCaja={numero} tier={tier} />
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
