import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import { SOURCE_META } from "@/lib/data/ledger-seed";
import { formatDayLabel, formatLongDate } from "@/lib/finance";
import {
  MONTH_SHORT,
  daysInMonthOf,
  monthKeyOf,
  shiftMonthKey,
  todayIso,
} from "@/lib/period";
import type { CategoryKey, Transaction, TransactionSource } from "@/lib/types";

/**
 * Laporan memakai rentang tanggal bebas, bukan bulan kalender. Dasbor tetap
 * per bulan karena anggaran memang bulanan, tetapi orang sering perlu
 * "20 Sep – 5 Okt" atau "1 Agu – 31 Agu" — dan itu tidak bisa diwakili kunci
 * bulan.
 */

export interface DateRange {
  /** "2026-09-20" */
  from: string;
  /** "2026-10-05" */
  to: string;
}

export const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  // Tolak tanggal yang tidak ada, mis. 2026-02-30.
  const [year, month, day] = value.split("-").map(Number);
  // daysInMonthOf memakai bulan 1–12, sama seperti period.ts.
  return day >= 1 && day <= daysInMonthOf(year, month);
}

/** Rentang selalu terurut; masukan terbalik ditukar, bukan ditolak. */
export function normalizeRange(from: string, to: string): DateRange {
  return from <= to ? { from, to } : { from: to, to: from };
}

export function inRange(iso: string, range: DateRange) {
  return iso >= range.from && iso <= range.to;
}

/** Jumlah hari dalam rentang, inklusif: 1 Okt – 1 Okt = 1 hari. */
export function daysInRange(range: DateRange) {
  const start = Date.parse(`${range.from}T00:00:00Z`);
  const end = Date.parse(`${range.to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** "1 Sep 2026 – 5 Okt 2026", atau satu tanggal kalau rentangnya sehari. */
export function formatRangeLabel(range: DateRange) {
  if (range.from === range.to) return formatLongDate(range.from);
  return `${formatLongDate(range.from)} – ${formatLongDate(range.to)}`;
}

export function rangeFilename(range: DateRange) {
  return `sisa-laporan-${range.from}-${range.to}`;
}

export interface ReportPreset extends DateRange {
  key: string;
  label: string;
}

function firstOfMonth(key: string) {
  return `${key}-01`;
}

function lastOfMonth(key: string) {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return `${key}-${String(daysInMonthOf(year, month)).padStart(2, "0")}`;
}

function shiftDays(iso: string, delta: number) {
  const base = Date.parse(`${iso}T00:00:00Z`);
  const moved = new Date(base + delta * 86_400_000);
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(moved.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Pintasan yang menutup kasus umum: bulan berjalan, bulan lalu penuh, bulan
 * lalu sampai hari ini (rentang lintas bulan), dan 30 hari terakhir. Semua
 * dihitung dari tanggal server supaya tidak bergeser mengikuti zona waktu
 * peramban.
 */
export function rangePresets(today = todayIso()): ReportPreset[] {
  const currentKey = monthKeyOf(today);
  const previousKey = shiftMonthKey(currentKey, -1);
  const thisMonth = { from: firstOfMonth(currentKey), to: today };

  return [
    { key: "bulan-ini", label: "Bulan ini", ...thisMonth },
    {
      key: "bulan-lalu-penuh",
      label: "Bulan lalu penuh",
      from: firstOfMonth(previousKey),
      to: lastOfMonth(previousKey),
    },
    {
      key: "lintas-bulan",
      label: `Awal ${MONTH_SHORT[Number(previousKey.slice(5, 7)) - 1]} – hari ini`,
      from: firstOfMonth(previousKey),
      to: today,
    },
    {
      key: "tiga-puluh-hari",
      label: "30 hari terakhir",
      from: shiftDays(today, -29),
      to: today,
    },
  ];
}

export interface ReportCategoryRow {
  /** `null` untuk pengeluaran tanpa kategori, supaya rincian tetap berjumlah total. */
  category: CategoryKey | null;
  label: string;
  amount: number;
  count: number;
  /** Porsi terhadap total pengeluaran, 0–100. */
  share: number;
}

export interface ReportSourceRow {
  source: TransactionSource;
  label: string;
  count: number;
  amount: number;
}

export interface Report {
  range: DateRange;
  /** Rentang terbalik ditandai supaya UI bisa memperingatkan. */
  reversed: boolean;
  days: number;
  count: number;
  expense: number;
  income: number;
  /** Pemasukan dikurangi pengeluaran. */
  net: number;
  /** Rata-rata pengeluaran per hari dalam rentang. */
  dailyAverage: number;
  biggest: Transaction | null;
  byCategory: ReportCategoryRow[];
  bySource: ReportSourceRow[];
  /** Kronologis lama → baru, siap dicetak. */
  rows: Transaction[];
  /** Tanggal paling awal dan paling akhir yang benar-benar punya catatan. */
  bounds: { from: string; to: string } | null;
}

const sum = (items: Transaction[]) =>
  items.reduce((total, item) => total + item.amount, 0);

/**
 * Ringkasan satu rentang. Semua angka diturunkan dari daftar transaksi yang
 * diberikan, jadi laporan dan dasbor tidak mungkin berbeda rumus.
 */
export function buildReport(
  transactions: Transaction[],
  range: DateRange,
): Report {
  const reversed = range.from > range.to;
  const ordered = normalizeRange(range.from, range.to);

  const rows = transactions
    .filter((tx) => inRange(tx.date, ordered))
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    );

  const expenses = rows.filter((tx) => tx.direction === "expense");
  const incomes = rows.filter((tx) => tx.direction === "income");
  const expense = sum(expenses);
  const income = sum(incomes);
  const days = Math.max(daysInRange(ordered), 1);

  const byCategory: ReportCategoryRow[] = CATEGORY_ORDER.map((category) => {
    const items = expenses.filter((tx) => tx.category === category);
    return {
      category,
      label: CATEGORY_META[category].label,
      amount: sum(items),
      count: items.length,
      share: expense ? (sum(items) / expense) * 100 : 0,
    };
  }).filter((row) => row.amount > 0);

  // Pengeluaran yang belum dikategorikan tetap ditampilkan; tanpa baris ini
  // jumlah kategori tidak sama dengan total di ringkasan atas.
  const uncategorized = expenses.filter((tx) => !tx.category);
  if (uncategorized.length) {
    const amount = sum(uncategorized);
    byCategory.push({
      category: null,
      label: "Tanpa kategori",
      amount,
      count: uncategorized.length,
      share: expense ? (amount / expense) * 100 : 0,
    });
  }

  byCategory.sort((a, b) => b.amount - a.amount);

  const bySource: ReportSourceRow[] = (
    Object.keys(SOURCE_META) as TransactionSource[]
  )
    .map((source) => {
      const items = rows.filter((tx) => tx.source === source);
      return {
        source,
        label: SOURCE_META[source].label,
        count: items.length,
        amount: sum(items),
      };
    })
    .filter((row) => row.count > 0);

  const biggest = expenses.reduce<Transaction | null>(
    (largest, tx) => (!largest || tx.amount > largest.amount ? tx : largest),
    null,
  );

  const dates = transactions.map((tx) => tx.date).sort();

  return {
    range: ordered,
    reversed,
    days,
    count: rows.length,
    expense,
    income,
    net: income - expense,
    dailyAverage: expense / days,
    biggest,
    byCategory,
    bySource,
    rows,
    bounds: dates.length
      ? { from: dates[0], to: dates[dates.length - 1] }
      : null,
  };
}

/** Baris tabel di halaman: satu transaksi, sudah dilabeli untuk dibaca. */
export function reportRowLabels(transaction: Transaction) {
  return {
    date: formatLongDate(transaction.date),
    day: formatDayLabel(transaction.date),
    time: transaction.time,
    merchant: transaction.merchant,
    note: transaction.note ?? "",
    category: transaction.category
      ? CATEGORY_META[transaction.category].label
      : "Pemasukan",
    source: SOURCE_META[transaction.source].label,
    direction: transaction.direction === "income" ? "Masuk" : "Keluar",
  };
}

export interface MonthBucket {
  key: string;
  label: string;
  expense: number;
  income: number;
  count: number;
}

/**
 * Rekap per bulan untuk rentang apa pun — dipakai bagian "menurut bulan" di
 * laporan supaya rentang lintas bulan tetap terbaca sebagai deret.
 */
export function bucketByMonth(rows: Transaction[]): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();
  for (const tx of rows) {
    const key = monthKeyOf(tx.date);
    const bucket =
      buckets.get(key) ??
      ({
        key,
        label: `${MONTH_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
        expense: 0,
        income: 0,
        count: 0,
      } satisfies MonthBucket);
    if (tx.direction === "income") bucket.income += tx.amount;
    else bucket.expense += tx.amount;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}
