"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // El navegador solo revisa si sw.js cambió cada ~24h por su cuenta;
      // forzamos el chequeo en cada carga para que un fix se propague rápido.
      registration.update().catch(() => {});
    }).catch(() => {});

    // Cuando el SW nuevo toma control (skipWaiting + clients.claim), recargamos
    // una sola vez para que la pestaña ya abierta quede sirviendo con el código
    // nuevo — sin esto, el usuario tenía que cerrar y reabrir manualmente.
    let recargando = false;
    const onControllerChange = () => {
      if (recargando) return;
      recargando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return null;
}
