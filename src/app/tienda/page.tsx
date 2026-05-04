"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

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
  onCerrar: () => void;
  onConfirmar: (numero: string) => Promise<void>;
  cargando: boolean;
  resultado: { ok: boolean; mensaje: string; expira?: string } | null;
}

function ModalReserva({ caja, onCerrar, onConfirmar, cargando, resultado }: ModalProps) {
  if (!caja) return null;

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
              <Link
                href="/dashboard"
                className="block w-full bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 rounded-full transition-all"
              >
                Ir a mi cuenta
              </Link>
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
              <p className="text-gray-500 text-sm mb-1">Número seleccionado</p>
              <div className="text-7xl font-extrabold text-[#102463] my-3 tracking-widest">
                {caja.numero}
              </div>
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                DISPONIBLE
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Precio por membresía</span>
                <span className="font-bold text-gray-900">$10.000 COP</span>
              </div>
              <div className="flex justify-between text-sm">
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
              <button
                onClick={() => onConfirmar(caja.numero)}
                disabled={cargando}
                className="flex-1 bg-[#ffbd1f] hover:bg-yellow-300 disabled:bg-gray-300 text-[#102463] font-bold py-3 rounded-full transition-all shadow-md"
              >
                {cargando ? "Reservando..." : "Reservar"}
              </button>
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
}: {
  caja: Caja;
  onClick: (caja: Caja) => void;
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
        aspect-square flex flex-col items-center rounded-xl font-bold py-1.5
        transition-all duration-150 border relative
        ${disponible
          ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-500 hover:scale-110 hover:shadow-md cursor-pointer active:scale-95"
          : reservada
          ? "bg-orange-50 border-orange-300 text-orange-700 cursor-not-allowed opacity-80"
          : "bg-red-50 border-red-300 text-red-700 cursor-not-allowed opacity-80"
        }
      `}
    >
      <div className="flex-1 flex items-center justify-center">
        <span className="text-4xl leading-none">🎫</span>
      </div>
      <span className="text-xs leading-none font-extrabold">{caja.numero}</span>
      <span className="text-[10px] leading-none font-semibold mt-0.5 opacity-90">
        {caja.estado === "DISPONIBLE" ? "Libre" : caja.estado === "RESERVADA" ? "Reservado" : "Vendido"}
      </span>
      {reservada && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full" />
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

export default function TiendaCajas() {
  const { data: session } = useSession();
  const router = useRouter();

  const [fechaSorteo, setFechaSorteo] = useState<string | null>(null);
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

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cargar fecha del sorteo al montar
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { fechaSorteo?: string | null }) => {
        if (c.fechaSorteo) setFechaSorteo(new Date(c.fechaSorteo).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }));
      })
      .catch(() => undefined);
  }, []);

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

  // Carga inicial y al cambiar parámetros
  useEffect(() => {
    fetchCajas();
  }, [fetchCajas]);

  // Polling cada 5 segundos (silencioso)
  useEffect(() => {
    intervaloRef.current = setInterval(() => fetchCajas(true), 5000);
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [fetchCajas]);

  // Al buscar: resetear página
  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setBuscar(buscarInput);
    setPagina(1);
  };

  const handleFiltro = (f: Filtro) => {
    setFiltro(f);
    setPagina(1);
  };

  const abrirModal = (caja: Caja) => {
    if (!session) {
      router.push("/login?redirect=/tienda");
      return;
    }
    setCajaSeleccionada(caja);
    setResultadoReserva(null);
  };

  const cerrarModal = () => {
    if (resultadoReserva?.ok) fetchCajas(true);
    setCajaSeleccionada(null);
    setResultadoReserva(null);
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
        {/* Fecha del sorteo */}
        {fechaSorteo && (
          <div className="bg-[#ffbd1f] text-[#102463] py-2 px-4 text-center text-sm font-bold">
            🗓️ Fecha del resultado: {fechaSorteo}
          </div>
        )}
        {/* Encabezado */}
        <div style={{ background: "linear-gradient(135deg, #102463 0%, #173592 100%)" }} className="text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
              Membresías disponibles
            </h1>
            <p className="text-blue-200 text-sm">
              Elige tu número del 0000 al 9999 — $10.000 COP por membresía
            </p>
            {datos && (
              <div className="flex gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
                  <span className="text-blue-100">
                    {datos.total === 100
                      ? `${disponibles} membresías disponibles en esta página`
                      : `${datos.total.toLocaleString("es-CO")} resultados`}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Controles */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Buscador */}
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

              {/* Filtros */}
              <div className="flex gap-2 flex-shrink-0">
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
              </div>
            </div>

            {/* Leyenda */}
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

          {/* Grid de cajas */}
          {cargando ? (
            <div className="grid grid-cols-8 gap-1.5 mb-6">
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl shimmer" />
              ))}
            </div>
          ) : datos && datos.cajas.length > 0 ? (
            <>
              <div
                className="grid gap-1.5 mb-6"
                style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
              >
                {datos.cajas.map((caja) => (
                  <CeldaCaja key={caja.numero} caja={caja} onClick={abrirModal} />
                ))}
              </div>

              {/* Estadísticas de página */}
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4 px-1">
                <span>
                  Mostrando {(pagina - 1) * 100 + 1}–
                  {Math.min(pagina * 100, datos.total)} de{" "}
                  <strong>{datos.total.toLocaleString("es-CO")}</strong> membresías
                </span>
                <span className="flex gap-3">
                  <span className="text-green-600 font-medium">{disponibles} libres</span>
                  <span className="text-red-500 font-medium">{ocupadas} ocupadas</span>
                </span>
              </div>

              {/* Paginación */}
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

      {/* Modal */}
      <ModalReserva
        caja={cajaSeleccionada}
        onCerrar={cerrarModal}
        onConfirmar={confirmarReserva}
        cargando={reservandoCaja}
        resultado={resultadoReserva}
      />
    </div>
  );
}
