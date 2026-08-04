"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import CountdownHero from "@/components/CountdownHero";

type EstadoCaja = "DISPONIBLE" | "RESERVADA" | "VENDIDA";
type Filtro = "todos" | "disponibles" | "ocupados";

interface Caja {
  numero: string;
  estado: EstadoCaja;
  fechaCompra?: string | null;
}

interface RespuestaCajas {
  cajas: Caja[];
  total: number;
  pagina: number;
  totalPaginas: number;
  limite: number;
}

// ── Modal de confirmación ──────────────────────────────────────────────────

interface ModalProps {
  caja: Caja | null;
  precio: number;
  giftCardId: string | null;
  giftCardValor: number;
  esSorpresa: boolean;
  onCerrar: () => void;
  onConfirmar: (numero: string) => Promise<void>;
  cargando: boolean;
  resultado: { ok: boolean; mensaje: string; expira?: string } | null;
}

function ModalReserva({ caja, precio, giftCardId, giftCardValor, esSorpresa, onCerrar, onConfirmar, cargando, resultado }: ModalProps) {
  if (!caja) return null;
  const descuento = giftCardId ? Math.min(giftCardValor, precio) : 0;
  const total = precio - descuento;

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
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Membresía reservada!</h3>
              <div className="text-6xl font-extrabold text-[#102463] mb-3">{caja.numero}</div>
              <p className="text-gray-600 text-sm mb-1">{resultado.mensaje}</p>
              {resultado.expira && (
                <p className="text-orange-600 text-xs font-medium mb-5">
                  Reserva válida hasta las{" "}
                  {new Date(resultado.expira).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onCerrar}
                  className="flex-1 border-2 border-[#102463] text-[#102463] font-bold py-3 rounded-full transition-all hover:bg-[#102463]/5"
                >
                  Volver a tienda
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 text-center bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 rounded-full transition-all"
                >
                  Ir a mi cuenta
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No disponible</h3>
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
            <div className="text-center mb-6">
              {esSorpresa && (
                <div className="bg-[#ffbd1f]/20 rounded-xl px-3 py-1.5 mb-3 inline-flex items-center gap-1.5">
                  <span className="text-lg">🎲</span>
                  <span className="text-[#102463] text-xs font-bold">¡La suerte eligió este número!</span>
                </div>
              )}
              <p className="text-gray-500 text-sm mb-1">{esSorpresa ? "Tu número de la suerte" : "Número seleccionado"}</p>
              <div className="text-7xl font-extrabold text-[#102463] my-3 tracking-widest">
                {caja.numero}
              </div>
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                DISPONIBLE
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Precio por membresía</span>
                <span className={`font-bold ${descuento > 0 ? "line-through text-gray-400" : "text-gray-900"}`}>
                  ${precio.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
                </span>
              </div>
              {descuento > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">🎁 Gift card aplicada</span>
                    <span className="font-bold text-green-600">−${descuento.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
                    <span className="font-bold text-gray-900">Total a pagar</span>
                    <span className="font-extrabold text-[#102463]">
                      {total === 0 ? "¡Gratis!" : `$${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-gray-500">Reserva válida por</span>
                <span className="font-bold text-orange-600">15 minutos</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCerrar}
                className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <a
                href={`/membresias/pagar?numero=${caja.numero}`}
                className="flex-1 bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] font-bold py-3 rounded-full transition-all shadow-md text-center"
              >
                Pagar
              </a>
            </div>

            <p className="text-center text-gray-400 text-xs mt-4">
              Al reservar aceptas los{" "}
              <Link href="/terminos" className="underline">términos y condiciones</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Celda de caja ─────────────────────────────────────────────────────────

function CeldaCaja({
  caja,
  onClick,
  precio,
}: {
  caja: Caja;
  onClick: (caja: Caja) => void;
  precio: number;
}) {
  const disponible = caja.estado === "DISPONIBLE";
  const reservada = caja.estado === "RESERVADA";

  const tooltip = (() => {
    if (!reservada || !caja.fechaCompra) return `Membresía ${caja.numero} — ${caja.estado}`;
    const expira = new Date(caja.fechaCompra).getTime() + 15 * 60 * 1000;
    const restMs = Math.max(0, expira - Date.now());
    const min = Math.floor(restMs / 60000);
    const seg = Math.floor((restMs % 60000) / 1000);
    return restMs === 0
      ? `Membresía ${caja.numero} — Reserva vencida`
      : `Membresía ${caja.numero} — Reservada, expira en ${min}m ${String(seg).padStart(2, "0")}s`;
  })();

  return (
    <button
      onClick={() => disponible && onClick(caja)}
      disabled={!disponible}
      title={tooltip}
      className={`
        aspect-square flex flex-col items-center justify-center gap-1 rounded-[20px] border relative
        transition-all duration-150
        ${disponible
          ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-500 hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95"
          : reservada
          ? "bg-orange-50 border-orange-300 text-orange-700 cursor-not-allowed opacity-80"
          : "bg-red-50 border-red-300 text-red-700 cursor-not-allowed opacity-80"
        }
      `}
    >
      <img src="/membresia.svg" alt="" style={{ width: "80%", maxWidth: 120, display: "block", margin: "0 auto 4px" }} />
      <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: "0.12em", lineHeight: 1 }}>{caja.numero}</span>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, opacity: 0.9 }}>
        {caja.estado === "DISPONIBLE" ? "Disponible" : caja.estado === "RESERVADA" ? "Reservado" : "Vendido"}
      </span>
      {caja.estado === "DISPONIBLE" && (
        <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.7 }}>${precio.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
      )}
      {reservada && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full" />
      )}
    </button>
  );
}

// ── Paginación ────────────────────────────────────────────────────────────

function Paginacion({
  pagina,
  totalPaginas,
  onChange,
}: {
  pagina: number;
  totalPaginas: number;
  onChange: (p: number) => void;
}) {
  const paginas: number[] = [];
  const inicio = Math.max(1, pagina - 2);
  const fin = Math.min(totalPaginas, pagina + 2);
  for (let i = inicio; i <= fin; i++) paginas.push(i);

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <button
        onClick={() => onChange(1)}
        disabled={pagina === 1}
        className="px-2 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        «
      </button>
      <button
        onClick={() => onChange(pagina - 1)}
        disabled={pagina === 1}
        className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        ‹
      </button>
      {inicio > 1 && <span className="px-1 text-gray-400">…</span>}
      {paginas.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
            p === pagina
              ? "bg-[#102463] text-white shadow-sm"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          {p}
        </button>
      ))}
      {fin < totalPaginas && <span className="px-1 text-gray-400">…</span>}
      <button
        onClick={() => onChange(pagina + 1)}
        disabled={pagina === totalPaginas}
        className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        ›
      </button>
      <button
        onClick={() => onChange(totalPaginas)}
        disabled={pagina === totalPaginas}
        className="px-2 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        »
      </button>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function Membresias() {
  return (
    <Suspense fallback={null}>
      <MembresiasInner />
    </Suspense>
  );
}

function MembresiasInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fechaSorteo, setFechaSorteo] = useState<string | null>(null);
  const [fechaSorteoISO, setFechaSorteoISO] = useState<string | null>(null);
  const [precioCaja, setPrecioCaja] = useState(10_000);
  const [vendidasTotal, setVendidasTotal] = useState(0);
  const [giftCardId, setGiftCardId] = useState<string | null>(null);
  const [giftCardValor, setGiftCardValor] = useState(0);
  const [datos, setDatos] = useState<RespuestaCajas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [buscar, setBuscar] = useState("");
  const [buscarInput, setBuscarInput] = useState("");

  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null);
  const [reservandoCaja, setReservandoCaja] = useState(false);
  const [resultadoReserva, setResultadoReserva] = useState<{
    ok: boolean;
    mensaje: string;
    expira?: string;
  } | null>(null);
  const [buscandoAleatoria, setBuscandoAleatoria] = useState(false);
  const [esSorpresa, setEsSorpresa] = useState(false);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { fechaSorteo?: string | null; precioCaja?: number; vendidasTotal?: number }) => {
        if (c.fechaSorteo) {
          setFechaSorteoISO(c.fechaSorteo);
          setFechaSorteo(new Date(c.fechaSorteo).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }));
        }
        if (c.precioCaja) setPrecioCaja(c.precioCaja);
        if (c.vendidasTotal !== undefined) setVendidasTotal(c.vendidasTotal);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const gcId = searchParams.get("giftCard");
    if (!gcId || !session) return;
    fetch("/api/gift-cards")
      .then((r) => r.json())
      .then((data: { giftCards: { id: string; valor: number; estado: string }[] }) => {
        const gc = data.giftCards.find((g) => g.id === gcId && g.estado === "DISPONIBLE");
        if (gc) { setGiftCardId(gc.id); setGiftCardValor(gc.valor); }
      })
      .catch(() => undefined);
  }, [searchParams, session]);

  const fetchCajas = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      try {
        const params = new URLSearchParams({
          pagina: String(pagina),
          limite: "100",
          filtro,
          ...(buscar ? { buscar } : {}),
        });
        const res = await fetch(`/api/cajas?${params}`);
        if (res.ok) setDatos(await res.json());
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [pagina, filtro, buscar]
  );

  useEffect(() => {
    fetchCajas();
  }, [fetchCajas]);

  useEffect(() => {
    intervaloRef.current = setInterval(() => fetchCajas(true), 5000);
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [fetchCajas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscar(buscarInput);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [buscarInput]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setBuscar(buscarInput);
    setPagina(1);
  };

  const handleFiltro = (f: Filtro) => {
    setFiltro(f);
    setPagina(1);
  };

  const elegirAleatoria = async () => {
    if (!session) { router.push("/login?redirect=/membresias"); return; }
    setBuscandoAleatoria(true);
    try {
      const res = await fetch("/api/cajas/aleatoria");
      const json = await res.json();
      if (!res.ok || !json.caja) return;
      setEsSorpresa(true);
      setCajaSeleccionada({ numero: json.caja.numero, estado: "DISPONIBLE" });
      setResultadoReserva(null);
    } finally {
      setBuscandoAleatoria(false);
    }
  };

  const abrirModal = (caja: Caja) => {
    if (!session) {
      router.push("/login?redirect=/membresias");
      return;
    }
    setEsSorpresa(false);
    setCajaSeleccionada(caja);
    setResultadoReserva(null);
  };

  const cerrarModal = () => {
    if (resultadoReserva?.ok) fetchCajas(true);
    setCajaSeleccionada(null);
    setResultadoReserva(null);
    setEsSorpresa(false);
  };

  const confirmarReserva = async (numero: string) => {
    setReservandoCaja(true);
    try {
      const res = await fetch(`/api/cajas/${numero}/reservar`, { method: "POST" });
      const json = await res.json();
      setResultadoReserva({
        ok: res.ok,
        mensaje: json.mensaje,
        expira: json.expira,
      });
    } catch {
      setResultadoReserva({ ok: false, mensaje: "Error de conexión. Intenta nuevamente." });
    } finally {
      setReservandoCaja(false);
    }
  };

  const disponibles = datos?.cajas.filter((c) => c.estado === "DISPONIBLE").length ?? 0;
  const ocupadas = (datos?.cajas.length ?? 0) - disponibles;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <section
          className="text-white"
          style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", padding: "56px 0 48px" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffbd1f", background: "rgba(255,189,31,0.12)", border: "1px solid rgba(255,189,31,0.30)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
              Club de membresías 10K
            </span>
            <h1 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              Tu número,{" "}
              <span style={{ color: "#ffbd1f" }}>tu oportunidad</span>
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "0 0 24px", maxWidth: 480, lineHeight: 1.65 }}>
              10,000 membresías numeradas. Coincide con la Lotería de Bogotá en 4, 3, 2 o 1 cifra y gana parte del recaudo.
            </p>

            {/* Pills de stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: fechaSorteoISO ? 24 : 0 }}>
              <div style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "8px 18px", backdropFilter: "blur(8px)" }}>
                <span style={{ fontWeight: 800, color: "#ffbd1f" }}>{(10000 - vendidasTotal).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>{" "}
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>disponibles</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "8px 18px", backdropFilter: "blur(8px)" }}>
                <span style={{ fontWeight: 800, color: "#ffbd1f" }}>{((vendidasTotal / 10000) * 100).toFixed(1)}%</span>{" "}
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>vendido</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "8px 18px", backdropFilter: "blur(8px)" }}>
                <span style={{ fontWeight: 800, color: "white" }}>${precioCaja.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>{" "}
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>por membresía</span>
              </div>
            </div>

            {/* Countdown */}
            {fechaSorteoISO && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.60)", marginBottom: 10 }}>
                  Próximo resultado principal
                </p>
                <CountdownHero fecha={fechaSorteoISO} />
              </div>
            )}
          </div>
        </section>

        {giftCardId && (
          <div className="bg-green-600 text-white px-4 py-3 text-sm font-semibold text-center flex items-center justify-center gap-2">
            🎁 Gift card activa — ${giftCardValor.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP de descuento en tu próxima membresía
            <button onClick={() => { setGiftCardId(null); setGiftCardValor(0); }} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-gradient-to-r from-[#ffbd1f] to-yellow-300 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-[#102463] text-base">¿No sabes cuál elegir?</p>
              <p className="text-[#102463]/70 text-sm">Deja que la suerte decida por ti — te asignamos un número disponible al azar.</p>
            </div>
            <button
              onClick={elegirAleatoria}
              disabled={buscandoAleatoria}
              className="shrink-0 bg-[#102463] hover:bg-[#173592] disabled:opacity-60 text-white font-bold px-6 py-3 rounded-full text-sm transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              <span className={buscandoAleatoria ? "animate-spin inline-block" : "inline-block"}>🎲</span>
              {buscandoAleatoria ? "Eligiendo..." : "¡Quiero una sorpresa!"}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleBuscar} className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={buscarInput}
                  onChange={(e) => setBuscarInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Buscar número (ej: 1234)"
                  maxLength={4}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#102463] transition"
                />
                <button
                  type="submit"
                  className="bg-[#102463] hover:bg-[#173592] text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-all"
                >
                  Buscar
                </button>
                {buscar && (
                  <button
                    type="button"
                    onClick={() => { setBuscar(""); setBuscarInput(""); setPagina(1); }}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </form>

              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {(["todos", "disponibles", "ocupados"] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFiltro(f)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                      filtro === f
                        ? "bg-[#102463] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "todos" ? "Todos" : f === "disponibles" ? "Disponibles" : "Ocupados"}
                  </button>
                ))}
                <button
                  onClick={elegirAleatoria}
                  disabled={buscandoAleatoria}
                  title="Elegir número al azar"
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] disabled:opacity-60 transition-all flex items-center gap-1.5"
                >
                  <span className={buscandoAleatoria ? "animate-spin inline-block" : "inline-block"}>🎲</span>
                  Sorpresa
                </button>
              </div>
            </div>

            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-green-50 border border-green-300 inline-block" />
                Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-orange-50 border border-orange-300 inline-block" />
                Reservado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-red-50 border border-red-300 inline-block" />
                Vendido
              </span>
            </div>
          </div>

          {cargando ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl shimmer" />
              ))}
            </div>
          ) : datos && datos.cajas.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {datos.cajas.map((caja) => (
                  <CeldaCaja key={caja.numero} caja={caja} onClick={abrirModal} precio={precioCaja} />
                ))}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4 px-1">
                <span>
                  Mostrando {(pagina - 1) * 100 + 1}–
                  {Math.min(pagina * 100, datos.total)} de{" "}
                  <strong>{datos.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> membresías
                </span>
                <span className="flex gap-3">
                  <span className="text-green-600 font-medium">{disponibles} libres</span>
                  <span className="text-red-500 font-medium">{ocupadas} ocupadas</span>
                </span>
              </div>

              {datos.totalPaginas > 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <Paginacion
                    pagina={pagina}
                    totalPaginas={datos.totalPaginas}
                    onChange={(p) => { setPagina(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  />
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Página {pagina} de {datos.totalPaginas}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-semibold text-lg">No se encontraron membresías</p>
              <p className="text-sm mt-1">
                {buscar ? `No hay membresías con el número "${buscar}"` : "Intenta cambiar los filtros"}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <ModalReserva
        caja={cajaSeleccionada}
        precio={precioCaja}
        giftCardId={giftCardId}
        giftCardValor={giftCardValor}
        esSorpresa={esSorpresa}
        onCerrar={cerrarModal}
        onConfirmar={confirmarReserva}
        cargando={reservandoCaja}
        resultado={resultadoReserva}
      />
    </div>
  );
}
