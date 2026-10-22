"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDayLabel } from "@/lib/finance";
import { formatIDR, formatPercent, percent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";

export function SpendingSpotlight() {
  const summary = useLedgerSummary();
  const { period } = useLedger();
  const title = period.isCurrent ? "Sorotan bulan ini" : `Sorotan ${period.month}`;
  const top = summary.byCategory[0];
  const biggest = summary.biggest;

  if (!top || !biggest) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader
          title={title}
          caption="Kategori dengan pengeluaran terbesar"
        />
        <div className="flex flex-1 items-center px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-[12px] leading-relaxed text-muted">
            Belum ada pengeluaran tercatat pada {period.label}. Catat satu
            transaksi untuk melihat sorotannya di sini.
          </p>
        </div>
      </Panel>
    );
  }

  const meta = CATEGORY_META[top.category];
  const share = percent(top.amount, summary.spending);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title={title}
        caption="Kategori dengan pengeluaran terbesar"
      />

      <div className="px-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12.5px] font-medium">
              <span
                aria-hidden
                className="size-[7px] rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </p>
            <p className="num mt-2.5 text-[24px] font-medium leading-none tracking-[-0.03em]">
              {formatIDR(top.amount)}
            </p>
          </div>
          <Badge tone="pine" className="mt-0.5 shrink-0">
            {formatPercent(share)} dari total
          </Badge>
        </div>

        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full origin-left rounded-full"
            style={{
              width: `${share}%`,
              backgroundColor: meta.color,
              animation: "grow-bar 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10.5px] text-faint">
          <span>{top.count} transaksi</span>
          <span className="num">dari {formatIDR(summary.spending)}</span>
        </div>
      </div>

      <div className="mt-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="border-t border-line pt-4">
          <p className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-faint">
            Transaksi terbesar
          </p>
          <Link
            href="/transaksi"
            className="group mt-2.5 flex items-end justify-between gap-3 rounded-[8px] outline-offset-4"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[12.5px] font-medium">
                <span className="truncate">{biggest.merchant}</span>
                <ArrowUpRight
                  size={11}
                  className="shrink-0 text-faint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-faint">
                {biggest.category ? CATEGORY_META[biggest.category].label : "Pemasukan"}{" "}
                · {formatDayLabel(biggest.date)}
              </span>
            </span>
            <span className="num shrink-0 text-[13px] font-medium">
              {formatIDR(biggest.amount)}
            </span>
          </Link>
        </div>
      </div>
    </Panel>
  );
}
