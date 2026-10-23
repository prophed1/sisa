"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  ArrowRight,
  MagnifyingGlass,
  PencilSimple,
  ReceiptX,
  Trash,
} from "@phosphor-icons/react";
import { CategoryIcon, SourceIcon, sourceLabel } from "@/components/category-icon";
import { TransactionForm } from "@/components/ledger/transaction-form";
import { Badge } from "@/components/ui/badge";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { Button, buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import { SEED_TRANSACTIONS } from "@/lib/data/ledger-seed";
import { byNewest, formatDayLabel, formatLongDate } from "@/lib/finance";
import { formatIDR } from "@/lib/format";
import {
  clearTransactions,
  removeTransaction,
  restoreSeedLedger,
  updateTransaction,
  useLedger,
  useLedgerSummary,
} from "@/lib/ledger-store";
import type { CategoryKey, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const dateInputClass =
  "h-9 rounded-[10px] border border-line bg-surface px-2.5 text-[12px] outline-none transition-colors focus:border-line-strong [color-scheme:light] dark:[color-scheme:dark]";

/** Riwayat sudah mencakup beberapa bulan; daftar dibuka bertahap. */
const PAGE_SIZE = 60;

export function TransactionsWorkspace() {
  const { transactions, period, today } = useLedger();
  const summary = useLedgerSummary();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtersActive = Boolean(query || category || from || to);

  const firstDate = useMemo(
    () =>
      transactions.reduce<string | null>(
        (earliest, tx) => (!earliest || tx.date < earliest ? tx.date : earliest),
        null,
      ),
    [transactions],
  );
  const lastDate = useMemo(
    () =>
      transactions.reduce<string | null>(
        (latest, tx) => (!latest || tx.date > latest ? tx.date : latest),
        null,
      ),
    [transactions],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions
      .filter((tx) => (category ? tx.category === category : true))
      .filter((tx) => (from ? tx.date >= from : true))
      .filter((tx) => (to ? tx.date <= to : true))
      .filter((tx) =>
        needle
          ? `${tx.merchant} ${tx.note ?? ""}`.toLowerCase().includes(needle)
          : true,
      )
      .sort(byNewest);
  }, [transactions, query, category, from, to]);

  const shown = results.slice(0, limit);

  const totals = useMemo(() => {
    const expenses = results.filter((tx) => tx.direction === "expense");
    const incomes = results.filter((tx) => tx.direction === "income");
    const largest = expenses.reduce<Transaction | null>(
      (biggest, tx) => (!biggest || tx.amount > biggest.amount ? tx : biggest),
      null,
    );
    return {
      expense: expenses.reduce((total, tx) => total + tx.amount, 0),
      income: incomes.reduce((total, tx) => total + tx.amount, 0),
      largest,
    };
  }, [results]);

  // Setiap perubahan saringan kembali ke halaman pertama daftar.
  const changeQuery = (value: string) => {
    setQuery(value);
    setLimit(PAGE_SIZE);
  };
  const changeCategory = (value: CategoryKey | null) => {
    setCategory(value);
    setLimit(PAGE_SIZE);
  };
  const changeFrom = (value: string) => {
    setFrom(value);
    setLimit(PAGE_SIZE);
  };
  const changeTo = (value: string) => {
    setTo(value);
    setLimit(PAGE_SIZE);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory(null);
    setFrom("");
    setTo("");
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="reveal mx-auto max-w-[1180px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Kelola catatan
          </div>
          <h1 className="mt-2.5 text-[23px] font-medium tracking-[-0.03em] sm:text-[27px]">
            Semua transaksi
          </h1>
          <p className="mt-1.5 max-w-[56ch] text-[12.5px] leading-relaxed text-muted">
            {transactions.length} catatan sejak{" "}
            {firstDate ? formatLongDate(firstDate) : period.label} —{" "}
            {summary.count} di antaranya pada {period.label}. Cari, saring, lalu
            sunting atau hapus tanpa berpindah halaman.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveStatusBadge className="h-[26px] px-2.5" />
          <Button
            variant="ghost"
            size="sm"
            disabled={transactions.length === 0}
            onClick={() => setClearing(true)}
            className="text-clay hover:bg-clay-soft hover:text-clay"
          >
            <Trash size={13} />
            Hapus semua
          </Button>
          <Link
            href="/catat"
            className={buttonStyles({ variant: "primary", size: "sm" })}
          >
            Catat transaksi
          </Link>
        </div>
      </header>

      <Filters
        query={query}
        onQuery={changeQuery}
        category={category}
        onCategory={changeCategory}
        from={from}
        onFrom={changeFrom}
        to={to}
        onTo={changeTo}
        active={filtersActive}
        onReset={resetFilters}
        bounds={{ min: firstDate ?? today, max: lastDate ?? today }}
      />

      <Stats totals={totals} count={results.length} />

      <Panel className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_130px_64px_118px_76px] gap-3 border-b border-line bg-surface-2/40 px-5 py-2 text-[9.5px] font-medium uppercase tracking-[0.11em] text-faint md:grid">
          <span>Transaksi</span>
          <span>Kategori</span>
          <span>Tanggal</span>
          <span className="text-right">Nominal</span>
          <span className="text-right">Aksi</span>
        </div>

        {results.length === 0 ? (
          <EmptyState
            ledgerEmpty={transactions.length === 0}
            filtersActive={filtersActive}
            onReset={resetFilters}
          />
        ) : (
          <ul>
            {shown.map((transaction) => {
              const isIncome = transaction.direction === "income";
              return (
                <li
                  key={transaction.id}
                  className="group border-b border-line last:border-b-0"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-2/45 md:grid-cols-[minmax(0,1fr)_130px_64px_118px_76px] md:px-5">
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
                          <CategoryIcon
                            category={transaction.category}
                            size={16}
                          />
                        ) : (
                          <span className="num text-[13px]">+</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-medium">
                            {transaction.merchant}
                          </span>
                          {isIncome ? (
                            <Badge
                              tone="pine"
                              className="h-[18px] px-1.5 text-[9px]"
                            >
                              Masuk
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 truncate text-[10.5px] text-faint">
                          <SourceIcon source={transaction.source} size={11} />
                          {sourceLabel(transaction.source)} · {transaction.time}
                          {transaction.note ? ` · ${transaction.note}` : ""}
                        </span>
                      </span>
                    </div>

                    <span className="hidden truncate text-[11.5px] text-muted md:block">
                      {transaction.category
                        ? CATEGORY_META[transaction.category].label
                        : isIncome
                          ? "Pemasukan"
                          : "Tanpa kategori"}
                    </span>

                    <span className="hidden text-[11px] text-faint md:block">
                      {formatDayLabel(transaction.date)}
                    </span>

                    <span className="text-right">
                      <span
                        className={cn(
                          "num text-[12.5px] font-medium",
                          isIncome && "text-pine",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatIDR(transaction.amount)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-faint md:hidden">
                        {formatDayLabel(transaction.date)}
                      </span>
                    </span>

                    <span className="col-span-2 flex justify-end gap-1 md:col-span-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
                      <Button
                        size="smIcon"
                        variant="secondary"
                        aria-label={`Sunting ${transaction.merchant}`}
                        onClick={() => setEditing(transaction)}
                      >
                        <PencilSimple size={14} />
                      </Button>
                      <Button
                        size="smIcon"
                        variant="secondary"
                        aria-label={`Hapus ${transaction.merchant}`}
                        onClick={() => setDeleting(transaction)}
                      >
                        <Trash size={14} />
                      </Button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {shown.length < results.length ? (
          <div className="border-t border-line px-4 py-3 md:px-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
            >
              Tampilkan {Math.min(PAGE_SIZE, results.length - shown.length)}{" "}
              catatan lagi
            </Button>
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[10.5px] text-faint md:px-5">
            <span>
              Menampilkan {shown.length} dari {results.length} catatan
              {filtersActive ? ` (difilter dari ${transactions.length})` : ""}
            </span>
            <button
              type="button"
              onClick={() => setResetting(true)}
              className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-ink"
            >
              <ArrowCounterClockwise size={12} />
              Kembalikan data contoh
            </button>
          </div>
        ) : null}
      </Panel>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Sunting transaksi"
        description="Perubahan langsung memengaruhi ringkasan di dasbor."
      >
        {editing ? (
          <TransactionForm
            key={editing.id}
            mode="edit"
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => {
              updateTransaction(editing.id, draft);
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Hapus transaksi ini?"
        description="Catatan yang dihapus tidak bisa dikembalikan dari perangkat."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) removeTransaction(deleting.id);
                setDeleting(null);
              }}
            >
              <Trash size={14} />
              Hapus
            </Button>
          </>
        }
      >
        {deleting ? (
          <div className="rounded-[12px] border border-line bg-surface-2/60 px-3.5 py-3">
            <p className="text-[12.5px] font-medium">{deleting.merchant}</p>
            <p className="mt-1 text-[11px] text-faint">
              {formatDayLabel(deleting.date)} · {deleting.time}
              {deleting.category
                ? ` · ${CATEGORY_META[deleting.category].label}`
                : deleting.direction === "income"
                  ? " · Pemasukan"
                  : " · Tanpa kategori"}
            </p>
            <p className="num mt-2 text-[15px] font-medium">
              {deleting.direction === "income" ? "+" : "−"}
              {formatIDR(deleting.amount)}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={clearing}
        onClose={() => setClearing(false)}
        title="Hapus semua transaksi?"
        description={`${transactions.length} catatan dari semua bulan di akun ini akan dihapus, termasuk yang berasal dari email dan scan.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClearing(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearTransactions();
                setClearing(false);
                resetFilters();
              }}
            >
              <Trash size={14} />
              Hapus {transactions.length} catatan
            </Button>
          </>
        }
      >
        <div className="rounded-[12px] border border-clay/35 bg-clay-soft/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
          Tidak ada tombol urungkan. Anggaran bulanan, tema, dan pengaturan lain
          tetap tinggal. Kalau masih ingin menyimpan salinan, unduh CSV dulu di{" "}
          <Link
            href="/pengaturan"
            className="font-medium text-pine hover:underline"
          >
            Pengaturan → Data &amp; cadangan
          </Link>
          .
        </div>
      </Modal>

      <Modal
        open={resetting}
        onClose={() => setResetting(false)}
        title="Kembalikan data contoh?"
        description={`Seluruh perubahan lokal akan diganti dengan ${SEED_TRANSACTIONS.length} catatan contoh Juli–Oktober 2026.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                restoreSeedLedger();
                setResetting(false);
                resetFilters();
              }}
            >
              Kembalikan
            </Button>
          </>
        }
      />
    </div>
  );
}

function Filters({
  query,
  onQuery,
  category,
  onCategory,
  from,
  onFrom,
  to,
  onTo,
  active,
  onReset,
  bounds,
}: {
  query: string;
  onQuery: (value: string) => void;
  category: CategoryKey | null;
  onCategory: (value: CategoryKey | null) => void;
  from: string;
  onFrom: (value: string) => void;
  to: string;
  onTo: (value: string) => void;
  active: boolean;
  onReset: () => void;
  bounds: { min: string; max: string };
}) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex h-9 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 transition-colors focus-within:border-line-strong">
          <MagnifyingGlass size={15} className="shrink-0 text-faint" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Cari merchant atau catatan..."
            aria-label="Cari transaksi"
            className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint/80"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQuery("")}
              className="shrink-0 text-[10px] font-medium text-faint transition-colors hover:text-ink"
            >
              Hapus
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => onFrom(event.target.value)}
            aria-label="Tanggal mulai"
            className={dateInputClass}
          />
          <span className="text-[11px] text-faint">sampai</span>
          <input
            type="date"
            value={to}
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => onTo(event.target.value)}
            aria-label="Tanggal akhir"
            className={dateInputClass}
          />
          {active ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <ArrowCounterClockwise size={13} />
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="thin-scroll mt-3.5 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip
          label="Semua"
          active={category === null}
          onClick={() => onCategory(null)}
        />
        {CATEGORY_ORDER.map((key) => (
          <FilterChip
            key={key}
            label={CATEGORY_META[key].shortLabel}
            color={CATEGORY_META[key].color}
            active={category === key}
            onClick={() => onCategory(category === key ? null : key)}
          />
        ))}
      </div>
    </Panel>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium transition-colors duration-200",
        active
          ? "border-pine/50 bg-pine-soft text-ink"
          : "border-line bg-surface text-muted hover:bg-surface-2",
      )}
    >
      {color ? (
        <span
          aria-hidden
          className="size-[6px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </button>
  );
}

function Stats({
  totals,
  count,
}: {
  totals: { expense: number; income: number; largest: Transaction | null };
  count: number;
}) {
  const items = [
    { label: "Pengeluaran terfilter", value: formatIDR(totals.expense) },
    { label: "Pemasukan terfilter", value: formatIDR(totals.income) },
    { label: "Jumlah catatan", value: String(count) },
    {
      label: "Paling besar",
      value: totals.largest
        ? `${totals.largest.merchant} · ${formatIDR(totals.largest.amount)}`
        : "—",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-line">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn("px-1 sm:px-4", index === 0 && "sm:pl-0")}
        >
          <dt className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint">
            {item.label}
          </dt>
          <dd className="num mt-1.5 truncate text-[13.5px] font-medium">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyState({
  ledgerEmpty,
  filtersActive,
  onReset,
}: {
  ledgerEmpty: boolean;
  filtersActive: boolean;
  onReset: () => void;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
        <ReceiptX size={20} />
      </span>
      <h2 className="mt-4 text-[15px] font-medium tracking-[-0.01em]">
        {ledgerEmpty ? "Belum ada catatan" : "Tidak ada yang cocok"}
      </h2>
      <p className="mx-auto mt-1.5 max-w-[42ch] text-[12px] leading-relaxed text-muted">
        {ledgerEmpty
          ? "Mulai dari satu transaksi — nominal, tanggal, kategori. Dasbor akan mengikuti."
          : "Coba kata kunci lain, atau longgarkan kategori dan rentang tanggal."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtersActive ? (
          <Button variant="secondary" onClick={onReset}>
            <ArrowCounterClockwise size={13} />
            Reset filter
          </Button>
        ) : null}
        <Link
          href="/catat"
          className={buttonStyles({ variant: "primary" })}
        >
          Catat transaksi
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
