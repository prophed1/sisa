"use client";

import { createContext, useContext, useMemo } from "react";
import {
  DEFAULT_BUDGET,
  EMPTY_BUDGET,
  SEED_TRANSACTIONS,
} from "@/lib/data/ledger-seed";
import { summarizeLedger, type LedgerSummary } from "@/lib/finance";
import type { LedgerOperation } from "@/lib/ledger-input";
import type { Period } from "@/lib/period";
import type {
  Budget,
  CategoryKey,
  Transaction,
  TransactionDraft,
} from "@/lib/types";

/**
 * Antarmuka yang dipakai seluruh layar tetap sama seperti sebelumnya, tapi
 * datanya sekarang datang dari server lewat `/api/ledger` dan bukan dari
 * `localStorage`: keadaan awal disuntikkan oleh layout server, dan setiap
 * perubahan dikirim sebagai perintah ke route handler.
 *
 * Sejak anggaran disimpan per bulan, keadaan memuat seluruh bulan sekaligus
 * (`budgets`) ditambah bulan yang sedang dibaca (`month`). Dengan begitu
 * berpindah bulan tidak memerlukan permintaan jaringan baru.
 *
 * Di sini juga hidup reducer murni `applyOperation` yang membuat tampilan
 * berubah lebih dulu (optimistis) sebelum server menjawab.
 */

export interface LedgerState {
  transactions: Transaction[];
  /** Anggaran per bulan, diindeks "YYYY-MM". */
  budgets: Record<string, Budget>;
}

export type LedgerStatus = "idle" | "saving" | "error";

export interface LedgerValue extends LedgerState {
  /** Bulan yang sedang dibaca, "YYYY-MM". */
  month: string;
  /** Tanggal hari ini menurut server saat halaman dimuat. */
  today: string;
  period: Period;
  /** Anggaran bulan yang sedang dibaca; kosong kalau belum pernah diisi. */
  budget: Budget;
  status: LedgerStatus;
  /** Pesan terakhir ketika penyimpanan gagal. */
  error?: string;
  setMonth: (month: string) => void;
  /** Ambil ulang ledger dari server (mis. setelah draf email dikonfirmasi). */
  refresh: () => Promise<void>;
}

const EMPTY_STATE: LedgerState = {
  transactions: [],
  budgets: {},
};

export const LedgerContext = createContext<LedgerValue | null>(null);

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) {
    throw new Error("useLedger hanya boleh dipakai di dalam <LedgerProvider>.");
  }
  return value;
}

/** Bulan yang sedang dibaca, lengkap dengan hari berjalan dan pembandingnya. */
export function useActivePeriod(): Period {
  return useLedger().period;
}

export function budgetFor(state: LedgerState, month: string): Budget {
  return state.budgets[month] ?? EMPTY_BUDGET;
}

export function useLedgerSummary(): LedgerSummary {
  const { transactions, budget, period } = useLedger();
  return useMemo(
    () => summarizeLedger(transactions, budget, period),
    [transactions, budget, period],
  );
}

/** Urutan yang sama dengan kueri server: terbaru dulu. */
function byNewest(a: Transaction, b: Transaction) {
  return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort(byNewest);
}

/**
 * Terapkan satu perintah ke keadaan lokal. Murni, jadi bisa diuji tanpa React
 * dan hasilnya pasti sama dengan yang nanti dikembalikan server.
 */
export function applyOperation(
  state: LedgerState,
  operation: LedgerOperation,
): LedgerState {
  switch (operation.type) {
    case "upsert": {
      const incoming = new Map(
        operation.transactions.map((tx) => [tx.id, tx] as const),
      );
      const kept = state.transactions.filter((tx) => !incoming.has(tx.id));
      return {
        ...state,
        transactions: sortTransactions([
          ...operation.transactions,
          ...kept,
        ]),
      };
    }

    case "delete": {
      const removed = new Set(operation.ids);
      return {
        ...state,
        transactions: state.transactions.filter((tx) => !removed.has(tx.id)),
      };
    }

    case "budget":
      return {
        ...state,
        budgets: { ...state.budgets, [operation.month]: operation.budget },
      };

    case "replace":
      // Catatan diganti, anggaran tiap bulan dibiarkan apa adanya.
      return {
        ...state,
        transactions: sortTransactions(operation.transactions),
      };

    case "adopt":
      return {
        ...state,
        budgets: { ...state.budgets, [operation.month]: operation.budget },
        transactions: sortTransactions(operation.transactions),
      };
  }
}

type Dispatch = (operation: LedgerOperation) => void;

interface Bridge {
  snapshot: LedgerState;
  /** Bulan yang sedang dibaca, supaya fungsi di luar React menulis ke bulan yang benar. */
  month: string;
  dispatch: Dispatch;
}

/**
 * Jembatan ke provider. Fungsi perubahan di bawah dipanggil dari penangan
 * peristiwa di klien, jadi cukup satu jembatan per tab; `snapshot` hanya diisi
 * setelah komponen hidup di peramban, tidak pernah saat render di server.
 */
let bridge: Bridge | null = null;

export function setLedgerBridge(next: Bridge | null) {
  bridge = next;
}

function send(operation: LedgerOperation) {
  bridge?.dispatch(operation);
}

function current(): LedgerState {
  return bridge?.snapshot ?? EMPTY_STATE;
}

function currentMonth() {
  return bridge?.month ?? "";
}

function activeBudget(): Budget {
  return budgetFor(current(), currentMonth());
}

let idCounter = 0;

export function createId() {
  idCounter += 1;
  return `trx-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function clampAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function addTransaction(draft: TransactionDraft): Transaction {
  const transaction: Transaction = { ...draft, id: createId() };
  send({ type: "upsert", transactions: [transaction] });
  return transaction;
}

/** Tambah banyak catatan sekaligus (impor CSV) dalam satu perubahan. */
export function importTransactions(drafts: TransactionDraft[]): number {
  if (!drafts.length) return 0;
  const created = drafts.map((draft) => ({ ...draft, id: createId() }));
  send({ type: "upsert", transactions: created });
  return created.length;
}

export function updateTransaction(id: string, patch: Partial<TransactionDraft>) {
  const existing = current().transactions.find((tx) => tx.id === id);
  if (!existing) return;
  send({ type: "upsert", transactions: [{ ...existing, ...patch }] });
}

export function removeTransaction(id: string) {
  send({ type: "delete", ids: [id] });
}

export function restoreSeedLedger() {
  send({ type: "replace", transactions: SEED_TRANSACTIONS });
}

export function setBudgetTotal(total: number) {
  const month = currentMonth();
  if (!month) return;
  send({
    type: "budget",
    month,
    budget: { ...activeBudget(), total: clampAmount(total) },
  });
}

export function setBudgetLimit(category: CategoryKey, limit: number | null) {
  const month = currentMonth();
  if (!month) return;
  const limits = { ...activeBudget().limits };
  if (limit === null) {
    delete limits[category];
  } else {
    limits[category] = clampAmount(limit);
  }
  send({ type: "budget", month, budget: { ...activeBudget(), limits } });
}

/** Kembalikan anggaran bulan aktif ke nilai awal aplikasi. */
export function resetBudget() {
  const month = currentMonth();
  if (!month) return;
  send({ type: "budget", month, budget: DEFAULT_BUDGET });
}

/** Salin anggaran bulan lain ke bulan yang sedang dibaca. */
export function copyBudgetFrom(sourceMonth: string) {
  const month = currentMonth();
  if (!month || sourceMonth === month) return;
  const source = current().budgets[sourceMonth];
  if (!source) return;
  send({
    type: "budget",
    month,
    budget: { total: source.total, limits: { ...source.limits } },
  });
}
