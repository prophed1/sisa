"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "@phosphor-icons/react";
import { CategoryIcon, SourceIcon, sourceLabel } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDayLabel } from "@/lib/finance";
import { formatIDR } from "@/lib/format";
import { useLedgerSummary } from "@/lib/ledger-store";
import { cn } from "@/lib/utils";

export function RecentTransactions() {
  const summary = useLedgerSummary();
  const recent = summary.recent;

  return (
    <Panel className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        title="Transaksi terbaru"
        caption={
          recent.length > 0
            ? `${recent.length} catatan terakhir yang masuk ke Sisa`
            : "Belum ada catatan bulan ini"
        }
        action={
          <Link
            href="/transaksi"
            className="group inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Lihat semua
            <ArrowRight
              size={12}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        }
      />

      {recent.length === 0 ? (
        <div className="flex flex-1 flex-col items-start px-5 pb-6 sm:px-6">
          <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted">
            <Receipt size={18} />
          </span>
          <p className="mt-3 max-w-[38ch] text-[12px] leading-relaxed text-muted">
            Catatan pertama belum ada. Mulai dari satu pengeluaran agar dasbor
            punya sesuatu untuk dihitung.
          </p>
          <Link
            href="/catat"
            className={buttonStyles({
              variant: "secondary",
              size: "sm",
              className: "mt-4",
            })}
          >
            Catat transaksi
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_112px_66px_116px] gap-3 border-y border-line bg-surface-2/40 px-6 py-2 text-[9.5px] font-medium uppercase tracking-[0.11em] text-faint md:grid">
            <span>Transaksi</span>
            <span>Kategori</span>
            <span>Tanggal</span>
            <span className="text-right">Nominal</span>
          </div>

          <ul className="divide-y divide-line">
            {recent.map((transaction) => {
              const isIncome = transaction.direction === "income";
              return (
                <li key={transaction.id}>
                  <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-2/55 md:grid-cols-[minmax(0,1fr)_112px_66px_116px] md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-[10px] border border-line",
                          isIncome
                            ? "bg-pine-soft text-pine"
                            : "bg-canvas text-muted",
                        )}
                      >
                        {transaction.category ? (
                          <CategoryIcon category={transaction.category} size={16} />
                        ) : (
                          <span className="num text-[13px] font-medium">+</span>
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12.5px] font-medium leading-tight">
                            {transaction.merchant}
                          </p>
                          {isIncome ? (
                            <Badge tone="pine" className="h-[18px] px-1.5 text-[9px]">
                              Masuk
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-[10.5px] leading-tight text-faint">
                          <SourceIcon source={transaction.source} size={11} />
                          {sourceLabel(transaction.source)}
                          <span aria-hidden>·</span>
                          {transaction.time}
                        </p>
                      </div>
                    </div>

                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-[11.5px] text-muted">
                        {transaction.category
                          ? CATEGORY_META[transaction.category].label
                          : "Pemasukan"}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-faint">
                        {transaction.note ?? "—"}
                      </p>
                    </div>

                    <div className="hidden text-[11px] text-faint md:block">
                      {formatDayLabel(transaction.date)}
                    </div>

                    <div className="text-right">
                      <p
                        className={cn(
                          "num text-[12.5px] font-medium leading-tight",
                          isIncome && "text-pine",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatIDR(transaction.amount)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-faint md:hidden">
                        {formatDayLabel(transaction.date)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-3 text-[10.5px] text-faint md:px-6">
            <span>
              Menampilkan {recent.length} dari {summary.count} transaksi
            </span>
            <Link
              href="/transaksi"
              className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-ink"
            >
              Kelola transaksi
              <ArrowRight size={11} />
            </Link>
          </div>
        </>
      )}
    </Panel>
  );
}
