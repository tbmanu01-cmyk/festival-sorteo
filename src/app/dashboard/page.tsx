"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import dynamic from "next/dynamic";
import ModalConfirmar from "@/components/ModalConfirmar";

const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeCanvas),
  { ssr: false }
);

const MINUTOS_RESERVA = 15;

interface CajaReservada {
  numero: string;
  fechaCompra: string;
  expira: string;
  tipoMembresia: { slug: string; nombre: string } | null;
}

interface CajaVendida {
  numero: string;
  fechaCompra: string;
  idCompra: string | null;
  tipoMembresia: { slug: string; nombre: string } | null;
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
  confirmado: boolean;
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
  saldo,
  giftCardsDisponibles,
  onComprar,
  onLiberar,
  comprando,
}: {
  caja: CajaReservada;
  precio: number;
  saldo: number;
  giftCardsDisponibles: GiftCardDisp[];
  onComprar: (numero: string, tier: string, giftCardId?: string) => Promise<void>;
  onLiberar: (numero: string, tier: string) => Promise<void>;
  comprando: boolean;
}) {
  const tier = caja.tipoMembresia?.slug ?? "";
  const { min, seg, expirada, pct } = useCountdown(caja.expira);
  const [gcSeleccionada, setGcSeleccionada] = useState<string>("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoLiberar, setConfirmandoLiberar] = useState(false);

  const gc = giftCardsDisponibles.find((g) => g.id === gcSeleccionada) ?? null;
  const descuento = gc ? Math.min(gc.valor, precio) : 0;
  const total = precio - descuento;
  const alcanzaSaldo = total === 0 || saldo >= total;

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
      {confirmando && (
        <ModalConfirmar
          titulo="Confirmar pago"
          mensaje={
            total === 0
              ? `¿Deseas pagar la membresía #${caja.numero} usando tu gift card ${gc?.codigo}? Quedará totalmente cubierta.`
              : gc
              ? `¿Deseas pagar la membresía #${caja.numero} aplicando la gift card ${gc.codigo} y $${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })} de tu saldo?`
              : `¿Deseas pagar esta membresía #${caja.numero} con $${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })} de tu saldo de cuenta?`
          }
          textoConfirmar="Sí, pagar"
          cargando={comprando}
          onConfirmar={async () => { await onComprar(caja.numero, tier, gcSeleccionada || undefined); setConfirmando(false); }}
          onCancelar={() => setConfirmando(false)}
        />
      )}

      {confirmandoLiberar && (
        <ModalConfirmar
          titulo="Liberar reserva"
          mensaje={`¿Seguro que deseas dejar de reservar la membresía #${caja.numero}? Quedará disponible para que cualquier otro usuario la elija.`}
          textoConfirmar="Sí, liberar"
          peligroso
          cargando={comprando}
          onConfirmar={async () => { await onLiberar(caja.numero, tier); setConfirmandoLiberar(false); }}
          onCancelar={() => setConfirmandoLiberar(false)}
        />
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
              Número reservado
            </p>
            <span className="text-4xl font-extrabold text-[#1B4F8A] tracking-widest">
              {caja.numero}
            </span>
          </div>
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

          {alcanzaSaldo ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(true)}
                disabled={comprando}
                className="flex-1 bg-[#F5A623] hover:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 text-[#1B4F8A] font-bold py-3 rounded-xl transition-colors shadow-md text-sm"
              >
                {comprando
                  ? "Procesando..."
                  : total === 0
                  ? "✅ Completar compra — ¡Gratis!"
                  : `✅ Pagar con saldo — $${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`}
              </button>
              <button
                onClick={() => setConfirmandoLiberar(true)}
                disabled={comprando}
                title="Dejar de reservar esta membresía"
                className="flex-shrink-0 border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold py-3 px-3 rounded-xl transition-colors text-sm"
              >
                ✕ Liberar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-medium text-center">
                Tu saldo no alcanza (te faltan ${(total - saldo).toLocaleString("es-CO", { maximumFractionDigits: 0 })}).
              </p>
              <div className="flex gap-2">
                <a
                  href={`/membresias/pagar?tier=${tier}&numero=${caja.numero}`}
                  className="flex-1 text-center bg-[#102463] hover:bg-[#173592] text-white font-bold py-3 rounded-xl transition-colors shadow-md text-sm"
                >
                  💳 Pagar con tarjeta, PSE o Nequi
                </a>
                <button
                  onClick={() => setConfirmandoLiberar(true)}
                  disabled={comprando}
                  title="Dejar de reservar esta membresía"
                  className="flex-shrink-0 border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold py-3 px-3 rounded-xl transition-colors text-sm"
                >
                  ✕ Liberar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {expirada && (
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            La reserva venció. El número quedó disponible nuevamente.
          </p>
          <Link href="/membresias" className="inline-block bg-[#1B4F8A] hover:bg-[#1a5fa8] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
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
  const [paso, setPaso] = useState<"monto" | "codigo">("monto");
  const [monto, setMonto] = useState("");
  const [retiroId, setRetiroId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
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
    const json = await res.json() as { mensaje: string; retiroId?: string };
    setEnviando(false);
    if (json.retiroId) {
      setRetiroId(json.retiroId);
      setPaso("codigo");
      if (!res.ok) setError(json.mensaje); // 409: muestra el mensaje pero avanza al código
    } else {
      setError(json.mensaje);
    }
  }

  async function verificar() {
    if (!retiroId || codigo.length !== 6) return;
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/retiros/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retiroId, codigo }),
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
          <h2 className="text-lg font-bold text-gray-900">
            {paso === "monto" ? "Solicitar retiro" : "Verificar retiro"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {paso === "monto" ? (
          !tieneCuenta ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
              No tienes una cuenta bancaria registrada. Actualiza tu perfil antes de solicitar un retiro.
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Cuenta de destino</p>
                <p className="font-semibold text-gray-900">{banco}</p>
                <p className="text-sm text-gray-600">{tipoCuenta} — {cuentaBancaria}</p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto a retirar (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">$</span>
                  <input
                    type="number" min={100000} max={saldo} step={1000}
                    value={monto} onChange={(e) => setMonto(e.target.value)}
                    placeholder="100000"
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Disponible: <span className="font-semibold text-green-600">${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span> · Mínimo $100.000
                </p>
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">Cancelar</button>
                <button onClick={solicitar} disabled={!montoValido || enviando}
                  className="flex-1 py-2.5 rounded-xl bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors">
                  {enviando ? "Enviando..." : "Continuar →"}
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl mx-auto mb-3">🔐</div>
              <p className="text-gray-700 text-sm">
                Enviamos un código de <strong>6 dígitos</strong> a tu correo registrado.
                Ingrésalo abajo para confirmar el retiro.
              </p>
              <p className="text-xs text-gray-400 mt-1">Expira en 15 minutos</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Código de verificación</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl font-extrabold tracking-[0.3em] py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B4F8A] transition-colors"
                autoFocus
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => { setPaso("monto"); setCodigo(""); setError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">
                ← Volver
              </button>
              <button onClick={verificar} disabled={codigo.length !== 6 || enviando}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors">
                {enviando ? "Verificando..." : "Confirmar retiro"}
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
  cuentaConfirmada,
  saldoGiftCardActivo,
}: {
  cards: GiftCardItem[];
  onAccion: (id: string, accion: "retirar" | "regalar" | "usar") => void;
  cuentaConfirmada: boolean;
  saldoGiftCardActivo: boolean;
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
          {cuentaConfirmada && saldoGiftCardActivo && (
            <button
              onClick={() => onAccion(gc.id, "retirar")}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors text-left"
            >
              💰 Añadir a saldo
            </button>
          )}
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
  const [confirmando, setConfirmando] = useState(false);

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
    setConfirmando(false);
    if (res.ok) onSuccess();
    else setError(json.mensaje);
  }

  if (confirmando) {
    return (
      <ModalConfirmar
        titulo="Confirmar regalo"
        mensaje={`¿Seguro que deseas regalar esta gift card a ${correo}? Esta acción no se puede deshacer.`}
        textoConfirmar="Sí, regalar"
        cargando={enviando}
        onConfirmar={enviar}
        onCancelar={() => setConfirmando(false)}
      />
    );
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
            onClick={() => setConfirmando(true)}
            disabled={!correo || enviando}
            className="flex-1 py-2.5 rounded-xl bg-[#102463] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm"
          >
            Regalar
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
  comprasPropias: number;
  mpgc: number;
}

function SeccionReferidos({ cuentaConfirmada }: { cuentaConfirmada: boolean }) {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosReferidosAPI | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQR, setMostrarQR] = useState(false);
  const [modalRegalar, setModalRegalar] = useState<string | null>(null);
  const [confirmarRetirar, setConfirmarRetirar] = useState<GiftCardItem | null>(null);
  const [confirmarUsar, setConfirmarUsar] = useState<GiftCardItem | null>(null);
  const [retirando, setRetirando] = useState(false);
  const [saldoGiftCardActivo, setSaldoGiftCardActivo] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargarTodo = () => {
    Promise.all([
      fetch("/api/referidos").then((r) => r.ok ? r.json() : null),
      fetch("/api/gift-cards").then((r) => r.ok ? r.json() : null),
      fetch("/api/config").then((r) => r.ok ? r.json() : null),
    ]).then(([ref, gcs, cfg]) => {
      if (ref) setDatos({
        codigoRef: ref.codigoRef ?? null,
        comprados: ref.comprados ?? 0,
        progreso: ref.progreso ?? 0,
        comprasPropias: ref.comprasPropias ?? 0,
        mpgc: ref.mpgc ?? 5,
      });
      if (gcs?.giftCards) setGiftCards(gcs.giftCards);
      if (cfg) setSaldoGiftCardActivo(cfg.saldoGiftCardActivo ?? false);
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

  function manejarAccion(id: string, accion: "retirar" | "regalar" | "usar") {
    if (accion === "regalar") { setModalRegalar(id); return; }
    const gc = giftCards.find((g) => g.id === id) ?? null;
    if (!gc) return;
    if (accion === "usar") { setConfirmarUsar(gc); return; }
    // retirar → añadir a saldo (pide confirmación primero)
    setConfirmarRetirar(gc);
  }

  async function confirmarRetiro() {
    if (!confirmarRetirar) return;
    setRetirando(true);
    const res = await fetch(`/api/gift-cards/${confirmarRetirar.id}/retirar`, { method: "POST" });
    const json = await res.json() as { mensaje: string };
    setRetirando(false);
    setConfirmarRetirar(null);
    mostrarToast(res.ok, json.mensaje);
    if (res.ok) cargarTodo();
  }

  const comprados = datos?.comprados ?? 0;
  const enCiclo = comprados % 5;
  const barPct = (enCiclo / 5) * 100;
  const faltan = enCiclo === 0 ? 5 : 5 - enCiclo;

  const mpgc = datos?.mpgc ?? 5;
  const comprasPropias = datos?.comprasPropias ?? 0;
  const enCicloPropio = comprasPropias % mpgc;
  const barPctPropio = (enCicloPropio / mpgc) * 100;
  const faltanPropias = enCicloPropio === 0 ? mpgc : mpgc - enCicloPropio;

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

      {/* Confirmar añadir gift card al saldo */}
      {confirmarRetirar && (
        <ModalConfirmar
          titulo="Confirmar"
          mensaje={`¿Deseas convertir la gift card ${confirmarRetirar.codigo} ($${confirmarRetirar.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}) en saldo de tu cuenta? Esta acción no se puede deshacer.`}
          textoConfirmar="Sí, añadir a saldo"
          cargando={retirando}
          onConfirmar={confirmarRetiro}
          onCancelar={() => setConfirmarRetirar(null)}
        />
      )}

      {/* Confirmar usar gift card en una membresía */}
      {confirmarUsar && (
        <ModalConfirmar
          titulo="Usar gift card"
          mensaje={`¿Estás seguro que deseas usar la gift card ${confirmarUsar.codigo} ($${confirmarUsar.valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}) en una membresía?`}
          detalle="Al confirmar irás a Membresías para elegir el número donde se aplicará."
          textoConfirmar="Sí, elegir membresía"
          onConfirmar={() => { const id = confirmarUsar.id; setConfirmarUsar(null); router.push("/membresias?giftCard=" + id); }}
          onCancelar={() => setConfirmarUsar(null)}
        />
      )}

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] px-6 py-5">
          <div className="flex flex-col items-center text-center gap-2">
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
            <div className="bg-[#1B4F8A]/5 border border-[#1B4F8A]/15 rounded-xl p-4 flex flex-col items-center text-center">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Tu código de referido
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-3xl font-extrabold tracking-[0.2em] text-[#1B4F8A] font-mono">
                  {datos.codigoRef}
                </span>
                <div className="flex justify-center gap-2 flex-wrap">
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

          {/* Progreso por compras propias — independiente del de amigos */}
          {!cargando && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">{enCicloPropio} de {mpgc} membresías propias</span>
                {comprasPropias > 0 && <span className="text-xs text-gray-400">{comprasPropias} en total</span>}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#1B4F8A] to-[#F5A623] transition-all duration-700"
                  style={{ width: enCicloPropio === 0 && comprasPropias > 0 ? "100%" : `${barPctPropio}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {comprasPropias === 0
                  ? `Por cada ${mpgc} membresías que compres tú mismo, recibes una gift card`
                  : enCicloPropio === 0
                  ? `¡Completaste ${mpgc} membresías propias! Sigue comprando para ganar otra gift card.`
                  : `Te ${faltanPropias === 1 ? "falta 1 membresía" : `faltan ${faltanPropias} membresías`} propias para ganar tu ${Math.floor(comprasPropias / mpgc) + 1 === 1 ? "primera" : "próxima"} gift card`}
              </p>
            </div>
          )}

          {/* Gift cards disponibles */}
          {!cargando && gcDisponibles.length > 0 && (
            <SelectorGiftCards cards={gcDisponibles} onAccion={manejarAccion} cuentaConfirmada={cuentaConfirmada} saldoGiftCardActivo={saldoGiftCardActivo} />
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
  const [reenviando, setReenviando] = useState(false);
  const [mensajeVerify, setMensajeVerify] = useState<{ texto: string; ok: boolean } | null>(null);
  const [codigoVerif, setCodigoVerif] = useState("");
  const [verificando, setVerificando] = useState(false);

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
      .then((c: { precioCaja?: number }) => {
        if (c.precioCaja) setPrecioCaja(c.precioCaja);
      })
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

  async function completarCompra(numero: string, tier: string, giftCardId?: string) {
    setComprando(numero);
    setMensajeCompra(null);
    const res = await fetch(`/api/cajas/${tier}/${numero}/comprar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(giftCardId ? { giftCardId } : {}),
    });
    const json = await res.json() as { mensaje: string };
    setComprando(null);
    setMensajeCompra({ ok: res.ok, texto: json.mensaje });
    if (res.ok) cargarDatos();
  }

  async function liberarReserva(numero: string, tier: string) {
    setComprando(numero);
    const res = await fetch(`/api/cajas/${tier}/${numero}/reservar`, { method: "DELETE" });
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
  const confirmado = datos?.confirmado ?? true; // true = no mostrar banner si aún cargando

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Banner verificación de correo — muy visible a propósito: bloquea compras/retiros */}
        {!confirmado && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-[2px] shadow-md">
            <div className="bg-amber-50 rounded-2xl px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center text-2xl flex-shrink-0">
                📧
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-amber-900 text-base">Verifica tu correo electrónico</p>
                <p className="text-amber-800 text-sm mt-0.5">
                  Todavía no puedes comprar membresías ni solicitar retiros.
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                </p>
                {mensajeVerify && (
                  <p className={`text-xs font-bold mt-2 ${mensajeVerify.ok ? "text-green-700" : "text-red-600"}`}>
                    {mensajeVerify.ok ? "✅ " : "⚠️ "}{mensajeVerify.texto}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={codigoVerif}
                    onChange={(e) => setCodigoVerif(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Código de 6 dígitos"
                    className="w-full sm:w-44 text-center tracking-[0.3em] font-bold text-lg border-2 border-amber-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={async () => {
                      setVerificando(true);
                      setMensajeVerify(null);
                      const res = await fetch("/api/auth/verificar-codigo", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ codigo: codigoVerif }),
                      });
                      const j = await res.json() as { mensaje: string };
                      setMensajeVerify({ texto: j.mensaje, ok: res.ok });
                      setVerificando(false);
                      if (res.ok) { setCodigoVerif(""); cargarDatos(); }
                    }}
                    disabled={verificando || codigoVerif.length !== 6}
                    className="flex-shrink-0 bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:opacity-40 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    {verificando ? "Verificando..." : "Verificar código"}
                  </button>
                  <button
                    onClick={async () => {
                      setReenviando(true);
                      setMensajeVerify(null);
                      const res = await fetch("/api/auth/reenviar-verificacion", { method: "POST" });
                      const j = await res.json() as { mensaje: string };
                      setMensajeVerify({ texto: j.mensaje, ok: res.ok });
                      setReenviando(false);
                    }}
                    disabled={reenviando}
                    className="flex-shrink-0 text-amber-800 hover:text-amber-900 underline disabled:opacity-50 font-semibold text-xs px-2 py-2.5 transition-colors"
                  >
                    {reenviando ? "Enviando..." : "Reenviar código"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Bienvenida */}
          <div
            className="rounded-3xl p-6 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #102463 0%, #173592 60%, #0a1845 100%)" }}
          >
            {/* Brillo dorado decorativo */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(255,189,31,0.25) 0%, transparent 70%)" }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Bienvenido de vuelta</p>
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Hola, {nombre} 👋</h1>
              </div>
              <Link
                href="/dashboard/perfil"
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl text-[#102463] font-extrabold text-[11px] transition-transform hover:scale-105"
                style={{ background: "#ffbd1f", boxShadow: "0 4px 14px rgba(255,189,31,0.4)" }}
              >
                <span className="text-xl leading-none">✏️</span>
                <span>Perfil</span>
              </Link>
            </div>
          </div>

          {/* Saldo + retiro */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4 transition-all"
            style={
              saldo >= 100_000
                ? { background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "0 4px 20px rgba(22,163,74,0.28)" }
                : { background: "white", border: "1px solid #e5e7eb" }
            }
          >
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${saldo >= 100_000 ? "text-green-200" : "text-gray-400"}`}>
                Saldo disponible
              </p>
              <p className={`text-3xl font-extrabold leading-none ${saldo >= 100_000 ? "text-white" : "text-green-600"}`}>
                ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                <span className={`text-sm font-medium ml-1 ${saldo >= 100_000 ? "text-green-200" : "text-gray-400"}`}>COP</span>
              </p>
              {saldo < 100_000 && (
                <p className="text-xs text-gray-400 mt-1">Mínimo $100.000 para retirar</p>
              )}
            </div>
            {saldo >= 100_000 && (
              <button
                onClick={() => setModalRetiro(true)}
                className="flex-shrink-0 bg-white text-green-700 font-extrabold text-sm px-5 py-3 rounded-xl shadow hover:bg-green-50 active:scale-95 transition-all whitespace-nowrap"
              >
                💸 Solicitar retiro
              </button>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: "/membresias",     icon: "🎟️", label: "Membresías",     color: "#102463" },
              { href: "/ranking",        icon: "🏆",  label: "Ranking",        color: "#7c3aed" },
              { href: "/probabilidades", icon: "📊",  label: "Probabilidades", color: "#d97706" },
            ].map(({ href, icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-2xl py-3 px-2 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center gap-1 text-center"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-bold text-gray-700">{label}</span>
              </Link>
            ))}
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
          {reservadasActivas.length > 0 && (() => {
            return (
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
                      saldo={saldo}
                      giftCardsDisponibles={giftCardsDisponibles}
                      onComprar={completarCompra}
                      onLiberar={liberarReserva}
                      comprando={comprando === caja.numero}
                    />
                  ))}
                </div>
              </section>
            );
          })()}

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
                href="/membresias"
                className="inline-block bg-[#F5A623] hover:bg-yellow-400 text-[#1B4F8A] font-bold px-7 py-3 rounded-xl transition-colors shadow-md"
              >
                Ir a las membresías
              </Link>
            </div>
          )}

          {/* Mensaje motivacional 10+ cajas */}
          {cajas.length >= 10 && (
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-5 text-white">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="font-extrabold text-lg">¡Eres VIP!</p>
                  <p className="text-purple-200 text-sm">Con 10+ membresías participas en eventos exclusivos del club para grandes miembros.</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de referidos */}
          <SeccionReferidos cuentaConfirmada={confirmado} />

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
                  href="/membresias"
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
                {premios.map((p, i) => {
                  const esMembresiaDevuelta = p.categoria === "UNA_CIFRA" && !p.monto;
                  return (
                    <div key={i} className={`border rounded-xl p-4 flex items-center gap-4 ${
                      esMembresiaDevuelta
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}>
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
                        {esMembresiaDevuelta ? (
                          <p className="text-green-700 font-extrabold text-base">
                            🎫 Membresía gratis (gift card)
                          </p>
                        ) : (
                          <p className="text-[#F5A623] font-extrabold text-lg">
                            ${p.monto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                          </p>
                        )}
                        {!esMembresiaDevuelta && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          }`}>
                            {p.pagado ? "Pagado" : "Pendiente de pago"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
