"use client";

import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { WEEKDAY_SHORT, type RangeAnalysis } from "@/lib/analytics";
import { formatDayLabel } from "@/lib/finance";
import { formatDelta, formatIDR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatsStrip({ analysis }: { analysis: RangeAnalysis }) {
  const peak = analysis.peak;

  const cells = [
    {
      label: "Total pengeluaran",
      value: formatIDR(analysis.spending),
      sub: `${analysis.expenseCount} transaksi`,
      delta: analysis.comparisonTotal ? formatDelta(analysis.delta) : null,
    },
    {
      label: "Rata-rata per hari",
      value: formatIDR(analysis.dailyAverage),
      sub: `${analysis.days} hari kalender`,
    },
    {
      label: "Hari termahal",
      value: peak ? formatIDR(peak.amount) : "—",
      sub: peak
        ? `${WEEKDAY_SHORT[peak.weekday]}, ${formatDayLabel(peak.iso)}`
        : "Belum ada",
    },
    {
      label: "Hari aktif",
      value: `${analysis.activeDays}`,
      sub: `dari ${analysis.days} hari · ${formatPercent(
        analysis.days ? (analysis.activeDays / analysis.days) * 100 : 0,
      )}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-line bg-line shadow-[var(--shadow-panel)] lg:grid-cols-4">
      {cells.map((cell, index) => {
        const up = analysis.delta > 0;
        return (
          <div key={cell.label} className="bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-faint">
                {cell.label}
              </p>
              {index === 0 && cell.delta ? (
                <span
                  className={cn(
                    "num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
                    up
                      ? "bg-clay-soft text-clay"
                      : "bg-pine-soft text-pine",
                  )}
                  title={`Dibanding periode yang sama bulan lalu (${formatIDR(
                    analysis.comparisonTotal,
                  )})`}
                >
                  {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {cell.delta}
                </span>
              ) : null}
            </div>
            <p className="num mt-2.5 text-[19px] font-medium leading-none tracking-[-0.03em] sm:text-[22px]">
              {cell.value}
            </p>
            <p className="mt-1.5 truncate text-[10.5px] text-faint">{cell.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
