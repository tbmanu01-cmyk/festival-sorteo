"use client";

import { useState, useEffect, useCallback } from "react";

export default function CountdownAnticipada({ fecha }: { fecha: string }) {
  const calcMs = useCallback(
    () => Math.max(0, new Date(fecha).getTime() - Date.now()),
    [fecha]
  );
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
    return <span className="text-orange-600 font-bold text-sm">¡Hoy!</span>;
  }

  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  const seg = Math.floor((ms % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 text-sm font-mono tabular-nums">
      {dias > 0 && (
        <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] px-1.5 py-0.5 rounded font-bold">
          {dias}d
        </span>
      )}
      <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] px-1.5 py-0.5 rounded font-bold">
        {String(horas).padStart(2, "0")}h
      </span>
      <span className="bg-[#1B4F8A]/10 text-[#1B4F8A] px-1.5 py-0.5 rounded font-bold">
        {String(min).padStart(2, "0")}m
      </span>
      <span className="bg-[#F5A623]/20 text-[#b87b00] px-1.5 py-0.5 rounded font-bold">
        {String(seg).padStart(2, "0")}s
      </span>
    </div>
  );
}
