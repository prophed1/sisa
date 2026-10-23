"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { AuroraVeil, GlassOrb, PerspectiveGrid } from "@/components/ornaments/glass-orb";
import { formatDelta, formatIDR, formatPercent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";

export function SummaryHero() {
  const summary = useLedgerSummary();
  const { period } = useLedger();

  return (
    <section
      aria-labelledby="hero-spending-label"
      className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[var(--night-line)] bg-[var(--night)] p-5 text-[#F7F2FF] shadow-[0_40px_90px_-60px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.05] sm:p-7"
    >
      <AuroraVeil />
      <PerspectiveGrid />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p
              id="hero-spending-label"
              className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.17em] text-[#F7F2FF]/55"
            >
              <span className="relative flex size-[6px]">
                <span className="absolute inline-flex size-full animate-[pulse-dot_3s_ease-in-out_infinite] rounded-full bg-[#F8B6D2]/60" />
                <span className="relative inline-flex size-[6px] rounded-full bg-[#F8B6D2]" />
              </span>
              {period.isCurrent
                ? "Pengeluaran bulan ini"
                : `Pengeluaran ${period.month}`}
            </p>

            <p className="num mt-4 text-[38px] font-medium leading-none tracking-[-0.045em] text-[#FFFDFF] sm:text-[46px]">
              {formatIDR(summary.spending)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] text-[#F7F2FF]/55">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#E9DEFF] ring-1 ring-inset ring-white/15">
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

          <div className="flex shrink-0 flex-col items-end gap-2 sm:w-[212px]">
            <GlassOrb className="hidden w-[212px] sm:block" />
            <div className="rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2 text-right backdrop-blur-xl sm:-mt-10">
              <p className="text-[9px] uppercase tracking-[0.13em] text-[#F7F2FF]/50">
                Rata-rata / hari
              </p>
              <p className="num mt-1 whitespace-nowrap text-[12.5px] font-medium text-[#FFFDFF]">
                {formatIDR(summary.dailyAverage)}
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-7 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:mt-auto sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10 sm:pt-5">
          <div className="sm:pr-5">
            <dt              className="text-[10px] uppercase tracking-[0.13em] text-white/50"
            >
              Pemasukan
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-white/90">
              {formatIDR(summary.income)}
            </dd>
            <p className="mt-1 text-[10px] text-white/45">
              Gaji & proyek lepas
            </p>
          </div>

          <div className="sm:px-5">
            <dt              className="text-[10px] uppercase tracking-[0.13em] text-white/50"
            >
              Sisa saldo
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-white/90">
              {formatIDR(summary.balance)}
            </dd>
            <p className="mt-1 text-[10px] text-white/45">
              Saldo awal + arus sampai {period.short}
            </p>
          </div>

          <div className="sm:pl-5">
            <dt              className="text-[10px] uppercase tracking-[0.13em] text-white/50"
            >
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
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#C9B8FB,#F8B6D2)]"
                      style={{ width: `${Math.min(summary.budgetUsed, 100)}%` }}
                    />
                  </span>
                  <span className="num text-[9.5px] text-white/50">
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
