"use client";

import { useEffect, useRef, useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────

interface ConfettiItem {
  id: number;
  left: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  dur: number;
  rot: number;
}

// ── Confetti ──────────────────────────────────────────────────────────────

function mkConfetti(): ConfettiItem[] {
  const cols = [
    "#F5A623", "#FFD700", "#ffffff", "#1B4F8A",
    "#4fc3f7", "#ef5350", "#66bb6a", "#ce93d8", "#ff8a65",
  ];
  return Array.from({ length: 110 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: cols[i % cols.length],
    w: Math.random() * 12 + 6,
    h: Math.random() * 7 + 4,
    delay: Math.random() * 2.2,
    dur: Math.random() * 2.5 + 2.8,
    rot: Math.random() * 720,
  }));
}

// ── Slot individual ───────────────────────────────────────────────────────

interface SlotProps {
  digit: string;
  animKey: number;
  stopped: boolean;
  shaking: boolean;
  label: string;
}

function Slot({ digit, animKey, stopped, shaking, label }: SlotProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      {/* Etiqueta de cifra */}
      <span style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: stopped ? "#F5A623" : "#243d5c",
        transition: "color 0.4s",
      }}>
        {label}
      </span>

      {/* Caja del slot */}
      <div style={{
        position: "relative",
        width: "82px",
        height: "102px",
        borderRadius: "14px",
        background: stopped
          ? "linear-gradient(180deg,#0e1e0e,#07120a)"
          : "linear-gradient(180deg,#0b1929,#050d18)",
        border: `2px solid ${stopped ? "#F5A623" : shaking ? "#F5A623" : "#122035"}`,
        boxShadow: stopped
          ? "0 0 32px rgba(245,166,35,0.7), 0 0 12px rgba(245,166,35,0.3), inset 0 0 24px rgba(245,166,35,0.07)"
          : shaking
          ? "0 0 50px rgba(245,166,35,0.95)"
          : "0 4px 20px rgba(0,0,0,0.8)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border 0.15s, box-shadow 0.25s, background 0.4s",
        animation: shaking ? "slotShake 0.45s ease-out" : "none",
      }}>
        {/* Sombra superior (efecto profundidad) */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "32px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.92), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />
        {/* Sombra inferior */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "32px",
          background: "linear-gradient(to top, rgba(0,0,0,0.92), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />
        {/* Línea central */}
        <div style={{
          position: "absolute", left: "8px", right: "8px",
          top: "calc(50% - 1px)", height: "2px",
          background: stopped ? "rgba(245,166,35,0.25)" : "rgba(18,32,53,0.8)",
          zIndex: 1, transition: "background 0.4s",
        }} />

        {/* El dígito — key cambia en cada actualización para re-triggerear la animación */}
        <span
          key={animKey}
          style={{
            fontSize: "66px",
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "'Courier New', Courier, monospace",
            color: stopped ? "#F5A623" : "#d4e4f4",
            textShadow: stopped
              ? "0 0 30px rgba(245,166,35,0.95), 0 0 60px rgba(245,166,35,0.45), 0 2px 6px rgba(0,0,0,0.9)"
              : "0 0 6px rgba(212,228,244,0.25), 0 2px 6px rgba(0,0,0,0.9)",
            zIndex: 3,
            position: "relative",
            display: "block",
            animation: stopped
              ? "landDigit 0.38s cubic-bezier(0.2,1.4,0.5,1)"
              : "spinDigit 0.09s ease-out",
            transition: "color 0.35s, text-shadow 0.4s",
          }}
        >
          {digit}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

interface Props {
  numeroGanador: string; // exactamente 4 dígitos "0000"-"9999"
  activo: boolean;
  onTerminado?: () => void;
}

const LABELS = ["Millares", "Centenas", "Decenas", "Unidades"];

export default function RuletaSorteo({ numeroGanador, activo, onTerminado }: Props) {
  const [digits,  setDigits]  = useState(["?", "?", "?", "?"]);
  const [keys,    setKeys]    = useState([0, 0, 0, 0]);
  const [stopped, setStopped] = useState([false, false, false, false]);
  const [shaking, setShaking] = useState([false, false, false, false]);
  const [done,    setDone]    = useState(false);
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive  = useRef(true);

  // Limpiar en unmount
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  // Arrancar animación cuando activo cambia a true
  useEffect(() => {
    if (!activo || numeroGanador.length !== 4) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Reset
    setDigits(["?", "?", "?", "?"]);
    setKeys([0, 0, 0, 0]);
    setStopped([false, false, false, false]);
    setShaking([false, false, false, false]);
    setDone(false);
    setConfetti([]);

    const targets = numeroGanador.split("");
    // Cada cifra se detiene 1.1 s después de la anterior
    const stopMs = [2100, 3200, 4300, 5400];

    function add(fn: () => void, ms: number) {
      const t = setTimeout(() => { if (alive.current) fn(); }, ms);
      timers.current.push(t);
      return t;
    }

    targets.forEach((target, si) => {
      const baseDelay = si * 130; // arranque escalonado

      function tick() {
        if (!alive.current) return;
        const rem = baseDelay + stopMs[si] - (Date.now() - t0);

        if (rem <= 55) {
          // Aterrizar en el dígito objetivo
          setDigits(p  => { const n = [...p]; n[si] = target; return n; });
          setKeys(p    => { const n = [...p]; n[si]++;         return n; });
          setStopped(p => { const n = [...p]; n[si] = true;    return n; });
          setShaking(p => { const n = [...p]; n[si] = true;    return n; });
          add(() => setShaking(p => { const n = [...p]; n[si] = false; return n; }), 520);
          return;
        }

        // Velocidad progresivamente más lenta conforme se acerca el final
        const iv =
          rem > 1500 ? 55  :
          rem >  950 ? 88  :
          rem >  540 ? 135 :
          rem >  270 ? 195 : 275;

        const d = String(Math.floor(Math.random() * 10));
        setDigits(p => { const n = [...p]; n[si] = d;  return n; });
        setKeys(p   => { const n = [...p]; n[si]++;     return n; });

        const t = setTimeout(tick, iv);
        timers.current.push(t);
      }

      const t0 = Date.now();
      const t = setTimeout(tick, baseDelay);
      timers.current.push(t);
    });

    // Celebración al finalizar la última cifra
    add(() => {
      setDone(true);
      setConfetti(mkConfetti());
      onTerminado?.();
    }, stopMs[3] + 520);

    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [activo, numeroGanador]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: "relative",
      borderRadius: "24px",
      overflow: "hidden",
      background: "linear-gradient(145deg, #04070e 0%, #0b1929 55%, #04070e 100%)",
      padding: "36px 20px 44px",
      minHeight: "300px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      userSelect: "none",
    }}>
      {/* Luz ambiental decorativa */}
      <div style={{ position:"absolute",top:"-40px",left:"-40px",width:"180px",height:"180px",
        background:"radial-gradient(circle,rgba(245,166,35,0.12) 0%,transparent 70%)",
        pointerEvents:"none" }} />
      <div style={{ position:"absolute",top:"-40px",right:"-40px",width:"180px",height:"180px",
        background:"radial-gradient(circle,rgba(27,79,138,0.25) 0%,transparent 70%)",
        pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"-10px",left:"50%",transform:"translateX(-50%)",
        width:"70%",height:"50px",
        background:"radial-gradient(ellipse,rgba(245,166,35,0.08) 0%,transparent 70%)",
        pointerEvents:"none" }} />

      {/* Cabecera */}
      <div style={{ textAlign:"center", marginBottom:"28px", zIndex:1 }}>
        <p style={{
          color: "#F5A623",
          fontWeight: 900,
          fontSize: "14px",
          letterSpacing: "4px",
          textTransform: "uppercase",
          marginBottom: "6px",
          textShadow: "0 0 20px rgba(245,166,35,0.65)",
        }}>
          ✨ Cajas Sorpresa 10K ✨
        </p>
        <p style={{
          color: done ? "#F5A623" : activo ? "#4a90d9" : "#243d5c",
          fontSize: "13px",
          fontWeight: 500,
          transition: "color 0.5s",
          minHeight: "20px",
        }}>
          {done
            ? "¡Número ganador seleccionado!"
            : activo
            ? "Seleccionando número ganador..."
            : "Iniciando..."}
        </p>
      </div>

      {/* Los 4 slots */}
      <div style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "28px",
        zIndex: 1,
        flexWrap: "wrap",
      }}>
        {digits.map((d, i) => (
          <Slot
            key={i}
            digit={d}
            animKey={keys[i]}
            stopped={stopped[i]}
            shaking={shaking[i]}
            label={LABELS[i]}
          />
        ))}
      </div>

      {/* Reveal del número completo */}
      {done && (
        <div style={{
          textAlign: "center",
          zIndex: 1,
          animation: "revealNumber 0.65s cubic-bezier(0.175,0.885,0.32,1.275)",
        }}>
          <div style={{
            fontSize: "clamp(50px, 11vw, 86px)",
            fontWeight: 900,
            color: "#F5A623",
            fontFamily: "'Courier New', Courier, monospace",
            letterSpacing: "0.22em",
            textShadow: "0 0 60px rgba(245,166,35,0.95), 0 0 120px rgba(245,166,35,0.4), 0 4px 12px rgba(0,0,0,0.9)",
            lineHeight: 1,
          }}>
            {numeroGanador}
          </div>
          <p style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "17px",
            letterSpacing: "3px",
            marginTop: "14px",
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}>
            🏆 NÚMERO GANADOR 🏆
          </p>
        </div>
      )}

      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          top: "-12px",
          width: `${p.w}px`,
          height: `${p.h}px`,
          backgroundColor: p.color,
          borderRadius: "2px",
          transform: `rotate(${p.rot}deg)`,
          animation: `fallConfetti ${p.dur}s ease-in ${p.delay}s both`,
          pointerEvents: "none",
          zIndex: 20,
        }} />
      ))}

      {/* Keyframes */}
      <style>{`
        @keyframes spinDigit {
          from { transform: translateY(-65%) scaleY(0.5); opacity: 0.2; }
          to   { transform: translateY(0)    scaleY(1);   opacity: 1;   }
        }
        @keyframes landDigit {
          0%   { transform: scale(1.65) translateY(-10%); opacity: 0.5; }
          55%  { transform: scale(0.87); }
          78%  { transform: scale(1.05); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes slotShake {
          0%,100% { transform: translateX(0)   rotate(0deg);   }
          14%     { transform: translateX(-7px) rotate(-1.5deg); }
          28%     { transform: translateX(7px)  rotate(1.5deg);  }
          42%     { transform: translateX(-5px) rotate(-1deg);  }
          56%     { transform: translateX(5px)  rotate(1deg);   }
          70%     { transform: translateX(-3px);                }
          84%     { transform: translateX(3px);                 }
        }
        @keyframes revealNumber {
          from { transform: scale(0.2) translateY(30px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        @keyframes fallConfetti {
          0%   { transform: translateY(0)    rotate(0deg)   scaleX(1);  opacity: 1; }
          50%  { transform: translateY(380px) rotate(400deg) scaleX(-1); opacity: 1; }
          100% { transform: translateY(800px) rotate(800deg) scaleX(1);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}
