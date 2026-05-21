"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Bono {
  id: string;
  nombre: string;
  cadena: string;
  valorFace: number;
  precio: number;
  stock: number;
  descripcion: string | null;
  imagen: string | null;
}

// ── Iconos por cadena ─────────────────────────────────────────────────────────
const CADENA_EMOJI: Record<string, string> = {
  Éxito: "🛒",
  Jumbo: "🦁",
  Carulla: "🥩",
  D1: "🏪",
  Alkosto: "📺",
};

// ── Modal de confirmación de compra ───────────────────────────────────────────
interface ModalProps {
  bono: Bono;
  onCerrar: () => void;
  onConfirmar: () => Promise<void>;
  cargando: boolean;
  resultado: { ok: boolean; mensaje: string; codigo?: string; cashback?: number } | null;
}

function ModalCompra({ bono, onCerrar, onConfirmar, cargando, resultado }: ModalProps) {
  const cashbackEstimado = Math.round(bono.precio * 0.07);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {resultado ? (
          resultado.ok ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">¡Bono adquirido!</h3>
              <p className="text-gray-500 text-sm mb-4">{bono.nombre}</p>
              <div className="bg-[#102463]/5 rounded-xl p-4 mb-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Código de redención</span>
                  <span className="font-mono font-bold text-[#102463] text-xs">{resultado.codigo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cashback recibido</span>
                  <span className="font-bold text-green-600">+${resultado.cashback?.toLocaleString("es-CO")} COP</span>
                </div>
              </div>
              <button
                onClick={onCerrar}
                className="w-full bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 rounded-full transition-all"
              >
                Listo
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No se pudo completar</h3>
              <p className="text-gray-600 text-sm mb-5">{resultado.mensaje}</p>
              <button
                onClick={onCerrar}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          )
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-[#102463]/5 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                {bono.imagen
                  ? <img src={bono.imagen} alt={bono.cadena} className="w-full h-full object-contain p-2" />
                  : <span className="text-4xl">{CADENA_EMOJI[bono.cadena] ?? "🏷️"}</span>
                }
              </div>
              <h3 className="text-lg font-extrabold text-[#102463] mb-1">{bono.nombre}</h3>
              <p className="text-gray-500 text-sm">{bono.cadena}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor del bono</span>
                <span className="font-bold text-gray-900">${bono.valorFace.toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Precio</span>
                <span className="font-bold text-[#102463]">${bono.precio.toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-green-600 font-medium">Cashback para ti (7%)</span>
                <span className="font-bold text-green-600">+${cashbackEstimado.toLocaleString("es-CO")} COP</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCerrar}
                className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmar}
                disabled={cargando}
                className="flex-1 bg-[#ffbd1f] hover:bg-yellow-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-[#102463] font-bold py-3 rounded-full transition-all shadow-md"
              >
                {cargando ? "Procesando..." : "Comprar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de bono ────────────────────────────────────────────────────────────
function TarjetaBono({ bono, onComprar }: { bono: Bono; onComprar: (b: Bono) => void }) {
  const cashback = bono.precio * 0.07;
  const sinStock = bono.stock === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Cabecera cadena */}
      <div
        className="px-5 pt-5 pb-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #102463 0%, #173592 100%)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
          {bono.imagen
            ? <img src={bono.imagen} alt={bono.cadena} className="w-full h-full object-contain p-1" />
            : <span className="text-2xl">{CADENA_EMOJI[bono.cadena] ?? "🏷️"}</span>
          }
        </div>
        <div>
          <p className="text-white font-extrabold text-lg leading-tight">{bono.cadena}</p>
          <p className="text-blue-200 text-xs">{bono.stock.toLocaleString("es-CO")} disponibles</p>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-base mb-1">{bono.nombre}</h3>
        {bono.descripcion && (
          <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{bono.descripcion}</p>
        )}

        {/* Precio y cashback */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Valor</span>
            <span className="font-extrabold text-[#102463] text-lg">
              ${bono.valorFace.toLocaleString("es-CO")} COP
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-green-600 text-sm font-medium">Cashback 7%</span>
            <span className="font-bold text-green-600 text-sm">
              +${cashback.toLocaleString("es-CO")} COP
            </span>
          </div>
        </div>

        <button
          onClick={() => onComprar(bono)}
          disabled={sinStock}
          className="w-full bg-[#ffbd1f] hover:bg-yellow-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-[#102463] font-bold py-3 rounded-full text-sm transition-all shadow-sm"
        >
          {sinStock ? "Sin stock" : "Adquirir bono"}
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function TiendaBonos() {
  const { data: session } = useSession();
  const router = useRouter();

  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [cadenaFiltro, setCadenaFiltro] = useState<string>("todas");

  const [bonoSeleccionado, setBonoSeleccionado] = useState<Bono | null>(null);
  const [comprando, setComprando] = useState(false);
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    codigo?: string;
    cashback?: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/bonos")
      .then((r) => r.json())
      .then((d: { bonos: Bono[] }) => setBonos(d.bonos))
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/usuario/perfil")
      .then((r) => r.json())
      .then((d: { user?: { saldoPuntos?: number } }) => {
        if (d.user?.saldoPuntos !== undefined) setSaldo(d.user.saldoPuntos);
      })
      .catch(() => undefined);
  }, [session]);

  const cadenas = ["todas", ...Array.from(new Set(bonos.map((b) => b.cadena)))];
  const logosPorCadena = Object.fromEntries(
    bonos.filter((b) => b.imagen).map((b) => [b.cadena, b.imagen as string])
  );
  const bonosFiltrados =
    cadenaFiltro === "todas" ? bonos : bonos.filter((b) => b.cadena === cadenaFiltro);

  const abrirModal = (bono: Bono) => {
    if (!session) {
      router.push("/login?redirect=/tienda");
      return;
    }
    setBonoSeleccionado(bono);
    setResultado(null);
  };

  const cerrarModal = () => {
    if (resultado?.ok) {
      // Refrescar saldo tras compra exitosa
      fetch("/api/usuario/perfil")
        .then((r) => r.json())
        .then((d: { user?: { saldoPuntos?: number } }) => {
          if (d.user?.saldoPuntos !== undefined) setSaldo(d.user.saldoPuntos);
        })
        .catch(() => undefined);
    }
    setBonoSeleccionado(null);
    setResultado(null);
  };

  const confirmarCompra = async () => {
    if (!bonoSeleccionado) return;
    setComprando(true);
    try {
      const res = await fetch(`/api/bonos/${bonoSeleccionado.id}/comprar`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setResultado({ ok: true, mensaje: json.mensaje, codigo: json.codigo, cashback: json.cashbackRecibido });
        // Actualizar stock localmente
        setBonos((prev) =>
          prev.map((b) => (b.id === bonoSeleccionado.id ? { ...b, stock: b.stock - 1 } : b))
        );
      } else {
        setResultado({ ok: false, mensaje: json.error ?? "Error al procesar la compra." });
      }
    } catch {
      setResultado({ ok: false, mensaje: "Error de conexión. Intenta nuevamente." });
    } finally {
      setComprando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Encabezado */}
        <div
          style={{ background: "linear-gradient(135deg, #102463 0%, #173592 100%)" }}
          className="text-white py-8 px-4"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#ffbd1f] text-[#102463] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Nuevo
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Tienda de Bonos</h1>
            <p className="text-blue-200 text-sm">
              Compra bonos en tus cadenas favoritas y recibe cashback directo en tu billetera.
            </p>
            {session && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                <span className="text-blue-200 text-sm">Tu saldo:</span>
                <span className="text-white font-extrabold">${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Filtros por cadena */}
          {!cargando && bonos.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {cadenas.map((c) => (
                <button
                  key={c}
                  onClick={() => setCadenaFiltro(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all capitalize ${
                    cadenaFiltro === c
                      ? "bg-[#102463] text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {c === "todas" ? "Todas las cadenas" : (
                    <span className="flex items-center gap-1.5">
                      {logosPorCadena[c]
                        ? <img src={logosPorCadena[c]} alt={c} className="w-4 h-4 object-contain rounded-sm" />
                        : <span>{CADENA_EMOJI[c] ?? ""}</span>
                      }
                      {c}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Grid de bonos */}
          {cargando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl shimmer" />
              ))}
            </div>
          ) : bonosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bonosFiltrados.map((bono) => (
                <TarjetaBono key={bono.id} bono={bono} onComprar={abrirModal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p className="text-5xl mb-4">🏪</p>
              <p className="font-semibold text-lg">No hay bonos disponibles</p>
              <p className="text-sm mt-1">Vuelve pronto, estamos cargando más bonos.</p>
            </div>
          )}

          {/* Link a membresías */}
          {!cargando && (
            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm mb-3">¿Buscas membresías para el sorteo?</p>
              <Link
                href="/membresias"
                className="inline-block border-2 border-[#102463] text-[#102463] hover:bg-[#102463] hover:text-white font-bold px-8 py-3 rounded-full text-sm transition-all"
              >
                Ver membresías →
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {bonoSeleccionado && (
        <ModalCompra
          bono={bonoSeleccionado}
          onCerrar={cerrarModal}
          onConfirmar={confirmarCompra}
          cargando={comprando}
          resultado={resultado}
        />
      )}
    </div>
  );
}
