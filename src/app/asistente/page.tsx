"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AsistenteDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const rol = (session.user as { rol?: string }).rol;
      if (rol !== "ASISTENTE" && rol !== "ADMIN") router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") return null;

  const nombre = (session?.user as { nombre?: string })?.nombre
    ?? session?.user?.name
    ?? "Asistente";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#102463]">Panel del Asistente</h1>
            <p className="text-gray-500 text-sm mt-1">Bienvenido, {nombre}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/asistente/retiros"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-[#102463] hover:shadow-md transition-all group"
            >
              <div className="text-4xl mb-3">💸</div>
              <h2 className="text-lg font-extrabold text-[#102463] group-hover:text-[#173592]">
                Pre-aprobación de Retiros
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Revisa solicitudes pendientes, aplica retenciones e impuestos, y envíalas al administrador para aprobación final.
              </p>
              <span className="inline-block mt-4 text-xs font-bold text-[#102463] bg-blue-50 px-3 py-1 rounded-full">
                Ir al módulo →
              </span>
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
