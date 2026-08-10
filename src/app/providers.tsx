"use client";

import { SessionProvider } from "next-auth/react";
import { ChatProvider } from "@/lib/chatContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChatProvider>{children}</ChatProvider>
    </SessionProvider>
  );
}
