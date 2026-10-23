"use client";

import { AppearancePanel } from "@/components/settings/appearance-panel";
import { BudgetEditor } from "@/components/settings/budget-editor";
import { DataPanel } from "@/components/settings/data-panel";
import { ProfilePanel } from "@/components/settings/profile-panel";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";
import { formatIDR } from "@/lib/format";

export function SettingsWorkspace() {
  const { period } = useLedger();
  const summary = useLedgerSummary();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Pengaturan
          </div>
          <h1 className="mt-2.5 max-w-[24ch] text-[26px] font-medium leading-[1.08] tracking-[-0.045em] sm:text-[32px]">
            Kendali atas angka dan data.
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
            {summary.budgetTotal > 0
              ? `Anggaran ${formatIDR(summary.budgetTotal)} untuk ${period.label}, dihitung dari ${summary.count} catatan bulan itu.`
              : `Belum ada anggaran untuk ${period.label}. Tentukan totalnya di bawah, atau salin dari bulan sebelumnya.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveStatusBadge className="h-[26px] px-2.5" />
          <MonthSwitcher />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <BudgetEditor />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <AppearancePanel />
          <DataPanel />
          <ProfilePanel />
        </div>
      </div>
    </div>
  );
}
