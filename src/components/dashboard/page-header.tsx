"use client";

import { SaveStatusBadge } from "@/components/ui/save-status";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";

export function PageHeader() {
  const summary = useLedgerSummary();
  const { period } = useLedger();
  const empty = summary.count === 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
          <span className="size-[5px] rounded-full bg-pine" />
          {period.label}
        </div>
        <h1 className="mt-2.5 text-[30px] display leading-[1.06] sm:text-[38px]">
          Ringkasan pengeluaran
        </h1>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-muted">
          {empty
            ? `Belum ada catatan pada ${period.label}. Pindah bulan atau catat pengeluaran pertama.`
            : `Dihitung dari ${summary.count} transaksi pada ${period.range} — catatan manual, struk, dan mutasi email dalam satu tampilan.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SaveStatusBadge className="h-[26px] px-2.5" />
        <MonthSwitcher />
      </div>
    </div>
  );
}
