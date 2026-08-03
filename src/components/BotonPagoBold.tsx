"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  numeroCaja: string;
}

export default function BotonPagoBold({ numeroCaja }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function montarBoton() {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch("/api/pagos/bold/firma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numeroCaja }),
        });
        const json = await res.json() as {
          mensaje?: string;
          apiKey?: string;
          orderId?: string;
          amount?: number;
          currency?: string;
          signature?: string;
        };
        if (cancelado) return;
        if (!res.ok || !json.apiKey) {
          setError(json.mensaje ?? "No se pudo iniciar el pago.");
          setCargando(false);
          return;
        }

        const redirectionUrl = `${window.location.origin}/membresias/pagar/resultado?numero=${numeroCaja}&orderId=${json.orderId}`;

        if (contenedorRef.current) {
          contenedorRef.current.innerHTML = "";
          const script = document.createElement("script");
          script.src = "https://checkout.bold.co/library/boldPaymentButton.js";
          script.setAttribute("data-bold-button", "dark-L");
          script.setAttribute("data-order-id", json.orderId!);
          script.setAttribute("data-currency", json.currency!);
          script.setAttribute("data-amount", String(json.amount));
          script.setAttribute("data-api-key", json.apiKey);
          script.setAttribute("data-integrity-signature", json.signature!);
          script.setAttribute("data-redirection-url", redirectionUrl);
          script.setAttribute("data-description", `Membresía #${numeroCaja} — Club 10K`);
          contenedorRef.current.appendChild(script);
        }
        setCargando(false);
      } catch {
        if (!cancelado) {
          setError("Error de conexión. Intenta de nuevo.");
          setCargando(false);
        }
      }
    }

    montarBoton();
    return () => {
      cancelado = true;
    };
  }, [numeroCaja]);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {cargando && <p className="text-sm text-gray-400">Cargando botón de pago…</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm w-full text-center">
          {error}
        </div>
      )}
      <div ref={contenedorRef} />
    </div>
  );
}
