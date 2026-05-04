"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import dynamic from "next/dynamic";

const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeCanvas),
  { ssr: false }
);

const MINUTOS_RESERVA = 15;

interface CajaReservada {
  numero: string;
  fechaCompra: string;
  expira: string;
}

interface CajaVendida {
  numero: string;
  fechaCompra: string;
  idCompra: string | null;
}

interface Premio {
  categoria: string;
  monto: number;
  pagado: boolean;
}

interface Retiro {
  id: string;
  monto: number;
  estado: string;
  fecha: string;
  cuentaDestino: string;
}

interface AnticipadaGanada {
  id: string;
  nombre: string;
  premioDescripcion: string;
  premioValor: number | null;
  fecha: string;
  numeroCaja: string | null;
}

interface MisCajas {
  reservadas: CajaReservada[];
  vendidas: CajaVendida[];
  premios: Premio[];
  retiros: Retiro[];
  saldoPuntos: number;
  nombre: string;
  banco: string | null;
  tipoCuenta: string | null;
  cuentaBancaria: string | null;
  anticipadasGanadas: AnticipadaGanada[];
}

// ── Hook de cuenta regresiva ──────────────────────────────────────────────

function useCountdown(expira: string | null) {
  const calcMs = useCallback(
    () => (expira ? Math.max(0, new Date(expira).getTime() - Date.now()) : 0),
    [expira]
  );
  const [ms, setMs] = useState(calcMs);

  useEffect(() => {
    setMs(calcMs());
    if (!expira) return;
    const t = setInterval(() => {
      const r = calcMs();
      setMs(r);
      if (r === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [expira, calcMs]);

  const min = Math.floor(ms / 60000);
  const seg = Math.floor((ms % 60000) / 1000);
  const pct = expira
    ? Math.max(0, (ms / (MINUTOS_RESERVA * 60 * 1000)) * 100)
    : 0;
  return { min, seg, expirada: ms === 0, pct };
}

// ── Tarjeta de reserva activa ─────────────────────────────────────────────

interface GiftCardDisp { id: string; codigo: string; valor: number; }

function TarjetaReserva({
  caja,
  precio,
  giftCardsDisponibles,
  onComprar,
  comprando,
}: {
  caja: CajaReservada;
  precio: number;
  giftCardsDisponibles: GiftCardDisp[];
  onComprar: (numero: string, giftCardId?: string) => Promise<void>;
  comprando: boolean;
}) {
  const { min, seg, expirada, pct } = useCountdown(caja.expira);
  const [gcSeleccionada, setGcSeleccionada] = useState<string>("");

  const gc = giftCardsDisponibles.find((g) => g.id === gcSeleccionada) ?? null;
  const descuento = gc ? Math.min(gc.valor, precio) : 0;
  const total = precio - descuento;

  return (
    <div
      className={`bg-white rounded-2xl border-2 p-5 transition-all ${
        expirada
          ? "border-gray-200 opacity-60"
          : min < 3
          ? "border-red-300 shadow-red-100 shadow-md"
          : "border-orange-300 shadow-orange-100 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
            Número reservado
          </p>
          <span className="text-4xl font-extrabold text-[#1B4F8A] tracking-widest">
            {caja.numero}
          </span>
        </div>
        <div className="text-right">
          {expirada ? (
            <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-1 rounded-full">
              Vencida
            </span>
          ) : (
            <span
              className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                min < 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              Reservada
            </span>
          )}
        </div>
      </div>

      {!expirada && (
        <>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tiempo restante</span>
              <span className={`font-bold tabular-nums ${min < 3 ? "text-red-600" : "text-orange-600"}`}>
                {String(min).padStart(2, "0")}:{String(seg).padStart(2, "0")}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${min < 3 ? "bg-red-400" : "bg-orange-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Precio + gift card */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Precio</span>
              <span className={`font-bold ${descuento > 0 ? "line-through text-gray-400" : "text-gray-900"}`}>
                ${precio.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
              </span>
            </div>
            {descuento > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>🎁 Gift card</span>
                  <span className="font-bold">−${descuento.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-extrabold text-[#1B4F8A]">
                    {total === 0 ? "¡Gratis!" : `$${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Selector de gift card */}
          {giftCardsDisponibles.length > 0 && (
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Aplicar gift card</label>
              <select
                value={gcSeleccionada}
                onChange={(e) => setGcSeleccionada(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
              >
                <option value="">Sin gift card</option>
                {giftCardsDisponibles.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.codigo} — ${g.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => onComprar(caja.numero, gcSeleccionada || undefined)}
            disabled={comprando}
            className="w-full bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-bold py-3 rounded-xl transition-colors shadow-md text-sm"
          >
            {comprando
              ? "Procesando..."
              : total === 0
              ? "✅ Completar compra — ¡Gratis!"
              : `✅ Completar compra — $${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`}
          </button>
        </>
      )}

      {expirada && (
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            La reserva venció. El número quedó disponible nuevamente.
          </p>
          <Link href="/tienda" className="inline-block bg-[#1B4F8A] hover:bg-[#1a5fa8] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
            Elegir otro número
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de caja comprada ──────────────────────────────────────────────

function TarjetaCajaComprada({ caja }: { caja: CajaVendida }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className="w-14 h-14 bg-[#1B4F8A]/5 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-extrabold text-[#1B4F8A] tracking-wider">
          {caja.numero}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">Membresía #{caja.numero}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {caja.fechaCompra
            ? new Date(caja.fechaCompra).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—"}
        </p>
        {caja.idCompra && (
          <p className="text-gray-300 text-xs font-mono truncate mt-0.5">
            {caja.idCompra}
          </p>
        )}
      </div>
      <span className="flex-shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
        Comprada
      </span>
    </div>
  );
}

// ── Modal de solicitud de retiro ──────────────────────────────────────────

const ESTADO_RETIRO: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-orange-100 text-orange-700" },
  APROBADO:   { label: "Aprobado",   cls: "bg-blue-100 text-blue-700" },
  PAGADO:     { label: "Pagado",     cls: "bg-green-100 text-green-700" },
  RECHAZADO:  { label: "Rechazado",  cls: "bg-red-100 text-red-700" },
};

function ModalRetiro({
  saldo,
  banco,
  tipoCuenta,
  cuentaBancaria,
  onClose,
  onSuccess,
}: {
  saldo: number;
  banco: string | null;
  tipoCuenta: string | null;
  cuentaBancaria: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoNum = parseFloat(monto) || 0;
  const montoValido = montoNum >= 100_000 && montoNum <= saldo;
  const tieneCuenta = !!banco && !!cuentaBancaria;

  async function solicitar() {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/retiros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: montoNum }),
    });
    const json = await res.json() as { mensaje: string };
    setEnviando(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError(json.mensaje);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Solicitar retiro</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {!tieneCuenta ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
            No tienes una cuenta bancaria registrada. Contacta al administrador
            del administrador para agregar tu cuenta antes de solicitar el retiro.
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                Cuenta de destino
              </p>
              <p className="font-semibold text-gray-900">{banco}</p>
              <p className="text-sm text-gray-600">
                {tipoCuenta} — {cuentaBancaria}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Monto a retirar (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">
                  $
                </span>
                <input
                  type="number"
                  min={100000}
                  max={saldo}
                  step={1000}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="100000"
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Saldo disponible:{" "}
                <span className="font-semibold text-green-600">
                  ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                </span>
                {" · "}Mínimo: $100.000
              </p>
              {monto && montoNum > saldo && (
                <p className="text-xs text-red-500 mt-1">
                  El monto supera tu saldo disponible.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={solicitar}
                disabled={!montoValido || enviando}
                className="flex-1 py-2.5 rounded-xl bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors"
              >
                {enviando ? "Enviando..." : "Solicitar retiro"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Gift Card — selector con carrusel ────────────────────────────────────

interface GiftCardItem {
  id: string;
  codigo: string;
  valor: number;
  estado: string;
  creadaEn: string;
  nota: string | null;
}

function SelectorGiftCards({
  cards,
  onAccion,
}: {
  cards: GiftCardItem[];
  onAccion: (id: string, accion: "retirar" | "regalar" | "usar") => void;
}) {
  const [idx, setIdx] = useState(0);
  const gc = cards[idx];
  if (!gc) return null;

  return (
    <div>
      {/* Cabecera con contador y navegación */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-700">
          Gift cards disponibles
          <span className="ml-1.5 bg-[#F5A623] text-[#102463] text-xs font-extrabold px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </p>
        {cards.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setIdx((i) => (i - 1 + cards.length) % cards.length)}
              className="w-6 h-6 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold transition-colors"
            >‹</button>
            <span className="tabular-nums">{idx + 1} / {cards.length}</span>
            <button
              onClick={() => setIdx((i) => (i + 1) % cards.length)}
              className="w-6 h-6 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold transition-colors"
            >›</button>
          </div>
        )}
      </div>

      {/* Tarjeta */}
      <div className="flex gap-3 items-start">
        {/* Imagen compacta */}
        <div className="relative flex-shrink-0" style={{ width: 140 }}>
          <img src="/giftcard.svg" alt="Gift Card" className="rounded-xl w-full block shadow-sm" />
          <div className="absolute inset-0 flex flex-col items-end justify-end p-2 pointer-events-none">
            <p className="text-white font-extrabold text-xs leading-tight drop-shadow text-right"
               style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
              ${gc.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-white/70 font-mono text-[9px] leading-tight">{gc.codigo}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex-1 flex flex-col gap-2">
          <button
            onClick={() => onAccion(gc.id, "usar")}
            className="w-full bg-[#102463] hover:bg-[#173592] text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors text-left"
          >
            🎟️ Usar en membresía
          </button>
          <button
            onClick={() => onAccion(gc.id, "retirar")}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors text-left"
          >
            💰 Añadir a saldo
          </button>
          <button
            onClick={() => onAccion(gc.id, "regalar")}
            className="w-full border-2 border-[#102463] text-[#102463] hover:bg-[#102463]/5 text-xs font-bold py-2 px-3 rounded-xl transition-colors text-left"
          >
            🎁 Regalar a alguien
          </button>
        </div>
      </div>

      {/* Dots si hay varias */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-[#F5A623] w-3" : "bg-gray-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal regalar gift card ───────────────────────────────────────────────

function ModalRegalar({
  gcId,
  onClose,
  onSuccess,
}: {
  gcId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/gift-cards/${gcId}/regalar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo }),
    });
    const json = await res.json() as { mensaje: string };
    setEnviando(false);
    if (res.ok) onSuccess();
    else setError(json.mensaje);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Regalar gift card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Ingresa el correo del usuario que recibirá la gift card.
        </p>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 mb-4"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Cancelar</button>
          <button
            onClick={enviar}
            disabled={!correo || enviando}
            className="flex-1 py-2.5 rounded-xl bg-[#102463] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm"
          >
            {enviando ? "Enviando..." : "Regalar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sección de referidos (autónoma, fetch propio) ─────────────────────────

interface DatosReferidosAPI {
  codigoRef: string | null;
  comprados: number;
  progreso: number;
}

function SeccionReferidos() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosReferidosAPI | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQR, setMostrarQR] = useState(false);
  const [modalRegalar, setModalRegalar] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargarTodo = () => {
    Promise.all([
      fetch("/api/referidos").then((r) => r.ok ? r.json() : null),
      fetch("/api/gift-cards").then((r) => r.ok ? r.json() : null),
    ]).then(([ref, gcs]) => {
      if (ref) setDatos({ codigoRef: ref.codigoRef ?? null, comprados: ref.comprados ?? 0, progreso: ref.progreso ?? 0 });
      if (gcs?.giftCards) setGiftCards(gcs.giftCards);
      setCargando(false);
    }).catch(() => setCargando(false));
  };

  useEffect(() => { cargarTodo(); }, []);

  const mostrarToast = (ok: boolean, texto: string) => {
    setToast({ ok, texto });
    setTimeout(() => setToast(null), 3500);
  };

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const linkRef = datos?.codigoRef ? `${base}/registro?ref=${datos.codigoRef}` : null;

  function copiarLink() {
    if (!linkRef) return;
    navigator.clipboard.writeText(linkRef).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  function descargarQR() {
    const canvas = document.querySelector("#qr-ref-canvas canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `mi-referido-${datos?.codigoRef ?? "qr"}.png`;
    a.click();
  }

  async function manejarAccion(id: string, accion: "retirar" | "regalar" | "usar") {
    if (accion === "regalar") { setModalRegalar(id); return; }
    if (accion === "usar") { router.push("/tienda?giftCard=" + id); return; }
    // retirar → añadir a saldo
    const res = await fetch(`/api/gift-cards/${id}/retirar`, { method: "POST" });
    const json = await res.json() as { mensaje: string };
    mostrarToast(res.ok, json.mensaje);
    if (res.ok) cargarTodo();
  }

  const comprados = datos?.comprados ?? 0;
  const enCiclo = comprados % 5;
  const barPct = (enCiclo / 5) * 100;
  const faltan = enCiclo === 0 ? 5 : 5 - enCiclo;
  const gcDisponibles = giftCards.filter((g) => g.estado === "DISPONIBLE");

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.texto}
        </div>
      )}

      {/* Modal regalar */}
      {modalRegalar && (
        <ModalRegalar
          gcId={modalRegalar}
          onClose={() => setModalRegalar(null)}
          onSuccess={() => { setModalRegalar(null); mostrarToast(true, "Gift card enviada correctamente."); cargarTodo(); }}
        />
      )}

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-white font-extrabold text-lg leading-tight">
                Invita amigos y gana gift cards
              </h2>
              <p className="text-blue-200 text-sm mt-0.5">
                Por cada 5 amigos que adquieran su primera membresía, recibes una gift card con el valor de la membresía
              </p>
            </div>
            <Link href="/ranking" className="flex-shrink-0 text-[#F5A623] text-xs font-bold hover:underline">
              Ver ranking →
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {cargando && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-[#1B4F8A] border-t-transparent animate-spin" />
              <span className="text-sm text-gray-400">Cargando...</span>
            </div>
          )}

          {/* Código + acciones */}
          {!cargando && datos?.codigoRef && (
            <div className="bg-[#1B4F8A]/5 border border-[#1B4F8A]/15 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Tu código de referido
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-extrabold tracking-[0.2em] text-[#1B4F8A] font-mono">
                  {datos.codigoRef}
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={copiarLink}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${copiado ? "bg-green-500 text-white" : "bg-[#1B4F8A] hover:bg-[#1a5fa8] text-white"}`}
                  >
                    {copiado ? "✓ ¡Link copiado!" : "Copiar link"}
                  </button>
                  <button
                    onClick={() => setMostrarQR((v) => !v)}
                    className="text-sm font-bold px-4 py-2 rounded-xl border-2 border-[#1B4F8A] text-[#1B4F8A] hover:bg-[#1B4F8A]/5 transition-colors"
                  >
                    {mostrarQR ? "Ocultar QR" : "Ver QR"}
                  </button>
                </div>
              </div>
              {linkRef && <p className="text-xs text-gray-400 mt-2 truncate font-mono">{linkRef}</p>}
            </div>
          )}

          {/* QR */}
          {mostrarQR && linkRef && (
            <div className="flex flex-col items-center gap-3 bg-gray-50 rounded-xl p-5">
              <p className="text-xs text-gray-500 font-semibold">Comparte este QR para que tus amigos se registren directamente</p>
              <div id="qr-ref-canvas" className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <QRCodeCanvas value={linkRef} size={180} bgColor="#ffffff" fgColor="#1B4F8A" level="M" />
              </div>
              <button onClick={descargarQR} className="bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-md">
                Descargar QR
              </button>
            </div>
          )}

          {/* Progreso */}
          {!cargando && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">{enCiclo} de 5 amigos han comprado</span>
                {comprados > 0 && <span className="text-xs text-gray-400">{comprados} en total</span>}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#1B4F8A] to-[#F5A623] transition-all duration-700"
                  style={{ width: enCiclo === 0 && comprados > 0 ? "100%" : `${barPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {comprados === 0
                  ? "Por cada 5 amigos que compren su primera membresía, recibes una gift card"
                  : enCiclo === 0
                  ? "¡Completaste 5 referidos! Sigue invitando para ganar otra gift card."
                  : `Te ${faltan === 1 ? "falta 1 amigo" : `faltan ${faltan} amigos`} para ganar tu ${Math.floor(comprados / 5) + 1 === 1 ? "primera" : "próxima"} gift card`}
              </p>
            </div>
          )}

          {/* Gift cards disponibles */}
          {!cargando && gcDisponibles.length > 0 && (
            <SelectorGiftCards cards={gcDisponibles} onAccion={manejarAccion} />
          )}

          {/* Sin gift cards */}
          {!cargando && gcDisponibles.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-400 text-center">
              Aún no tienes gift cards — ¡invita amigos para ganarlas!
            </div>
          )}

          {/* Historial usadas/regaladas */}
          {!cargando && giftCards.filter((g) => g.estado !== "DISPONIBLE").length > 0 && (
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer hover:text-gray-600 font-medium">
                Ver historial ({giftCards.filter((g) => g.estado !== "DISPONIBLE").length} usadas)
              </summary>
              <div className="mt-3 space-y-1.5">
                {giftCards.filter((g) => g.estado !== "DISPONIBLE").map((gc) => (
                  <div key={gc.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <span className="font-mono text-[10px] text-gray-400">{gc.codigo}</span>
                    <span className="text-[10px] font-semibold">
                      ${gc.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      gc.estado === "USADA" ? "bg-blue-100 text-blue-600" :
                      gc.estado === "REGALADA" ? "bg-purple-100 text-purple-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {gc.estado.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

        </div>
      </section>
    </>
  );
}

// ── Dashboard principal ────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [datos, setDatos] = useState<MisCajas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [precioCaja, setPrecioCaja] = useState(10_000);
  const [giftCardsDisponibles, setGiftCardsDisponibles] = useState<GiftCardDisp[]>([]);
  const [comprando, setComprando] = useState<string | null>(null);
  const [mensajeCompra, setMensajeCompra] = useState<{
    ok: boolean;
    texto: string;
  } | null>(null);
  const [modalRetiro, setModalRetiro] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargarDatos = useCallback(async () => {
    const [resCajas, resGcs] = await Promise.all([
      fetch("/api/mis-cajas"),
      fetch("/api/gift-cards"),
    ]);
    if (resCajas.ok) setDatos(await resCajas.json());
    if (resGcs.ok) {
      const gcsData = await resGcs.json() as { giftCards: (GiftCardDisp & { estado: string })[] };
      setGiftCardsDisponibles(gcsData.giftCards.filter((g) => g.estado === "DISPONIBLE"));
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { precioCaja?: number }) => { if (c.precioCaja) setPrecioCaja(c.precioCaja); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === "authenticated") cargarDatos();
  }, [status, cargarDatos]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setInterval(cargarDatos, 30_000);
    return () => clearInterval(t);
  }, [status, cargarDatos]);

  async function completarCompra(numero: string, giftCardId?: string) {
    setComprando(numero);
    setMensajeCompra(null);
    const res = await fetch(`/api/cajas/${numero}/comprar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(giftCardId ? { giftCardId } : {}),
    });
    const json = await res.json() as { mensaje: string };
    setComprando(null);
    setMensajeCompra({ ok: res.ok, texto: json.mensaje });
    if (res.ok) cargarDatos();
  }

  if (status === "loading" || cargando) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Cargando tu panel...</div>
        </main>
        <Footer />
      </div>
    );
  }

  const nombre = datos?.nombre ?? session?.user?.name?.split(" ")[0] ?? "Usuario";
  const reservadasActivas = datos?.reservadas ?? [];
  const cajas = datos?.vendidas ?? [];
  const premios = datos?.premios ?? [];
  const retiros = datos?.retiros ?? [];
  const saldo = datos?.saldoPuntos ?? 0;
  const anticipadasGanadas = datos?.anticipadasGanadas ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Bienvenida */}
          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white">
            <h1 className="text-2xl font-extrabold mb-0.5">Hola, {nombre} 👋</h1>
            <p className="text-blue-200 text-sm">Bienvenido a tu panel de participación</p>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <span className="text-2xl">📦</span>
              <p className="text-xl font-extrabold mt-1 text-[#1B4F8A]">{cajas.length}</p>
              <p className="text-gray-500 text-xs mt-0.5">Membresías compradas</p>
              {cajas.length >= 10 && (
                <span className="inline-block mt-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                  ⭐ VIP 10+
                </span>
              )}
            </div>

            {/* Saldo — con botón de retiro si hay saldo */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center">
              <span className="text-2xl">💰</span>
              <p className="text-xl font-extrabold mt-1 text-green-600">
                ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Saldo disponible</p>
              {saldo >= 100_000 && (
                <button
                  onClick={() => setModalRetiro(true)}
                  className="mt-2 text-xs font-semibold text-[#1B4F8A] hover:underline"
                >
                  Solicitar retiro →
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <span className="text-2xl">🏆</span>
              <p className="text-xl font-extrabold mt-1 text-[#F5A623]">{premios.length}</p>
              <p className="text-gray-500 text-xs mt-0.5">Beneficios ganados</p>
            </div>
          </div>

          {/* Toast de resultado de compra */}
          {mensajeCompra && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
                mensajeCompra.ok
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <span>
                {mensajeCompra.ok ? "✅ " : "❌ "}
                {mensajeCompra.texto}
              </span>
              <button
                onClick={() => setMensajeCompra(null)}
                className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Reservas activas */}
          {reservadasActivas.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-gray-900">Mis reservas activas</h2>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {reservadasActivas.length}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {reservadasActivas.map((caja) => (
                  <TarjetaReserva
                    key={caja.numero}
                    caja={caja}
                    precio={precioCaja}
                    giftCardsDisponibles={giftCardsDisponibles}
                    onComprar={completarCompra}
                    comprando={comprando === caja.numero}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Sin reservas → CTA comprar */}
          {reservadasActivas.length === 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
              <p className="text-3xl mb-2">🎁</p>
              <h2 className="text-lg font-bold text-[#1B4F8A] mb-1">
                {cajas.length === 0 ? "¡Empieza a participar!" : "¿Quieres más números?"}
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                {cajas.length === 0
                  ? "Elige tu número de la suerte del 0000 al 9999."
                  : "Puedes adquirir más membresías y aumentar tus chances de obtener beneficios."}
              </p>
              <Link
                href="/tienda"
                className="inline-block bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-7 py-3 rounded-xl transition-colors shadow-md"
              >
                Ir a las membresías
              </Link>
            </div>
          )}

          {/* Mensaje motivacional 10+ cajas */}
          {cajas.length >= 10 && (
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="font-extrabold text-lg">¡Eres VIP!</p>
                  <p className="text-purple-200 text-sm">Con 10+ membresías participas en eventos exclusivos del club para grandes miembros.</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de referidos */}
          <SeccionReferidos />

          {/* Cajas compradas */}
          {cajas.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  Mis membresías compradas
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({cajas.length})
                  </span>
                </h2>
                <Link
                  href="/tienda"
                  className="text-[#1B4F8A] text-sm font-semibold hover:underline"
                >
                  + Adquirir más
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {cajas.map((caja) => (
                  <TarjetaCajaComprada key={caja.numero} caja={caja} />
                ))}
              </div>
            </section>
          )}

          {/* Selecciones anticipadas ganadas */}
          {anticipadasGanadas.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Selecciones anticipadas ganadas 🎯</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {anticipadasGanadas.map((a) => (
                  <div key={a.id} className="bg-gradient-to-br from-[#1B4F8A]/5 to-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl flex-shrink-0">🎉</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[#1B4F8A] text-sm truncate">{a.nombre}</p>
                      <p className="text-[#F5A623] font-extrabold text-lg">{a.premioDescripcion}</p>
                      {a.premioValor && (
                        <p className="text-gray-500 text-xs">${a.premioValor.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</p>
                      )}
                      {a.numeroCaja && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          Membresía ganadora: <span className="font-extrabold text-[#1B4F8A] font-mono">#{a.numeroCaja}</span>
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-0.5">
                        {new Date(a.fecha).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <span className="flex-shrink-0 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                      Pendiente entrega
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Premios ganados */}
          {premios.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Beneficios ganados 🏆</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {premios.map((p, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl">
                      {p.categoria === "CUATRO_CIFRAS" ? "🏆"
                        : p.categoria === "TRES_CIFRAS" ? "🥈"
                        : p.categoria === "DOS_CIFRAS" ? "🥉"
                        : "🎁"}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {p.categoria === "CUATRO_CIFRAS" ? "4 cifras"
                          : p.categoria === "TRES_CIFRAS" ? "3 cifras"
                          : p.categoria === "DOS_CIFRAS" ? "2 cifras"
                          : "1 cifra"}
                      </p>
                      <p className="text-[#F5A623] font-extrabold text-lg">
                        ${p.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {p.pagado ? "Pagado" : "Pendiente de pago"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historial de retiros */}
          {retiros.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Mis solicitudes de retiro</h2>
                {saldo >= 100_000 && (
                  <button
                    onClick={() => setModalRetiro(true)}
                    className="text-[#1B4F8A] text-sm font-semibold hover:underline"
                  >
                    + Nueva solicitud
                  </button>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {retiros.map((r) => {
                  const badge = ESTADO_RETIRO[r.estado] ?? { label: r.estado, cls: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={r.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">
                          ${r.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{r.cuentaDestino}</p>
                        <p className="text-gray-300 text-xs mt-0.5">
                          {new Date(r.fecha).toLocaleString("es-CO", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />

      {/* Modal de retiro */}
      {modalRetiro && (
        <ModalRetiro
          saldo={saldo}
          banco={datos?.banco ?? null}
          tipoCuenta={datos?.tipoCuenta ?? null}
          cuentaBancaria={datos?.cuentaBancaria ?? null}
          onClose={() => setModalRetiro(false)}
          onSuccess={() => {
            setModalRetiro(false);
            setMensajeCompra({ ok: true, texto: "Solicitud de retiro enviada correctamente." });
            cargarDatos();
          }}
        />
      )}
    </div>
  );
}
