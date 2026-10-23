"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  Cypress,
  GreatStar,
  StarField,
  SwirlSky,
} from "@/components/ornaments/starry-night";
import { formatDelta, formatIDR, formatPercent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";

export function SummaryHero() {
  const summary = useLedgerSummary();
  const { period } = useLedger();

  return (
    <section
      aria-labelledby="hero-spending-label"
      className="night-sky relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[var(--night-line)] p-5 text-[var(--night-ink)] shadow-[0_40px_90px_-60px_rgba(1,5,18,0.95)] ring-1 ring-inset ring-white/[0.06] sm:p-7"
    >
      <StarField className="opacity-90" />
      <SwirlSky className="opacity-60" />
      <GreatStar className="pointer-events-none absolute -right-10 -top-14 w-[178px] opacity-85 sm:-right-8 sm:-top-20 sm:w-[224px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(to_top,rgba(4,10,22,0.78),transparent)]" />
      <Cypress className="pointer-events-none absolute -right-5 top-[27%] hidden h-[86%] w-[132px] opacity-95 sm:block" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p
              id="hero-spending-label"
              className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.17em] text-[#f7ecc8]/70"
            >
              <span className="relative flex size-[7px]">
                <span className="absolute inline-flex size-full animate-[pulse-dot_3.4s_ease-in-out_infinite] rounded-full bg-[#f2c14e]/45" />
                <span className="relative inline-flex size-[7px] rounded-full bg-[#f2c14e] shadow-[0_0_10px_#f2c14e]" />
              </span>
              {period.isCurrent
                ? "Pengeluaran bulan ini"
                : `Pengeluaran ${period.month}`}
            </p>

            <p className="num mt-4 text-[38px] font-medium leading-none tracking-[-0.045em] text-[#fdf7e4] sm:text-[48px]">
              {formatIDR(summary.spending)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] text-[#f7f0dc]/60">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f2c14e]/12 px-2.5 py-1 text-[11px] font-medium text-[#f7e3a4] ring-1 ring-inset ring-[#f2c14e]/25">
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

          <div className="flex shrink-0 flex-row items-center gap-2 sm:w-[212px] sm:flex-col sm:items-end">
            <div className="rounded-2xl border border-white/14 bg-[#081226]/55 px-3 py-2 text-right backdrop-blur-md">
              <p className="text-[9px] uppercase tracking-[0.13em] text-[#f7f0dc]/65">
                Rata-rata / hari
              </p>
              <p className="num mt-1 whitespace-nowrap text-[12.5px] font-medium text-[#fdf7e4]">
                {formatIDR(summary.dailyAverage)}
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-7 grid grid-cols-1 gap-4 border-t border-white/12 pt-5 sm:mt-auto sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/12 sm:pt-5">
          <div className="sm:pr-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-[#f7f0dc]/65">
              Pemasukan
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-[#fdf7e4]">
              {formatIDR(summary.income)}
            </dd>
            <p className="mt-1 text-[10px] text-[#f7f0dc]/60">
              Gaji & proyek lepas
            </p>
          </div>

          <div className="sm:px-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-[#f7f0dc]/65">
              Sisa saldo
            </dt>
            <dd className="num mt-1.5 text-[15px] font-medium text-[#fdf7e4]">
              {formatIDR(summary.balance)}
            </dd>
            <p className="mt-1 text-[10px] text-[#f7f0dc]/60">
              Saldo awal + arus sampai {period.short}
            </p>
          </div>

          <div className="sm:pl-5">
            <dt className="text-[10px] uppercase tracking-[0.13em] text-[#f7f0dc]/65">
              Anggaran tersisa
            </dt>
            {/* Bulan tanpa anggaran tidak boleh tampil sebagai sisa minus. */}
            {summary.budgetTotal > 0 ? (
              <>
                <dd className="num mt-1.5 text-[15px] font-medium text-[#fdf7e4]">
                  {formatIDR(summary.budgetLeft)}
                </dd>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12">
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#e9b845,#f7e3a4)] shadow-[0_0_8px_rgba(242,193,78,0.5)]"
                      style={{ width: `${Math.min(summary.budgetUsed, 100)}%` }}
                    />
                  </span>
                  <span className="num text-[9.5px] text-[#f7f0dc]/65">
                    {formatPercent(summary.budgetUsed)} terpakai
                  </span>
                </div>
              </>
            ) : (
              <>
                <dd className="mt-1.5 text-[15px] font-medium text-[#f7f0dc]/70">
                  Belum diatur
                </dd>
                <Link
                  href="/pengaturan"
                  className="mt-2 inline-flex items-center gap-1 text-[9.5px] text-[#f7f0dc]/60 transition-colors hover:text-[#f7e3a4]"
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
