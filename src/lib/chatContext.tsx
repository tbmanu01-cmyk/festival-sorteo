"use client";

import { createContext, useContext, useState } from "react";

interface ChatContextValue {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  noLeidos: number;
  setNoLeidos: (v: number) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);

  return (
    <ChatContext.Provider value={{ abierto, setAbierto, noLeidos, setNoLeidos }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatWidget() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatWidget debe usarse dentro de <ChatProvider>");
  return ctx;
}
