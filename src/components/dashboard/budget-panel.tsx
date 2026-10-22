"use client";

import Link from "next/link";
import {
  ArrowRight,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatIDR, formatPercent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";
import { cn } from "@/lib/utils";

export function BudgetPanel() {
  const summary = useLedgerSummary();
  const { period } = useLedger();
  const overLine = summary.budgetLines.find((line) => line.over);
  const overAmount = overLine ? overLine.spent - overLine.limit : 0;
  const { pace } = summary;
  const paceNote = (() => {
    if (pace.crossedDay !== null) {
      return `Anggaran sudah habis di hari ${pace.crossedDay} ${period.short}. Kurangi laju atau sesuaikan anggaran.`;
    }
    if (pace.projectedDay !== null && pace.projectedDay <= period.daysInMonth) {
      const early = period.daysInMonth - pace.projectedDay;
      return `Dengan laju ini, anggaran tembus sekitar ${pace.projectedDay} ${
        period.short
      }${early > 0 ? ` — ${early} hari sebelum akhir bulan` : ""}.`;
    }
    return `Dengan laju ini anggaran tidak akan tembus sampai akhir bulan. Sisanya boleh dipakai ${formatIDR(
      pace.safePerDay,
    )} per hari.`;
  })();

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        className="pb-2"
        title={`Anggaran ${period.isCurrent ? "bulan ini" : period.month}`}
        caption={`Siklus berakhir ${period.daysInMonth} ${period.short} ${period.year}`}
        action={
          <Link
            href="/pengaturan"
            aria-label="Atur anggaran"
            className="grid size-7 place-items-center rounded-[8px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <SlidersHorizontal size={14} />
          </Link>
        }
      />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {summary.budgetTotal > 0 ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-faint">
                  Sisa anggaran
                </p>
                <p className="num mt-1.5 text-[22px] font-medium leading-none tracking-[-0.03em]">
                  {formatIDR(summary.budgetLeft)}
                </p>
              </div>
              <span className="num text-[10.5px] text-faint">
                {formatPercent(summary.budgetUsed)} terpakai
              </span>
            </div>

            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full origin-left rounded-full bg-pine"
                style={{
                  width: `${Math.min(summary.budgetUsed, 100)}%`,
                  animation: "grow-bar 1s cubic-bezier(0.16, 1, 0.3, 1) both",
                }}
              />
            </div>
            <p className="num mt-2 text-[10px] text-faint">
              dari {formatIDR(summary.budgetTotal)}
            </p>
          </>
        ) : (
          <div className="rounded-[12px] border border-dashed border-line bg-canvas px-3.5 py-3.5">
            <p className="text-[11.5px] leading-relaxed text-muted">
              Belum ada anggaran untuk {period.label}. Tentukan total dan batas
              kategori supaya sisa serta proyeksi bisa dihitung.
            </p>
            <Link
              href="/pengaturan"
              className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-pine hover:underline"
            >
              Atur anggaran <ArrowRight size={11} weight="bold" />
            </Link>
          </div>
        )}

        {summary.budgetTotal > 0 ? (
          <div className="mt-4 rounded-[12px] border border-line bg-canvas px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.11em] text-muted">
                Laju belanja
              </span>
              <span className="num text-[10.5px] text-faint">
                {formatIDR(pace.dailyAverage)}/hari
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              {paceNote}
            </p>
            <dl className="mt-2.5 grid grid-cols-2 gap-3 border-t border-line pt-2.5">
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
                  Sisa aman / hari
                </dt>
                <dd className="num mt-1 text-[12px]">
                  {formatIDR(pace.safePerDay)}/hari
                </dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
                  Proyeksi akhir bulan
                </dt>
                <dd
                  className={cn(
                    "num mt-1 text-[12px]",
                    pace.onTrack ? "text-ink" : "text-clay",
                  )}
                >
                  {formatIDR(pace.projectedTotal)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div
          className={cn(
            "space-y-3 border-t border-line",
            summary.budgetLines.length ? "mt-5 pt-4" : "hidden",
          )}
        >
          {summary.budgetLines.map((line) => {
            const meta = CATEGORY_META[line.category];

            return (
              <div key={line.category}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted">
                    <span
                      aria-hidden
                      className="size-[5px] shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate">{meta.shortLabel}</span>
                    {line.over ? (
                      <WarningCircle
                        size={11}
                        weight="fill"
                        className="shrink-0 text-clay"
                        aria-label="Melewati anggaran"
                      />
                    ) : null}
                  </span>
                  <span className="num shrink-0 text-[10px] text-faint">
                    <span className={cn(line.over && "text-clay")}>
                      {formatIDR(line.spent)}
                    </span>
                    <span className="text-faint"> / {formatIDR(line.limit)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-surface-2">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full",
                      line.over ? "bg-clay" : "bg-ink/35 dark:bg-ink/45",
                    )}
                    style={{
                      width: `${Math.min(line.ratio, 100)}%`,
                      animation: "grow-bar 1s cubic-bezier(0.16, 1, 0.3, 1) both",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {overLine ? (
          <p className="mt-4 text-[10px] leading-relaxed text-faint">
            {CATEGORY_META[overLine.category].shortLabel} melewati batas sebesar{" "}
            <span className="num text-clay">{formatIDR(overAmount)}</span>.
            Anggaran bisa disesuaikan kapan saja.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
