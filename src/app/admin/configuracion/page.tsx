"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SubirImagen from "@/components/SubirImagen";
import ModalConfirmar from "@/components/ModalConfirmar";

interface Config {
  precioCaja:            number;
  margenGanancia:        number;
  pct4Cifras:            number;
  pct3Cifras:            number;
  pct2Cifras:            number;
  pct1Cifra:             number;
  ganadores4Cifras:      number;
  membresiasPorGiftCard: number;
  giftCardActivo:        boolean;
  tiendaActiva:          boolean;
  fechaSorteo:           string | null;
  qrPagoUrl:             string | null;
  brebKey:               string | null;
  datosBancarios:        string | null;
  linkPagoBoldUrl:       string | null;
  saldoGiftCardActivo:   boolean;
}

function pct(v: number) { return +(v * 100).toFixed(2); }
function dec(v: number) { return +(v / 100); }

export default function PaginaConfiguracion() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const rol = (session?.user as unknown as { rol?: string } | undefined)?.rol;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && rol !== "ADMIN") router.push("/dashboard");
  }, [status, rol, router]);

  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje,   setMensaje]   = useState<{ ok: boolean; texto: string } | null>(null);

  // Porcentajes en UI (0-100)
  const [precioCaja,  setPrecioCaja]  = useState(10000);
  const [margen,      setMargen]      = useState(30);
  const [pct4,        setPct4]        = useState(20);
  const [pct3,        setPct3]        = useState(10);
  const [pct2,        setPct2]        = useState(15);
  const [pct1,        setPct1]        = useState(25);
  const [n4,          setN4]          = useState(4);
  const [mpgc,          setMpgc]          = useState(5);
  const [gcActivo,      setGcActivo]      = useState(true);
  const [tiendaActiva,  setTiendaActiva]  = useState(true);
  const [saldoGcActivo, setSaldoGcActivo] = useState(false);
  const [confirmarToggle, setConfirmarToggle] = useState<{
    campo: "gc" | "tienda" | "saldoGc";
    activar: boolean;
    titulo: string;
    mensaje: string;
  } | null>(null);
  const [fechaSorteo,   setFechaSorteo]   = useState("");
  const [qrPagoUrl,     setQrPagoUrl]     = useState("");
  const [brebKey,       setBrebKey]       = useState("");
  const [datosBancarios, setDatosBancarios] = useState("");
  const [linkPagoBoldUrl, setLinkPagoBoldUrl] = useState("");

  // Validaciones en tiempo real
  const sumaPremios = pct4 + pct3 + pct2 + pct1;
  const sumaTotal   = margen + sumaPremios;
  const sumaOk      = Math.abs(sumaTotal - 100) < 0.1;
  const n4Ok        = Number.isInteger(n4) && n4 >= 1 && n4 <= 4;
  const mpgcOk      = Number.isInteger(mpgc) && mpgc >= 1 && mpgc <= 100;

  const [vendidasTotal, setVendidasTotal] = useState<number | null>(null);

  function ganadoresRecomendados(vendidas: number): number {
    if (vendidas <= 2500) return 1;
    if (vendidas <= 5000) return 2;
    if (vendidas <= 7500) return 3;
    return 4;
  }

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((c: Config) => {
        setPrecioCaja(c.precioCaja);
        setMargen(pct(c.margenGanancia));
        setPct4(pct(c.pct4Cifras));
        setPct3(pct(c.pct3Cifras));
        setPct2(pct(c.pct2Cifras));
        setPct1(pct(c.pct1Cifra ?? 0.25));
        setN4(c.ganadores4Cifras ?? 4);
        setMpgc(c.membresiasPorGiftCard ?? 5);
        setGcActivo(c.giftCardActivo ?? true);
        setTiendaActiva(c.tiendaActiva ?? true);
        setSaldoGcActivo(c.saldoGiftCardActivo ?? false);
        setFechaSorteo(
          c.fechaSorteo ? new Date(c.fechaSorteo).toISOString().slice(0, 16) : ""
        );
        setQrPagoUrl(c.qrPagoUrl ?? "");
        setBrebKey(c.brebKey ?? "");
        setDatosBancarios(c.datosBancarios ?? "");
        setLinkPagoBoldUrl(c.linkPagoBoldUrl ?? "");
      })
      .finally(() => setCargando(false));

    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { vendidasTotal?: number }) => setVendidasTotal(c.vendidasTotal ?? 0))
      .catch(() => undefined);
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sumaOk || !n4Ok || !mpgcOk) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precioCaja,
          margenGanancia:        dec(margen),
          pct4Cifras:            dec(pct4),
          pct3Cifras:            dec(pct3),
          pct2Cifras:            dec(pct2),
          pct1Cifra:             dec(pct1),
          ganadores4Cifras:      n4,
          membresiasPorGiftCard: mpgc,
          giftCardActivo:        gcActivo,
          tiendaActiva:          tiendaActiva,
          saldoGiftCardActivo:   saldoGcActivo,
          fechaSorteo:           fechaSorteo || null,
          qrPagoUrl:             qrPagoUrl || "",
          brebKey:               brebKey || "",
          datosBancarios:        datosBancarios || "",
          linkPagoBoldUrl:       linkPagoBoldUrl || "",
        }),
      });
      const json = await res.json() as { mensaje: string };
      setMensaje({ ok: res.ok, texto: res.ok ? "¡Configuración guardada!" : json.mensaje });
      if (res.ok) setTimeout(() => setMensaje(null), 3000);
    } catch {
      setMensaje({ ok: false, texto: "Error de conexión. Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  function pedirConfirmacionToggle(
    campo: "gc" | "tienda" | "saldoGc",
    estadoActual: boolean,
    nombreOpcion: string
  ) {
    const activar = !estadoActual;
    setConfirmarToggle({
      campo,
      activar,
      titulo: activar ? "Activar opción" : "Desactivar opción",
      mensaje: `¿Seguro que deseas ${activar ? "activar" : "desactivar"} la opción de ${nombreOpcion}? Recuerda que el cambio se aplica al guardar la configuración.`,
    });
  }

  function confirmarToggleAccion() {
    if (!confirmarToggle) return;
    const { campo, activar } = confirmarToggle;
    if (campo === "gc") setGcActivo(activar);
    if (campo === "tienda") setTiendaActiva(activar);
    if (campo === "saldoGc") setSaldoGcActivo(activar);
    setConfirmarToggle(null);
  }

  if (status === "loading" || cargando) return null;

  const fondoPremiosPct = Math.max(0, 100 - margen);

  const slidersPremios = [
    { label: "Premio 4 cifras exactas 🏆", value: pct4, set: setPct4, color: "bg-yellow-400" },
    { label: "Premio 3 últimas cifras 🥈",  value: pct3, set: setPct3, color: "bg-gray-400"   },
    { label: "Premio 2 últimas cifras 🥉",  value: pct2, set: setPct2, color: "bg-amber-600"  },
    { label: "Premio 1 cifra 🎫", value: pct1, set: setPct1, color: "bg-blue-400" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {confirmarToggle && (
        <ModalConfirmar
          titulo={confirmarToggle.titulo}
          mensaje={confirmarToggle.mensaje}
          textoConfirmar={confirmarToggle.activar ? "Sí, activar" : "Sí, desactivar"}
          onConfirmar={confirmarToggleAccion}
          onCancelar={() => setConfirmarToggle(null)}
        />
      )}

      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Encabezado */}
          <div className="bg-gradient-to-r from-[#1B4F8A] to-[#1a5fa8] rounded-2xl p-6 text-white mb-6">
            <h1 className="text-2xl font-extrabold mb-0.5">Configuración</h1>
            <p className="text-blue-200 text-sm">Ajusta los parámetros de la selección aleatoria</p>
          </div>

          <form onSubmit={guardar} className="space-y-5">

            {/* ── Precio por caja ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">Precio por membresía</h2>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">$</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={precioCaja}
                  onChange={(e) => setPrecioCaja(Number(e.target.value))}
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Recaudo estimado (10.000 membresías):{" "}
                <strong>${(precioCaja * 10000).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP</strong>
              </p>
            </div>

            {/* ── Ganadores de 4 cifras ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Cantidad de ganadores de 4 cifras</h2>
              <p className="text-xs text-gray-400 mb-4">
                Se ejecutarán este número de selecciones. La última determina también los ganadores de 3, 2 y 1 cifra.
              </p>

              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={n4}
                  onChange={(e) => setN4(Math.round(Number(e.target.value)))}
                  className={`w-28 text-center text-3xl font-extrabold tracking-widest border-2 rounded-xl py-3 focus:outline-none focus:ring-2 transition-colors ${
                    n4Ok
                      ? "border-[#1B4F8A]/40 text-[#1B4F8A] focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                      : "border-red-300 text-red-600 focus:ring-red-200"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {n4Ok ? `${n4} selecci${n4 !== 1 ? "ones" : "ón"} de 4 cifras` : "Debe ser entre 1 y 4"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Distribución 2:1 — gran ganador recibe el doble que los previos
                  </p>
                </div>
              </div>

              {/* Advertencia: los ganadores deben ser proporcionales a las membresías vendidas */}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <p className="font-bold mb-1.5">⚠️ La cantidad de ganadores debe ir acorde a las membresías vendidas</p>
                <p className="text-amber-700 mb-2">
                  Para garantizar que haya membresías suficientes vendidas y así diversificar el premio mayor:
                </p>
                <ul className="space-y-0.5 text-amber-700">
                  <li>De 1 a 2.500 membresías vendidas → <strong>1 ganador</strong></li>
                  <li>De 2.501 a 5.000 → <strong>2 ganadores</strong></li>
                  <li>De 5.001 a 7.500 → <strong>3 ganadores</strong></li>
                  <li>De 7.501 a 10.000 → <strong>4 ganadores</strong></li>
                </ul>
                {vendidasTotal !== null && (
                  <p className="mt-2.5 pt-2.5 border-t border-amber-200 font-semibold">
                    Ahora mismo hay <strong>{vendidasTotal.toLocaleString("es-CO")}</strong> membresías vendidas
                    → recomendado: <strong>{ganadoresRecomendados(vendidasTotal)} ganador{ganadoresRecomendados(vendidasTotal) !== 1 ? "es" : ""}</strong>.
                    {n4Ok && n4 !== ganadoresRecomendados(vendidasTotal) && (
                      <span className="block mt-1 text-red-700">
                        Tienes {n4} configurado{n4 !== 1 ? "s" : ""} — no coincide con lo recomendado para el volumen actual de ventas.
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Mini preview de las selecciones con montos ponderados */}
              {n4Ok && (() => {
                const fondo4 = precioCaja * 10000 * dec(pct4);
                const montoEarly = n4 > 1 ? fondo4 / (n4 + 1)       : fondo4;
                const montoLast  = n4 > 1 ? (2 * fondo4) / (n4 + 1) : fondo4;
                return (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: Math.min(n4, 4) }, (_, i) => {
                      const esUltimo = i === n4 - 1;
                      const monto = esUltimo ? montoLast : montoEarly;
                      return (
                        <div
                          key={i}
                          className={`flex flex-col px-3 py-2 rounded-xl text-xs font-bold border ${
                            esUltimo
                              ? "bg-[#F5A623]/15 border-[#F5A623]/50 text-[#b87b00]"
                              : "bg-[#1B4F8A]/8 border-[#1B4F8A]/20 text-[#1B4F8A]"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span>{esUltimo ? "🏆" : "🎯"}</span>
                            Selección {i + 1}{esUltimo && " (gran ganador)"}
                          </span>
                          <span className={`mt-0.5 text-[11px] font-extrabold ${esUltimo ? "text-[#b87b00]" : "text-[#1B4F8A]"}`}>
                            ${Math.round(monto).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* ── Membresías por gift card ──────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Membresías por gift card</h2>
              <p className="text-xs text-gray-400 mb-4">
                Cada vez que tus referidos acumulen esta cantidad de membresías compradas, recibes una gift card automática.
                También aplica a tus propias compras: si tú mismo acumulas esta cantidad de membresías, también recibes una.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={mpgc}
                  onChange={(e) => setMpgc(Math.max(1, Math.round(Number(e.target.value))))}
                  className="w-28 text-center text-3xl font-extrabold tracking-widest border-2 rounded-xl py-3 border-[#1B4F8A]/40 text-[#1B4F8A] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    1 gift card cada <span className="text-[#1B4F8A]">{mpgc}</span> membresía{mpgc !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ejemplo: si tus referidos compran 20 membresías → <strong>{Math.floor(20 / mpgc)} gift card{Math.floor(20 / mpgc) !== 1 ? "s" : ""}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Activar / desactivar gift cards ──────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-800">Sistema de gift cards</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {gcActivo
                      ? "Activo — los referidos acumulan membresías y el sistema emite gift cards automáticamente."
                      : "Inactivo — no se generarán nuevas gift cards por referidos aunque se alcance el umbral."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pedirConfirmacionToggle("gc", gcActivo, "el sistema de gift cards")}
                  className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                    gcActivo ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      gcActivo ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {!gcActivo && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium">
                  ⚠️ Las gift cards existentes siguen vigentes. Solo se pausan las nuevas emisiones automáticas.
                </div>
              )}
            </div>

            {/* ── Activar / desactivar gift card → saldo ──────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-800">Añadir gift cards al saldo</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {saldoGcActivo
                      ? "Activo — usuarios con correo verificado pueden convertir sus gift cards en saldo de cuenta."
                      : "Inactivo — la opción \"Añadir a saldo\" está oculta para todos los usuarios."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pedirConfirmacionToggle("saldoGc", saldoGcActivo, "añadir gift cards al saldo")}
                  className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                    saldoGcActivo ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      saldoGcActivo ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {!saldoGcActivo && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium">
                  ⚠️ Deshabilitada por defecto. Solo usuarios con correo verificado podrán usarla al activarla.
                </div>
              )}
            </div>

            {/* ── Activar / desactivar tienda de bonos ─────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-800">Tienda de bonos</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tiendaActiva
                      ? "Activa — visible y accesible para todos los usuarios."
                      : "Inactiva — el botón queda visible con etiqueta \"Próximamente\" y la página /tienda no se puede usar."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pedirConfirmacionToggle("tienda", tiendaActiva, "la tienda de bonos")}
                  className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                    tiendaActiva ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      tiendaActiva ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {!tiendaActiva && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium">
                  ⚠️ Ideal para pre-lanzamiento: el catálogo y las compras quedan bloqueados hasta que la actives.
                </div>
              )}
            </div>

            {/* ── Distribución del recaudo ──────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Distribución del recaudo</h2>
              <p className="text-xs text-gray-400 mb-5">
                Margen de operación + suma de premios = 100%
              </p>

              {/* Margen */}
              <div className="mb-6 pb-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700">Margen de operación</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={100} step={0.1} value={margen}
                      onChange={(e) => setMargen(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                    />
                    <span className="text-sm text-gray-500 w-4">%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(margen, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Fondo de premios disponible:{" "}
                  <strong className="text-[#1B4F8A]">{fondoPremiosPct.toFixed(1)}%</strong>
                </p>
              </div>

              {/* Premios */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Distribución de premios</p>
                {slidersPremios.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={100} step={0.1} value={item.value}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30"
                        />
                        <span className="text-sm text-gray-500 w-4">%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                    </div>
                    {item.label.includes("1 cifra") && (
                      <p className={`text-xs mt-1.5 rounded-lg px-3 py-2 font-medium ${
                        item.value === 0
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {item.value === 0
                          ? "🎫 En 0% el ganador de 1 cifra recibe una membresía de regalo (gift card), no dinero."
                          : `⚠️ Con ${item.value}% el ganador de 1 cifra recibe dinero en su saldo en vez de una membresía de regalo. Vuelve a 0% para regresar a la membresía de regalo.`}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Indicador de suma */}
              <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
                sumaOk
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <div>
                  <span>Suma premios: <strong>{sumaPremios.toFixed(1)}%</strong></span>
                  <span className="mx-2 opacity-40">|</span>
                  <span>Total: <strong>{sumaTotal.toFixed(1)}%</strong></span>
                </div>
                <span className="text-xs">{sumaOk ? "✅ Válido" : "❌ Debe ser 100%"}</span>
              </div>

              {/* Barra visual completa */}
              <div className="mt-3 w-full h-3 rounded-full overflow-hidden flex">
                {[
                  { value: margen, color: "bg-purple-400" },
                  { value: pct4,   color: "bg-yellow-400" },
                  { value: pct3,   color: "bg-gray-400"   },
                  { value: pct2,   color: "bg-amber-600"  },
                  { value: pct1,   color: "bg-blue-400"   },
                ].map((s, i) => (
                  <div key={i} className={`${s.color} h-full transition-all`} style={{ width: `${Math.max(0, s.value)}%` }} />
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400 mr-1" />Operación {margen.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 mr-1" />4 cifras {pct4.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-400 mr-1" />3 cifras {pct3.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-600 mr-1" />2 cifras {pct2.toFixed(1)}%</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 mr-1" />1 cifra {pct1.toFixed(1)}% {pct1 === 0 ? "(membresía)" : "(dinero)"}</span>
              </div>

              {/* Ejemplo con precios reales */}
              {(() => {
                const total = precioCaja * 10000;
                const fondo4ej = total * dec(pct4);
                const n = Math.max(n4Ok ? n4 : 1, 1);
                const ejEarly = n > 1 ? Math.round(fondo4ej / (n + 1))       : Math.round(fondo4ej);
                const ejLast  = n > 1 ? Math.round((2 * fondo4ej) / (n + 1)) : Math.round(fondo4ej);
                const fmt = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 0 });
                return (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700 mb-2">Ejemplo con 10.000 membresías vendidas a ${fmt(precioCaja)}:</p>
                    {n > 1 && <p>🎯 Selecciones previas de 4 cifras ({n - 1} ganadores): <strong>${fmt(ejEarly)}</strong> c/u</p>}
                    <p>🏆 Gran ganador (4 cifras, selección {n}): <strong>${fmt(ejLast)}</strong></p>
                    <p>🥈 Premio 3 cifras: <strong>hasta ${Math.round(total * dec(pct3) / 9).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                    <p>🥉 Premio 2 cifras: <strong>hasta ${Math.round(total * dec(pct2) / 90).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                    {pct1 === 0 ? (
                      <p>🎫 1 cifra → devuelve membresía: <strong>gift card ${fmt(precioCaja)}</strong> c/u (segunda oportunidad)</p>
                    ) : (
                      <p>🎫 1 cifra → premio en dinero: <strong>hasta ${Math.round(total * dec(pct1) / 10).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong> c/u</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Fecha de la selección aleatoria ──────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">Fecha y hora de la selección aleatoria</h2>
              <input
                type="datetime-local"
                value={fechaSorteo}
                onChange={(e) => setFechaSorteo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Se mostrará en la página de inicio y en la tienda. Deja vacío para no mostrar fecha.
              </p>
            </div>

            {/* ── Link de pago con tarjeta (Bold) ─────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Pago con tarjeta (link de Bold)</h2>
              <p className="text-xs text-gray-400 mb-5">
                Link de pago creado manualmente desde tu panel de Bold (panel.bold.co). Monto fijo — si cambias el
                precio de la membresía, crea un nuevo link en Bold por ese valor y actualízalo aquí.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL del link de pago Bold</label>
                <input
                  type="text"
                  value={linkPagoBoldUrl}
                  onChange={(e) => setLinkPagoBoldUrl(e.target.value)}
                  placeholder="https://checkout.bold.co/payment/LNK_XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                />
                <p className="text-xs text-gray-400 mt-1">Déjalo vacío para ocultar la opción de pago con tarjeta.</p>
              </div>
            </div>

            {/* ── Datos de pago por transferencia ──────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1">Pago por transferencia (Bre-b / QR)</h2>
              <p className="text-xs text-gray-400 mb-5">
                Estos datos se muestran al usuario cuando elige pagar con transferencia bancaria.
              </p>

              <div className="space-y-4">
                <SubirImagen
                  tipo="qr"
                  urlActual={qrPagoUrl || undefined}
                  onSubida={(url) => setQrPagoUrl(url)}
                  label="Código QR de pago"
                  placeholder="Haz clic para subir el QR de tu banco (PNG, JPG)"
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Llave / número Bre-b o Nequi</label>
                  <input
                    type="text"
                    value={brebKey}
                    onChange={(e) => setBrebKey(e.target.value)}
                    placeholder="Ej: 3001234567 o clave@banco.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Datos bancarios adicionales</label>
                  <textarea
                    value={datosBancarios}
                    onChange={(e) => setDatosBancarios(e.target.value)}
                    rows={3}
                    placeholder={"Banco: Banco de Bogotá\nCuenta de ahorros: 123-456789-0\nNIT: 900.123.456-7"}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Se muestra tal cual en la página de pago. Puedes incluir banco, número de cuenta, titular, etc.</p>
                </div>
              </div>
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
                mensaje.ok
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <span>{mensaje.ok ? "✅ " : "❌ "}{mensaje.texto}</span>
                <button onClick={() => setMensaje(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
              </div>
            )}

            <button
              type="submit"
              disabled={guardando || !sumaOk || !n4Ok || !mpgcOk}
              className="w-full bg-[#1B4F8A] hover:bg-[#1a5fa8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md text-base"
            >
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </form>

        </div>
      </main>
      <Footer />
    </div>
  );
}

function n4ok(n: number) { return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1; }
