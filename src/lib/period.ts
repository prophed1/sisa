import type { Budget, Transaction } from "@/lib/types";

/**
 * Bulan yang sedang dibaca bukan lagi konstanta di dalam kode: semuanya
 * diturunkan dari jam sungguhan, lalu bisa digeser ke bulan lain. Tanpa ini,
 * dasbor akan terus menampilkan Oktober 2026 selamanya dan tanggal di form
 * Catat menolak pengeluaran bulan berikutnya.
 */

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export interface Period {
  /** "2026-10" */
  key: string;
  year: number;
  /** 1 – 12 */
  monthIndex: number;
  /** "Oktober" */
  month: string;
  /** "Okt" */
  short: string;
  /** "Oktober 2026" */
  label: string;
  /** "1 – 19 Okt 2026" untuk bulan berjalan, satu bulan penuh untuk bulan lalu. */
  range: string;
  /** Bulan kalender sebelumnya, untuk pembanding. */
  previousKey: string;
  previousYear: number;
  previousMonthIndex: number;
  /** Hari ini menurut jam perangkat/server, dalam ISO. */
  today: string;
  daysInMonth: number;
  /** Hari yang sudah berjalan; bulan lalu penuh, bulan depan nol. */
  daysElapsed: number;
  isCurrent: boolean;
  isFuture: boolean;
}

const KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const pad = (value: number) => String(value).padStart(2, "0");

/** Tanggal lokal, bukan UTC: pergantian hari mengikuti pengguna, bukan server. */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function monthKeyOf(iso: string) {
  return iso.slice(0, 7);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

export function monthKeysOfYear(key: string) {
  return Number(key.slice(0, 4));
}

export function daysInMonthOf(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

/** Geser bulan tanpa terjebak pergantian tahun. */
export function shiftMonthKey(key: string, delta: number) {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const absolute = year * 12 + (month - 1) + delta;
  return `${Math.floor(absolute / 12)}-${pad((absolute % 12) + 1)}`;
}

export function periodFor(key: string, today = todayIso()): Period {
  const safeKey = isMonthKey(key) ? key : monthKeyOf(today);
  const year = Number(safeKey.slice(0, 4));
  const monthIndex = Number(safeKey.slice(5, 7));
  const currentKey = monthKeyOf(today);
  const isCurrent = safeKey === currentKey;
  const isFuture = safeKey > currentKey;
  const daysInMonth = daysInMonthOf(year, monthIndex);
  const daysElapsed = isCurrent
    ? Number(today.slice(8, 10))
    : isFuture
      ? 0
      : daysInMonth;
  const previousKey = shiftMonthKey(safeKey, -1);
  const short = MONTH_SHORT[monthIndex - 1];
  const rangeEnd = isCurrent ? daysElapsed : daysInMonth;

  return {
    key: safeKey,
    year,
    monthIndex,
    month: MONTH_LONG[monthIndex - 1],
    short,
    label: `${MONTH_LONG[monthIndex - 1]} ${year}`,
    range: `1 – ${rangeEnd} ${short} ${year}`,
    previousKey,
    previousYear: Number(previousKey.slice(0, 4)),
    previousMonthIndex: Number(previousKey.slice(5, 7)),
    today,
    daysInMonth,
    daysElapsed,
    isCurrent,
    isFuture,
  };
}

export function currentPeriod(today = todayIso()) {
  return periodFor(monthKeyOf(today), today);
}

/** Bulan paling awal yang masih masuk akal untuk dibuka. */
export function earliestMonthKey(
  transactions: Transaction[],
  today = todayIso(),
) {
  const keys = transactions.map((tx) => monthKeyOf(tx.date)).sort();
  return keys[0] ?? shiftMonthKey(monthKeyOf(today), -11);
}

/** Bulan terakhir yang boleh dibuka: satu bulan ke depan, untuk menyusun anggaran. */
export function latestMonthKey(today = todayIso()) {
  return shiftMonthKey(monthKeyOf(today), 1);
}

export function clampMonthKey(
  key: string,
  transactions: Transaction[],
  today = todayIso(),
) {
  const safe = isMonthKey(key) ? key : monthKeyOf(today);
  const min = earliestMonthKey(transactions, today);
  const max = latestMonthKey(today);
  if (safe < min) return min;
  if (safe > max) return max;
  return safe;
}

/**
 * Bulan yang dibuka pertama kali: bulan berjalan kalau sudah ada isinya,
 * kalau tidak bulan terakhir yang punya catatan. Akun baru tetap mulai dari
 * bulan berjalan.
 */
export function initialMonthKey(
  transactions: Transaction[],
  budgets: Record<string, Budget>,
  today = todayIso(),
) {
  const current = monthKeyOf(today);
  const hasCurrent =
    transactions.some((tx) => monthKeyOf(tx.date) === current) ||
    budgets[current] !== undefined;
  if (hasCurrent) return current;

  const latest = transactions
    .map((tx) => monthKeyOf(tx.date))
    .sort()
    .at(-1);
  return latest && latest <= current ? latest : current;
}

/** "Okt 2026" — dipakai tombol pemilih bulan. */
export function monthShortLabel(key: string) {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

/** "September" — dipakai kalimat seperti "salin dari September". */
export function monthLongName(key: string) {
  return MONTH_LONG[Number(key.slice(5, 7)) - 1];
}
