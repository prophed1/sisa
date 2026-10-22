"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth-session";

/**
 * Identitas pengguna yang sudah diverifikasi di server, dibagikan ke seluruh
 * shell supaya sidebar, bilah atas, dan halaman pengaturan tidak perlu
 * menerimanya lewat prop satu per satu.
 */
const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <SessionContext value={user}>{children}</SessionContext>;
}

export function useSessionUser() {
  const user = useContext(SessionContext);
  if (!user) {
    throw new Error("useSessionUser hanya boleh dipakai di dalam <SessionProvider>.");
  }
  return user;
}
