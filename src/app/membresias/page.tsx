"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import CountdownHero from "@/components/CountdownHero";
import ModalConfirmar from "@/components/ModalConfirmar";

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

interface TipoMembresiaAPI {
  slug: string;
  nombre: string;
  precio: number;
  fechaSorteo: string | null;
  vendidasTotal: number;
  freezeActivo: boolean;
  freezeMinutos: number | null;
}

// ── Modal de confirmación ──────────────────────────────────────────────────

interface ModalProps {
  caja: Caja | null;
  tier: string | null;
  precio: number;
  giftCardId: string | null;
  giftCardValor: number;
  giftCardCodigo: string | null;
  esSorpresa: boolean;
  onCerrar: () => void;
  onComprarConGiftCard: (numero: string) => Promise<void>;
  cargando: boolean;
  resultado: { ok: boolean; mensaje: string; expira?: string; compra?: boolean } | null;
  freezeActivo: boolean;
  freezeMinutos: number | null;
  autoReservando: boolean;
  expiraReserva: string | null;
}

function ModalReserva({ caja, tier, precio, giftCardId, giftCardValor, giftCardCodigo, esSorpresa, onCerrar, onComprarConGiftCard, cargando, resultado, freezeActivo, freezeMinutos, autoReservando, expiraReserva }: ModalProps) {
  const [confirmandoPago, setConfirmandoPago] = useState(false);
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
        {autoReservando ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#102463] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Reservando la membresía #{caja.numero}...</p>
          </div>
        ) : resultado ? (
          resultado.ok ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {resultado.compra ? "¡Membresía comprada!" : "¡Membresía reservada!"}
              </h3>
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

            {freezeActivo && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-center">
                <p className="text-orange-700 text-sm font-semibold">
                  ⏳ La selección de esta temporada está por comenzar
                </p>
                <p className="text-orange-600 text-xs mt-0.5">
                  Faltan {freezeMinutos} min — las reservas y compras se reabren apenas termine.
                </p>
              </div>
            )}

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
                <span className="text-gray-500">Reservada hasta las</span>
                <span className="font-bold text-orange-600">
                  {expiraReserva
                    ? new Date(expiraReserva).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCerrar}
                disabled={cargando}
                className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                Volver
              </button>
              {giftCardId ? (
                <button
                  onClick={() => setConfirmandoPago(true)}
                  disabled={cargando || freezeActivo}
                  className="flex-1 bg-[#ffbd1f] hover:bg-yellow-300 disabled:opacity-50 text-[#102463] font-bold py-3 rounded-full transition-all shadow-md text-center text-sm"
                >
                  {cargando ? "..." : "Pagar"}
                </button>
              ) : freezeActivo ? (
                <button
                  disabled
                  className="flex-1 bg-gray-200 text-gray-400 font-bold py-3 rounded-full text-center text-sm cursor-not-allowed"
                >
                  Pagar
                </button>
              ) : (
                <a
                  href={`/membresias/pagar?tier=${tier}&numero=${caja.numero}`}
                  className="flex-1 bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] font-bold py-3 rounded-full transition-all shadow-md text-center text-sm"
                >
                  Pagar
                </a>
              )}
            </div>

            <p className="text-center text-gray-400 text-xs mt-4">
              Al reservar o pagar aceptas los{" "}
              <Link href="/terminos" className="underline">términos y condiciones</Link>
            </p>

            {confirmandoPago && (
              <ModalConfirmar
                titulo="Confirmar pago con gift card"
                mensaje={
                  total === 0
                    ? `¿Deseas usar tu gift card ${giftCardCodigo ?? ""} para pagar la membresía #${caja.numero} por completo? Quedará en $0.`
                    : `¿Deseas aplicar tu gift card ${giftCardCodigo ?? ""} (−$${descuento.toLocaleString("es-CO", { maximumFractionDigits: 0 })}) y pagar los $${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })} restantes con tu saldo de cuenta?`
                }
                textoConfirmar="Sí, pagar"
                cargando={cargando}
                onConfirmar={async () => { await onComprarConGiftCard(caja.numero); setConfirmandoPago(false); }}
                onCancelar={() => setConfirmandoPago(false)}
              />
            )}
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
  seleccionada = false,
}: {
  caja: Caja;
  onClick: (caja: Caja) => void;
  precio: number;
  seleccionada?: boolean;
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
        ${seleccionada
          ? "bg-green-100 border-green-500 ring-2 ring-green-500 text-green-900 scale-105 shadow-lg cursor-pointer"
          : disponible
          ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-500 hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95"
          : reservada
          ? "bg-orange-50 border-orange-300 text-orange-700 cursor-not-allowed opacity-80"
          : "bg-red-50 border-red-300 text-red-700 cursor-not-allowed opacity-80"
        }
      `}
    >
      {seleccionada && (
        <span className="absolute top-2 right-2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-black">✓</span>
      )}
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

  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresiaAPI[]>([]);
  const [tier, setTier] = useState<string | null>(searchParams.get("tier"));
  const [giftCardId, setGiftCardId] = useState<string | null>(null);
  const [giftCardValor, setGiftCardValor] = useState(0);
  const [giftCardCodigo, setGiftCardCodigo] = useState<string | null>(null);
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
    compra?: boolean;
  } | null>(null);
  // Reserva automática al abrir el modal (antes solo se reservaba si el
  // usuario pulsaba un botón "Reservar" aparte de "Pagar" — casi nadie lo
  // usaba, así que el número quedaba disponible para cualquiera mientras
  // alguien lo tenía seleccionado o estaba decidiendo cómo pagar).
  const [autoReservando, setAutoReservando] = useState(false);
  const [expiraReserva, setExpiraReserva] = useState<string | null>(null);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [buscandoAleatoria, setBuscandoAleatoria] = useState(false);
  const [esSorpresa, setEsSorpresa] = useState(false);
  const [confirmado, setConfirmado] = useState<boolean | null>(null);

  // Tamaños de paquete ofrecidos al comprador — mismo set que valida el
  // backend (comprar-lote, firma-lote). 5 sigue siendo el default porque es
  // el umbral que da gift card gratis.
  const OPCIONES_PAQUETE: number[] = [1, 2, 3, 4, 5, 10];
  const [modoPaquete, setModoPaquete] = useState(false);
  const [tamanoPaquete, setTamanoPaquete] = useState<number>(5);
  const [paquete, setPaquete] = useState<string[]>([]);
  const [cargandoPaquete, setCargandoPaquete] = useState(false);
  const [reservandoPaquete, setReservandoPaquete] = useState(false);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/mis-cajas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { confirmado?: boolean } | null) => {
        if (d && typeof d.confirmado === "boolean") setConfirmado(d.confirmado);
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { tiposMembresia?: TipoMembresiaAPI[] }) => {
        const tipos = c.tiposMembresia ?? [];
        setTiposMembresia(tipos);
        setTier((actual) => (actual && tipos.some((t) => t.slug === actual)) ? actual : (tipos[0]?.slug ?? null));
      })
      .catch(() => undefined);
  }, []);

  const tierActual = tiposMembresia.find((t) => t.slug === tier) ?? tiposMembresia[0] ?? null;
  const precioCaja = tierActual?.precio ?? 0;
  const vendidasTotal = tierActual?.vendidasTotal ?? 0;
  const fechaSorteoISO = tierActual?.fechaSorteo ?? null;
  const freezeActivo = tierActual?.freezeActivo ?? false;
  const freezeMinutos = tierActual?.freezeMinutos ?? null;

  function cambiarTier(nuevoSlug: string) {
    setTier(nuevoSlug);
    setPagina(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tier", nuevoSlug);
    router.replace(`/membresias?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const gcId = searchParams.get("giftCard");
    if (!gcId || !session) return;
    fetch("/api/gift-cards")
      .then((r) => r.json())
      .then((data: { giftCards: { id: string; codigo: string; valor: number; estado: string }[] }) => {
        const gc = data.giftCards.find((g) => g.id === gcId && g.estado === "DISPONIBLE");
        if (gc) { setGiftCardId(gc.id); setGiftCardValor(gc.valor); setGiftCardCodigo(gc.codigo); }
      })
      .catch(() => undefined);
  }, [searchParams, session]);

  const fetchCajas = useCallback(
    async (silencioso = false) => {
      if (!tier) return;
      if (!silencioso) setCargando(true);
      try {
        const params = new URLSearchParams({
          tier,
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
    [tier, pagina, filtro, buscar]
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
    if (!tier) return;
    setBuscandoAleatoria(true);
    try {
      const res = await fetch(`/api/cajas/aleatoria?tier=${tier}`);
      const json = await res.json();
      if (!res.ok || !json.caja) return;
      setEsSorpresa(true);
      setCajaSeleccionada({ numero: json.caja.numero, estado: "DISPONIBLE" });
      setResultadoReserva(null);
      setExpiraReserva(null);
      setReservaConfirmada(false);
    } finally {
      setBuscandoAleatoria(false);
    }
  };

  const toggleEnPaquete = (caja: Caja) => {
    if (!session) { router.push("/login?redirect=/membresias"); return; }
    setPaquete((prev) => {
      if (prev.includes(caja.numero)) return prev.filter((n) => n !== caja.numero);
      if (prev.length >= tamanoPaquete) return prev;
      return [...prev, caja.numero];
    });
  };

  // Cambiar el tamaño recorta el paquete ya armado si excede el nuevo tamaño,
  // en vez de forzar a empezar de cero.
  const cambiarTamanoPaquete = (n: number) => {
    setTamanoPaquete(n);
    setPaquete((prev) => prev.slice(0, n));
    setErrorPaquete(null);
  };

  const completarPaqueteAleatorio = async () => {
    if (!session) { router.push("/login?redirect=/membresias"); return; }
    if (!tier) return;
    const faltan = tamanoPaquete - paquete.length;
    if (faltan <= 0) return;
    setCargandoPaquete(true);
    try {
      const res = await fetch(`/api/cajas/aleatoria?tier=${tier}&cantidad=${faltan}`);
      const json = await res.json();
      if (!res.ok) return;
      const nuevos: string[] = json.numeros ?? (json.caja ? [json.caja.numero] : []);
      setPaquete((prev) => Array.from(new Set([...prev, ...nuevos])).slice(0, tamanoPaquete));
      setModoPaquete(true);
    } finally {
      setCargandoPaquete(false);
    }
  };

  const cancelarPaquete = () => {
    setModoPaquete(false);
    setPaquete([]);
  };

  // Reserva las membresías del paquete antes de navegar a pagar-lote — antes
  // "Continuar al pago" navegaba directo sin reservar nada, dejando los
  // números visibles como disponibles para cualquiera mientras se decidía el pago.
  const [errorPaquete, setErrorPaquete] = useState<string | null>(null);
  const continuarPaquete = async () => {
    if (!tier || paquete.length !== tamanoPaquete) return;
    setReservandoPaquete(true);
    setErrorPaquete(null);
    try {
      const resultados = await Promise.all(
        paquete.map((numero) =>
          fetch(`/api/cajas/${tier}/${numero}/reservar`, { method: "POST" })
            .then(async (res) => ({ numero, ok: res.ok, json: await res.json() }))
            .catch(() => ({ numero, ok: false, json: { mensaje: "Error de conexión." } }))
        )
      );
      const fallidos = resultados.filter((r) => !r.ok);
      if (fallidos.length > 0) {
        setPaquete((prev) => prev.filter((n) => !fallidos.some((f) => f.numero === n)));
        setErrorPaquete(
          `Las membresías ${fallidos.map((f) => "#" + f.numero).join(", ")} ya no están disponibles — se quitaron de tu paquete. Elige otras para completar los ${tamanoPaquete}.`
        );
        await fetchCajas(true);
        return;
      }
      router.push(`/membresias/pagar-lote?tier=${tier}&numeros=${paquete.join(",")}`);
    } finally {
      setReservandoPaquete(false);
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
    setExpiraReserva(null);
    setReservaConfirmada(false);
  };

  // Reserva automática apenas se abre el modal (selección manual o "sorpresa") —
  // desde este momento el número queda bloqueado 15 min para cualquier otra
  // persona, en vez de quedar "disponible" mientras el usuario decide cómo pagar.
  useEffect(() => {
    if (!cajaSeleccionada || !tier) return;
    let cancelado = false;
    setAutoReservando(true);
    setReservaConfirmada(false);
    fetch(`/api/cajas/${tier}/${cajaSeleccionada.numero}/reservar`, { method: "POST" })
      .then(async (res) => {
        const json = await res.json();
        if (cancelado) return;
        if (!res.ok) {
          setResultadoReserva({ ok: false, mensaje: json.mensaje });
        } else {
          setExpiraReserva(json.expira ?? null);
          setReservaConfirmada(true);
        }
      })
      .catch(() => {
        if (!cancelado) setResultadoReserva({ ok: false, mensaje: "Error de conexión. Intenta nuevamente." });
      })
      .finally(() => {
        if (!cancelado) setAutoReservando(false);
      });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaSeleccionada?.numero, tier]);

  const cerrarModal = () => {
    if (resultadoReserva?.ok) fetchCajas(true);
    // Si se alcanzó a reservar pero el usuario no completó la compra, liberar
    // de inmediato en vez de dejar el número bloqueado 15 min sin necesidad.
    if (reservaConfirmada && !resultadoReserva?.ok && tier && cajaSeleccionada) {
      fetch(`/api/cajas/${tier}/${cajaSeleccionada.numero}/reservar`, { method: "DELETE" }).catch(() => undefined);
    }
    setCajaSeleccionada(null);
    setResultadoReserva(null);
    setExpiraReserva(null);
    setReservaConfirmada(false);
    setEsSorpresa(false);
  };

  const comprarConGiftCard = async (numero: string) => {
    if (!giftCardId || !tier) return;
    setReservandoCaja(true);
    try {
      const res = await fetch(`/api/cajas/${tier}/${numero}/comprar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftCardId }),
      });
      const json = await res.json();
      setResultadoReserva({ ok: res.ok, mensaje: json.mensaje, compra: true });
      if (res.ok) { setGiftCardId(null); setGiftCardValor(0); setGiftCardCodigo(null); }
    } catch {
      setResultadoReserva({ ok: false, mensaje: "Error de conexión. Intenta nuevamente.", compra: true });
    } finally {
      setReservandoCaja(false);
    }
  };

  const disponibles = datos?.cajas.filter((c) => c.estado === "DISPONIBLE").length ?? 0;
  const ocupadas = (datos?.cajas.length ?? 0) - disponibles;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {session && confirmado === false && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
          <p className="text-amber-800 text-sm font-semibold">
            ⚠ Debes verificar tu correo electrónico antes de reservar o comprar una membresía.{" "}
            <Link href="/dashboard" className="underline hover:text-amber-900">Verificar ahora</Link>
          </p>
        </div>
      )}

      <main className="flex-1 bg-gray-50">
        <section
          className="text-white"
          style={{ background: "linear-gradient(135deg, #102463 0%, #173592 55%, #1e44b8 100%)", padding: "56px 0 48px" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffbd1f", background: "rgba(255,189,31,0.12)", border: "1px solid rgba(255,189,31,0.30)", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
              Tienda de membresías 10K
            </span>
            <h1 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              Tu membresía,{" "}
              <span style={{ color: "#ffbd1f" }}>tu oportunidad</span>
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "0 0 24px", maxWidth: 480, lineHeight: 1.65 }}>
              10,000 membresías numeradas. Coincide con el número de la selección aleatoria en 4, 3, 2 o 1 cifra y gana parte del recaudo.
            </p>

            {tiposMembresia.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {tiposMembresia.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => cambiarTier(t.slug)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 700,
                      transition: "all 0.15s",
                      background: tier === t.slug ? "#ffbd1f" : "rgba(255,255,255,0.10)",
                      color: tier === t.slug ? "#102463" : "white",
                      border: tier === t.slug ? "1px solid #ffbd1f" : "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            )}

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

        {freezeActivo && (
          <div className="bg-orange-500 text-white px-4 py-3 text-sm font-semibold text-center">
            ⏳ La selección de esta temporada está por comenzar (en {freezeMinutos} min) — reservas y compras pausadas hasta que termine.
          </div>
        )}

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
              disabled={buscandoAleatoria || modoPaquete}
              className="shrink-0 bg-[#102463] hover:bg-[#173592] disabled:opacity-60 text-white font-bold px-6 py-3 rounded-full text-sm transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              <span className={buscandoAleatoria ? "animate-spin inline-block" : "inline-block"}>🎲</span>
              {buscandoAleatoria ? "Eligiendo..." : "Membresía aleatoria"}
            </button>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 mb-4">
            <div className="mb-3">
              <p className="font-extrabold text-green-800 text-base mb-1">Compra varias membresías en un solo pago</p>
              <p className="text-green-700/80 text-sm mb-2.5">
                Elige cuántas quieres{tamanoPaquete >= 5 ? " — por cada 5, te regalamos una gift card adicional." : "."}
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={OPCIONES_PAQUETE.length - 1}
                  step={1}
                  value={OPCIONES_PAQUETE.indexOf(tamanoPaquete)}
                  onChange={(e) => cambiarTamanoPaquete(OPCIONES_PAQUETE[Number(e.target.value)])}
                  className="flex-1 h-2 accent-green-600"
                />
                <div className="w-16 shrink-0 text-center text-2xl font-extrabold text-green-700 border-2 border-green-600/20 bg-white rounded-xl py-1.5">
                  {tamanoPaquete}
                </div>
              </div>
              <div className="flex justify-between text-xs text-green-700/60 mt-1 px-0.5">
                {OPCIONES_PAQUETE.map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>

            {!modoPaquete ? (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-green-200/70">
                <button
                  onClick={() => setModoPaquete(true)}
                  className="bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 font-bold px-4 py-2.5 rounded-full text-sm transition-all whitespace-nowrap"
                >
                  Elegir yo mismo
                </button>
                <button
                  onClick={completarPaqueteAleatorio}
                  disabled={cargandoPaquete}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-full text-sm transition-all shadow-md whitespace-nowrap flex items-center gap-1.5"
                >
                  <span className={cargandoPaquete ? "animate-spin inline-block" : "inline-block"}>🎲</span>
                  {tamanoPaquete} al azar
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-green-200/70">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-extrabold text-green-800 text-base">Tu paquete ({paquete.length}/{tamanoPaquete})</p>
                  <button onClick={cancelarPaquete} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {paquete.length === 0 && (
                    <span className="text-sm text-green-700/70">Toca hasta {tamanoPaquete} números disponibles en la grilla de abajo, o usa &quot;{tamanoPaquete} al azar&quot;.</span>
                  )}
                  {paquete.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1.5 bg-white border border-green-400 rounded-full pl-3 pr-1.5 py-1 text-sm font-bold text-green-800">
                      #{n}
                      <button
                        onClick={() => setPaquete((p) => p.filter((x) => x !== n))}
                        className="w-5 h-5 rounded-full bg-green-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-green-600 transition-colors"
                        aria-label={`Quitar ${n}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {errorPaquete && (
                  <p className="text-red-600 text-xs font-semibold mb-3">⚠ {errorPaquete}</p>
                )}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {paquete.length < tamanoPaquete ? (
                    <button
                      onClick={completarPaqueteAleatorio}
                      disabled={cargandoPaquete}
                      className="text-sm font-semibold text-green-700 hover:text-green-900 underline disabled:opacity-60"
                    >
                      🎲 Completar con {tamanoPaquete - paquete.length} al azar
                    </button>
                  ) : <span />}
                  {paquete.length === tamanoPaquete ? (
                    <button
                      onClick={continuarPaquete}
                      disabled={reservandoPaquete}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-md transition-all"
                    >
                      {reservandoPaquete ? "Reservando..." : `Continuar al pago — $${(precioCaja * tamanoPaquete).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`}
                    </button>
                  ) : (
                    <span className="text-sm text-green-700/70">Selecciona {tamanoPaquete - paquete.length} más</span>
                  )}
                </div>
              </div>
            )}
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
                  disabled={buscandoAleatoria || modoPaquete}
                  title="Elegir número al azar"
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-[#ffbd1f] hover:bg-yellow-300 text-[#102463] disabled:opacity-60 transition-all flex items-center gap-1.5"
                >
                  <span className={buscandoAleatoria ? "animate-spin inline-block" : "inline-block"}>🎲</span>
                  Aleatoria
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
                  <CeldaCaja
                    key={caja.numero}
                    caja={caja}
                    onClick={modoPaquete ? toggleEnPaquete : abrirModal}
                    precio={precioCaja}
                    seleccionada={modoPaquete && paquete.includes(caja.numero)}
                  />
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
        tier={tier}
        precio={precioCaja}
        giftCardId={giftCardId}
        giftCardValor={giftCardValor}
        giftCardCodigo={giftCardCodigo}
        esSorpresa={esSorpresa}
        onCerrar={cerrarModal}
        onComprarConGiftCard={comprarConGiftCard}
        cargando={reservandoCaja}
        resultado={resultadoReserva}
        freezeActivo={freezeActivo}
        freezeMinutos={freezeMinutos}
        autoReservando={autoReservando}
        expiraReserva={expiraReserva}
      />
    </div>
  );
}
