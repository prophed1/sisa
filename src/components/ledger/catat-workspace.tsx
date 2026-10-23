"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import { CategoryIcon, SourceIcon, sourceLabel } from "@/components/category-icon";
import { TransactionForm } from "@/components/ledger/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDayLabel } from "@/lib/finance";
import { formatIDR, formatPercent } from "@/lib/format";
import {
  addTransaction,
  useLedger,
  useLedgerSummary,
} from "@/lib/ledger-store";
import { monthKeyOf } from "@/lib/period";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CatatWorkspace() {
  const summary = useLedgerSummary();
  const { setMonth } = useLedger();
  const [saved, setSaved] = useState<Transaction | null>(null);

  return (
    <div className="reveal mx-auto max-w-[1120px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Catat manual
          </div>
          <h1 className="mt-2.5 text-[27px] display leading-[1.1] sm:text-[34px]">
            Catat transaksi baru
          </h1>
          <p className="mt-1.5 max-w-[54ch] text-[12.5px] leading-relaxed text-muted">
            Nominal, tanggal, kategori. Semua ringkasan di dasbor ikut berubah
            begitu catatan disimpan.
          </p>
        </div>
        <SaveStatusBadge className="h-[26px] px-2.5" />
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.12fr_0.88fr]">
        <Panel className="p-5 sm:p-6">
          {saved ? (
            <SavedPanel
              saved={saved}
              onAgain={() => setSaved(null)}
            />
          ) : (
            <TransactionForm
              mode="create"
              onSubmit={(draft) => {
                // Kalau catatannya jatuh di bulan lain, ikuti ke bulan itu
                // supaya angka yang tampil memang memuat catatan barunya.
                setSaved(addTransaction(draft));
                setMonth(monthKeyOf(draft.date));
              }}
            />
          )}
        </Panel>

        <div className="space-y-5">
          <ImpactPanel summary={summary} saved={saved} />
          <RecentPanel
            recent={summary.recent.slice(0, 3)}
            highlightId={saved?.id}
          />
        </div>
      </div>
    </div>
  );
}

function SavedPanel({
  saved,
  onAgain,
}: {
  saved: Transaction;
  onAgain: () => void;
}) {
  const transaction = saved;
  const isIncome = transaction.direction === "income";
  const summary = useLedgerSummary();
  const { period } = useLedger();

  return (
    <div className="rise space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pine-soft text-pine">
          <CheckCircle size={22} weight="regular" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-medium tracking-[-0.01em]">
            Transaksi tersimpan
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {transaction.merchant} · {formatDayLabel(transaction.date)} ·{" "}
            {transaction.time}
            {transaction.category
              ? ` · ${CATEGORY_META[transaction.category].label}`
              : " · Pemasukan"}
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-surface-2/50 px-4 py-3.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-faint">
          {isIncome ? "Pemasukan dicatat" : "Pengeluaran dicatat"}
        </p>
        <p className="num mt-1.5 text-[26px] font-medium tracking-[-0.03em]">
          {isIncome ? "+" : "−"}
          {formatIDR(transaction.amount)}
        </p>
        {!isIncome ? (
          <p className="mt-1.5 text-[11px] text-faint">
            Pengeluaran {period.isCurrent ? "bulan ini" : period.month} sekarang{" "}
            <span className="num text-muted">{formatIDR(summary.spending)}</span>
            .
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onAgain}>
          <PencilSimpleLine size={14} />
          Catat lagi
        </Button>
        <Link
          href="/transaksi"
          className={buttonStyles({ variant: "secondary" })}
        >
          Lihat semua transaksi
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function ImpactPanel({
  summary,
  saved,
}: {
  summary: ReturnType<typeof useLedgerSummary>;
  saved: Transaction | null;
}) {
  const { period } = useLedger();
  const rows = [
    { label: "Pengeluaran", value: summary.spending },
    { label: "Pemasukan", value: summary.income },
    { label: "Sisa saldo", value: summary.balance },
  ];

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-medium tracking-[-0.01em]">
            Dampak {period.isCurrent ? "bulan ini" : period.month}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-faint">
            Dihitung ulang setiap catatan tersimpan · {period.label}
          </p>
        </div>
        {saved ? (
          <Badge tone="pine" className="shrink-0">
            Diperbarui
          </Badge>
        ) : null}
      </div>

      <dl className="mt-5 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <dt className="text-[11.5px] text-muted">{row.label}</dt>
            <dd className="num text-[13px] font-medium">
              {formatIDR(row.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11.5px] text-muted">Anggaran tersisa</span>
          <span className="num text-[13px] font-medium">
            {formatIDR(summary.budgetLeft)}
          </span>
        </div>
        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full origin-left rounded-full bg-pine"
            style={{
              width: `${Math.min(summary.budgetUsed, 100)}%`,
              animation: "grow-bar 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        </div>
        <p className="num mt-2 text-[10px] text-faint">
          {formatPercent(summary.budgetUsed)} dari{" "}
          {formatIDR(summary.budgetTotal)} · {summary.count} catatan
        </p>
      </div>
    </Panel>
  );
}

function RecentPanel({
  recent,
  highlightId,
}: {
  recent: Transaction[];
  highlightId?: string;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-medium tracking-[-0.01em]">
          Tiga catatan terakhir
        </h2>
        <Link
          href="/transaksi"
          className="text-[11px] font-medium text-muted transition-colors hover:text-ink"
        >
          Kelola
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
          Belum ada catatan. Transaksi yang kamu simpan akan muncul di sini.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {recent.map((transaction) => {
            const isIncome = transaction.direction === "income";
            return (
              <li
                key={transaction.id}
                className="flex items-center gap-3 py-2.5"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-[9px] border border-line",
                    isIncome ? "bg-pine-soft text-pine" : "bg-canvas text-muted",
                  )}
                >
                  {transaction.category ? (
                    <CategoryIcon category={transaction.category} size={14} />
                  ) : (
                    <span className="num text-[12px]">+</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium">
                      {transaction.merchant}
                    </span>
                    {transaction.id === highlightId ? (
                      <Badge tone="pine" className="h-[17px] px-1.5 text-[9px]">
                        Baru
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
                    <SourceIcon source={transaction.source} size={10} />
                    {sourceLabel(transaction.source)} ·{" "}
                    {formatDayLabel(transaction.date)}
                  </span>
                </span>
                <span
                  className={cn(
                    "num shrink-0 text-[12px] font-medium",
                    isIncome && "text-pine",
                  )}
                >
                  {isIncome ? "+" : "−"}
                  {formatIDR(transaction.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
