import { CATEGORY_ORDER } from "@/lib/data/categories";
import type {
  Budget,
  CategoryKey,
  Transaction,
  TransactionDirection,
  TransactionSource,
} from "@/lib/types";

/**
 * Batas antara peramban dan database. Semua yang datang dari klien lewat
 * `/api/ledger` dianggap tidak dipercaya: bentuknya diperiksa, panjang teks
 * dibatasi, dan angka dibulatkan sebelum sempat menyentuh Postgres.
 */

const CATEGORIES = new Set<string>(CATEGORY_ORDER);
const DIRECTIONS = new Set<string>(["expense", "income"]);
const SOURCES = new Set<string>(["manual", "email", "scan", "system"]);

const MAX_ID = 64;
const MAX_MERCHANT = 160;
const MAX_NOTE = 400;
/** Satu catatan tidak mungkin lebih dari seribu miliar rupiah. */
const MAX_AMOUNT = 1_000_000_000_000;
/** Sekali kirim, tidak lebih dari ini; lebih dari itu bukan impor pribadi. */
export const MAX_BATCH = 5_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

function amount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_AMOUNT) return null;
  return Math.round(parsed);
}

/** Anggaran ditulis ke satu bulan; "2026-10" saja yang diterima. */
function monthKey(value: unknown): string | null {
  if (typeof value !== "string" || !MONTH_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100 ? value : null;
}

/** Tanggal harus berbentuk ISO dan benar-benar ada (31 Februari ditolak). */
function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? value : null;
}

export function parseTransaction(value: unknown): Transaction | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const id = text(raw.id, MAX_ID);
  const date = isoDate(raw.date);
  const time = typeof raw.time === "string" && TIME_PATTERN.test(raw.time)
    ? raw.time
    : null;
  const merchant = text(raw.merchant, MAX_MERCHANT);
  const money = amount(raw.amount);

  if (!id || !date || !time || !merchant || money === null) return null;
  if (typeof raw.direction !== "string" || !DIRECTIONS.has(raw.direction)) {
    return null;
  }

  const category = typeof raw.category === "string" && CATEGORIES.has(raw.category)
    ? (raw.category as CategoryKey)
    : null;
  const source = typeof raw.source === "string" && SOURCES.has(raw.source)
    ? (raw.source as TransactionSource)
    : "manual";

  return {
    id,
    date,
    time,
    merchant,
    note: text(raw.note, MAX_NOTE) ?? undefined,
    category,
    amount: money,
    direction: raw.direction as TransactionDirection,
    source,
  };
}

/** Catatan yang tidak lolos pemeriksaan dibuang, bukan menggagalkan semuanya. */
export function parseTransactions(value: unknown): Transaction[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_BATCH) return null;
  const parsed: Transaction[] = [];
  for (const entry of value) {
    const tx = parseTransaction(entry);
    if (tx) parsed.push(tx);
  }
  return parsed;
}

export function parseBudget(value: unknown): Budget | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const total = amount(raw.total);
  if (total === null) return null;

  const limits: Partial<Record<CategoryKey, number>> = {};
  if (raw.limits && typeof raw.limits === "object") {
    for (const [key, limit] of Object.entries(
      raw.limits as Record<string, unknown>,
    )) {
      const parsed = amount(limit);
      if (CATEGORIES.has(key) && parsed !== null) {
        limits[key as CategoryKey] = parsed;
      }
    }
  }

  return { total, limits };
}

/** Satu perintah perubahan ledger; bentuknya sama di klien dan di server. */
export type LedgerOperation =
  | { type: "upsert"; transactions: Transaction[] }
  | { type: "delete"; ids: string[] }
  | { type: "budget"; month: string; budget: Budget }
  | { type: "replace"; transactions: Transaction[] }
  | { type: "adopt"; month: string; transactions: Transaction[]; budget: Budget };

/**
 * Terjemahkan badan permintaan menjadi perintah yang dikenali. `null` berarti
 * badan permintaannya tidak masuk akal dan harus dijawab 400.
 */
export function parseOperation(value: unknown): LedgerOperation | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  switch (raw.type) {
    case "upsert": {
      const transactions = parseTransactions(raw.transactions);
      return transactions ? { type: "upsert", transactions } : null;
    }
    case "delete": {
      if (!Array.isArray(raw.ids)) return null;
      if (raw.ids.length > MAX_BATCH) return null;
      const ids = raw.ids
        .map((id) => text(id, MAX_ID))
        .filter((id): id is string => id !== null);
      return ids.length ? { type: "delete", ids } : null;
    }
    case "budget": {
      const month = monthKey(raw.month);
      const budget = parseBudget(raw.budget);
      return month && budget ? { type: "budget", month, budget } : null;
    }
    case "replace": {
      const transactions = parseTransactions(raw.transactions);
      return transactions ? { type: "replace", transactions } : null;
    }
    case "adopt": {
      const month = monthKey(raw.month);
      const transactions = parseTransactions(raw.transactions);
      const budget = parseBudget(raw.budget);
      if (!month || !transactions || !budget) return null;
      return { type: "adopt", month, transactions, budget };
    }
    default:
      return null;
  }
}
