"use client";

import { createContext, useContext } from "react";

export interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  icono: string;
  createdAt: string;
  leida: boolean;
  reacciones: Record<string, number>;
  miReaccion: string | null;
}

export interface InboxContextValue {
  notifs: Notif[];
  cargando: boolean;
  marcarLeida: (id: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  reaccionar: (id: string, emoji: string) => Promise<void>;
}

export const InboxContext = createContext<InboxContextValue | null>(null);

// Comparte el estado de la bandeja (lista, lecturas, eliminaciones,
// reacciones) entre el panel lateral (layout) y el panel de detalle
// (página hija), para que ambos se mantengan sincronizados sin refetch.
export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox debe usarse dentro de /notificaciones");
  return ctx;
}
