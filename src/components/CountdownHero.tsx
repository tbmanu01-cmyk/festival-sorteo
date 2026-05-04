"use client";

import { useState, useEffect, useCallback } from "react";

export default function CountdownHero({ fecha }: { fecha: string }) {
  const calcMs = useCallback(() => Math.max(0, new Date(fecha).getTime() - Date.now()), [fecha]);
  const [ms, setMs] = useState(calcMs);

  useEffect(() => {
    setMs(calcMs());
    const t = setInterval(() => {
      const r = calcMs();
      setMs(r);
      if (r === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [calcMs]);

  if (ms === 0) {
    return (
      <span style={{ color: "#ffbd1f", fontWeight: 800, fontSize: 18 }}>¡Es hoy!</span>
    );
  }

  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  const seg = Math.floor((ms % 60000) / 1000);

  const cells = [
    ...(dias > 0 ? [{ val: dias, lbl: "días" }] : []),
    { val: horas, lbl: "horas" },
    { val: min, lbl: "min" },
    { val: seg, lbl: "seg" },
  ];

  const cellStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "10px 16px",
    minWidth: 64,
    textAlign: "center",
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {cells.map(({ val, lbl }) => (
        <div key={lbl} style={cellStyle}>
          <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", margin: 0, color: "white" }}>
            {String(val).padStart(2, "0")}
          </p>
          <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0, color: "white" }}>
            {lbl}
          </p>
        </div>
      ))}
    </div>
  );
}
