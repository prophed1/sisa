"use client";

import { Repeat } from "@phosphor-icons/react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { detectRecurring } from "@/lib/analytics";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDayLabel, isInPeriod } from "@/lib/finance";
import { formatIDR, percent } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function RecurringPanel({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const items = detectRecurring(transactions);
  const monthly = items.reduce((total, item) => total + item.amount, 0);
  const spendingThisMonth = transactions
    .filter((tx) => tx.direction === "expense" && isInPeriod(tx.date))
    .reduce((total, tx) => total + tx.amount, 0);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Pengeluaran berulang"
        caption="Muncul minimal tiga bulan dengan tanggal dan nominal yang mirip."
        action={
          items.length ? (
            <span className="flex items-center gap-1.5 text-[10.5px] text-faint">
              <Repeat size={12} />
              {items.length}
            </span>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        {items.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted">
            Belum ada pola berulang yang bisa dikenali. Butuh minimal tiga bulan
            riwayat dengan nominal yang stabil.
          </p>
        ) : (
          <ul className="thin-scroll max-h-[340px] divide-y divide-line/70 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item.merchant} className="py-2.5 first:pt-0">
                <div className="flex items-baseline gap-2.5">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.01em]">
                    {item.merchant}
                  </span>
                  <span className="num shrink-0 text-[11.5px]">
                    {formatIDR(item.amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
                  {item.category ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        aria-hidden
                        className="size-[5px] rounded-full"
                        style={{
                          backgroundColor: CATEGORY_META[item.category].color,
                        }}
                      />
                      {CATEGORY_META[item.category].shortLabel}
                    </span>
                  ) : (
                    <span>Tanpa kategori</span>
                  )}
                  <span className="text-line-strong">·</span>
                  <span className="num">{item.months} bulan</span>
                  {item.spread > 0 ? (
                    <>
                      <span className="text-line-strong">·</span>
                      <span className="num">
                        variasi {Math.round(item.spread * 100)}%
                      </span>
                    </>
                  ) : null}
                  <span className="ml-auto whitespace-nowrap">
                    Berikutnya {formatDayLabel(item.nextDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length ? (
          <div className="mt-auto border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] text-muted">Total per bulan</span>
              <span className="num text-[13px] font-medium">
                {formatIDR(monthly)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-pine/70"
                  style={{ width: `${Math.min(percent(monthly, spendingThisMonth), 100)}%` }}
                />
              </span>
              <span className="num text-[9.5px] text-faint">
                {Math.round(percent(monthly, spendingThisMonth))}% belanja bulan
                ini
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-faint">
              Setara {formatIDR(monthly * 12)} per tahun kalau semuanya berlanjut
              — perkiraan dari {items.length} pola yang terdeteksi.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
