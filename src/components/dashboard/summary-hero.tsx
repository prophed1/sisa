"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
} from "@phosphor-icons/react";
import { formatDelta, formatIDR, formatPercent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";

export function SummaryHero() {
  const summary = useLedgerSummary();
  const { period } = useLedger();

  return (
    <section
      aria-labelledby="hero-spending-label"
      className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-[var(--night-line)] bg-[var(--night)] p-5 text-[#FFF4EB] shadow-[0_24px_60px_-46px_rgba(8,6,20,0.95)] sm:p-7"
    >
      <div
        aria-hidden
        className="hairline-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(115%_105%_at_88%_-8%,black,transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 size-[340px] rounded-full bg-[radial-gradient(circle,rgba(166,188,201,0.22),transparent_66%)]"
      />
      {/* Kobaran hangat di kaki panel: dua suhu warna, bukan satu ungu saja. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-24 size-[320px] rounded-full bg-[radial-gradient(circle,rgba(246,224,182,0.16),transparent_66%)]"
      />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              id="hero-spending-label"
              className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.17em] text-[#FFF4EB]/50"
            >
              <span className="relative flex size-[6px]">
                <span className="absolute inline-flex size-full animate-[pulse-dot_3s_ease-in-out_infinite] rounded-full bg-[#F6E0B6]/60" />
                <span className="relative inline-flex size-[6px] rounded-full bg-[#F6E0B6]" />
              </span>
              {period.isCurrent
                ? "Pengeluaran bulan ini"
                : `Pengeluaran ${period.month}`}
            </p>

            <p className="num mt-4 text-[32px] font-medium leading-none tracking-[-0.04em] text-[#FFF9F2] sm:text-[38px]">
              {formatIDR(summary.spending)}
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11.5px] text-[#FFF4EB]/55">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#A6BCC9]/15 px-2 py-[3px] text-[11px] font-medium text-[#D6E3EC] ring-1 ring-inset ring-[#A6BCC9]/25">
                <ArrowUpRight size={11} weight="bold" />
                {formatDelta(summary.delta)}
              </span>
              <span>
                dari {summary.comparisonLabel} ·{" "}
                <span className="num">
                  {formatIDR(summary.previousSpending)}
                </span>
              </span>
            </div>
          </div>

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[10.5px] text-[#FFF4EB]/55 sm:inline-flex">
            <CalendarBlank size={12} />
            {period.range}
          </span>
        </div>

        <dl className="mt-7 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:mt-auto sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10 sm:pt-5">
          <div className="sm:pr-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-white/40">
              Pemasukan
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-white/90">
              {formatIDR(summary.income)}
            </dd>
            <p className="mt-1 text-[10px] text-white/35">
              Gaji & proyek lepas
            </p>
          </div>

          <div className="sm:px-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-white/40">
              Sisa saldo
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-white/90">
              {formatIDR(summary.balance)}
            </dd>
            <p className="mt-1 text-[10px] text-white/35">
              Saldo awal + arus sampai {period.short}
            </p>
          </div>

          <div className="sm:pl-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-white/40">
              Anggaran tersisa
            </dt>
            {/* Bulan tanpa anggaran tidak boleh tampil sebagai sisa minus. */}
            {summary.budgetTotal > 0 ? (
              <>
                <dd className="num mt-1.5 text-[15px] font-medium text-white/90">
                  {formatIDR(summary.budgetLeft)}
                </dd>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-[#A6BCC9]"
                      style={{ width: `${Math.min(summary.budgetUsed, 100)}%` }}
                    />
                  </span>
                  <span className="num text-[9.5px] text-white/40">
                    {formatPercent(summary.budgetUsed)} terpakai
                  </span>
                </div>
              </>
            ) : (
              <>
                <dd className="mt-1.5 text-[15px] font-medium text-white/70">
                  Belum diatur
                </dd>
                <Link
                  href="/pengaturan"
                  className="mt-2 inline-flex items-center gap-1 text-[9.5px] text-white/45 transition-colors hover:text-white/80"
                >
                  Atur anggaran {period.short}
                  <ArrowRight size={10} weight="bold" />
                </Link>
              </>
            )}
          </div>
        </dl>
      </div>
    </section>
  );
}
