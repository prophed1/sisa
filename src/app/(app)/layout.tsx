import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LedgerProvider } from "@/components/providers/ledger-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { AppShell } from "@/components/shell/app-shell";
import { getSessionUser } from "@/lib/auth-session";
import { database } from "@/lib/db/pg";
import { readLedger } from "@/lib/ledger-service";
import { initialMonthKey, todayIso } from "@/lib/period";

/**
 * Seluruh ruang kerja hanya masuk akal kalau sudah ada pemilik data, jadi
 * segmen ini memang menunggu server: sesi dibaca, lalu ledger pemiliknya
 * dimuat sekali untuk seluruh halaman di bawahnya.
 */
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const ledger = await readLedger(database, user.id);
  const today = todayIso();
  const initialMonth = initialMonthKey(ledger.transactions, ledger.budgets, today);

  return (
    <SessionProvider user={user}>
      <LedgerProvider
        initial={ledger}
        initialMonth={initialMonth}
        today={today}
      >
        <AppShell>{children}</AppShell>
      </LedgerProvider>
    </SessionProvider>
  );
}
