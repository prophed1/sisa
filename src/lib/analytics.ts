import { CATEGORY_ORDER } from "@/lib/data/categories";
import { currentPeriod, todayIso } from "@/lib/period";
import {
  MONTH_SHORT,
  dayOf,
  formatLongDate,
  monthOf,
  yearOf,
} from "@/lib/finance";
import { formatIDR, formatPercent, percent } from "@/lib/format";
import type { CategoryKey, Transaction } from "@/lib/types";

export const WEEKDAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const WEEKDAY_FULL = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

/** Batas transaksi kecil untuk temuan "kebocoran". */
export const SMALL_EXPENSE = 50_000;

const pad = (value: number) => String(value).padStart(2, "0");

function utc(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoOf(ms: number) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

/** 0 = Senin … 6 = Minggu. */
export function weekdayOf(iso: string) {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function eachDay(from: string, to: string) {
  const start = utc(from);
  const end = utc(to);
  const days: string[] = [];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return days;
  }
  for (let cursor = start; cursor <= end; cursor += 86_400_000) {
    days.push(isoOf(cursor));
  }
  return days;
}

export function shiftDay(iso: string, amount: number) {
  return isoOf(utc(iso) + amount * 86_400_000);
}

export function firstDayOfMonth(iso: string) {
  return `${iso.slice(0, 8)}01`;
}

export function daysInMonthOf(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Hari pertama sampai terakhir pada bulan `iso`. */
export function monthBounds(iso: string) {
  const year = yearOf(iso);
  const month = monthOf(iso);
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(daysInMonthOf(year, month))}`,
  };
}

export function previousMonthBounds(iso: string) {
  const year = yearOf(iso);
  const month = monthOf(iso);
  const previous = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const bounds = monthBounds(
    `${previousYear}-${pad(previous)}-01`,
  );
  return bounds;
}

/** Tanggal yang sama pada bulan sebelumnya; dipakai untuk pembanding. */
function sameDayPreviousMonth(iso: string) {
  const month = monthOf(iso);
  const year = month === 1 ? yearOf(iso) - 1 : yearOf(iso);
  const previous = month === 1 ? 12 : month - 1;
  const day = Math.min(dayOf(iso), daysInMonthOf(year, previous));
  return `${year}-${pad(previous)}-${pad(day)}`;
}

/** Tanggal berikutnya untuk hari ke-`day` setelah `after`. */
export function nextOccurrence(day: number, after: string) {
  let year = yearOf(after);
  let month = monthOf(after);
  if (day <= dayOf(after)) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return `${year}-${pad(month)}-${pad(Math.min(day, daysInMonthOf(year, month)))}`;
}

export function rangeLabel(from: string, to: string, withYear = true) {
  const fromMonth = monthOf(from);
  const toMonth = monthOf(to);
  const year = withYear ? ` ${yearOf(to)}` : "";
  if (from === to) {
    return `${dayOf(from)} ${monthOfShort(fromMonth)}${year}`;
  }
  if (fromMonth === toMonth && yearOf(from) === yearOf(to)) {
    return `${dayOf(from)} – ${dayOf(to)} ${
      monthOfShort(fromMonth)
    }${year}`;
  }
  return `${dayOf(from)} ${monthOfShort(fromMonth)} – ${dayOf(to)} ${monthOfShort(
    toMonth,
  )}${year}`;
}

function monthOfShort(month: number) {
  return [
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
  ][month - 1];
}

export interface DayPoint {
  iso: string;
  day: number;
  weekday: number;
  amount: number;
  previous: number;
}

export interface WeekdayStat {
  index: number;
  label: string;
  full: string;
  amount: number;
  count: number;
  occurrences: number;
  average: number;
}

export interface MerchantStat {
  name: string;
  amount: number;
  count: number;
  share: number;
  category: CategoryKey | null;
  last: string;
  previousCount: number;
  /** Persentase perubahan nominal dibanding jendela sebelumnya. */
  delta: number | null;
}

export interface CategoryStat {
  category: CategoryKey;
  amount: number;
  count: number;
  share: number;
  average: number;
  previous: number;
  delta: number | null;
}

export interface WindowSummary {
  from: string;
  to: string;
  label: string;
  spending: number;
}

export interface RangeAnalysis {
  from: string;
  to: string;
  label: string;
  days: number;
  activeDays: number;
  transactionCount: number;
  expenseCount: number;
  income: number;
  spending: number;
  dailyAverage: number;
  median: number;
  largest: Transaction | null;
  peak: DayPoint | null;
  comparisonTotal: number;
  delta: number;
  previousWindow: WindowSummary | null;
  series: DayPoint[];
  weekdays: WeekdayStat[];
  merchants: MerchantStat[];
  categories: CategoryStat[];
  small: { count: number; amount: number };
}

/**
 * Menghitung seluruh angka halaman analisis dari satu rentang tanggal.
 * Pembandingnya adalah tanggal yang sama pada bulan sebelumnya.
 */
export function analyzeRange(
  transactions: Transaction[],
  from: string,
  to: string,
): RangeAnalysis {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const days = eachDay(start, end);

  const inRange = transactions.filter(
    (tx) => tx.date >= start && tx.date <= end,
  );
  const expenses = inRange.filter((tx) => tx.direction === "expense");
  const income = inRange
    .filter((tx) => tx.direction === "income")
    .reduce((total, tx) => total + tx.amount, 0);
  const spending = expenses.reduce((total, tx) => total + tx.amount, 0);

  const byDay = new Map<string, number>();
  for (const tx of expenses) {
    byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + tx.amount);
  }

  const allExpensesByDate = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.direction !== "expense") continue;
    allExpensesByDate.set(
      tx.date,
      (allExpensesByDate.get(tx.date) ?? 0) + tx.amount,
    );
  }

  const series: DayPoint[] = days.map((iso) => ({
    iso,
    day: dayOf(iso),
    weekday: weekdayOf(iso),
    amount: byDay.get(iso) ?? 0,
    previous: allExpensesByDate.get(sameDayPreviousMonth(iso)) ?? 0,
  }));

  const activeDays = series.filter((point) => point.amount > 0).length;
  const peak = series.reduce<DayPoint | null>(
    (best, point) => (!best || point.amount > best.amount ? point : best),
    null,
  );

  const comparisonTotal = series.reduce(
    (total, point) => total + point.previous,
    0,
  );

  const weekdays: WeekdayStat[] = WEEKDAY_SHORT.map((label, index) => {
    const points = series.filter((point) => point.weekday === index);
    const amount = points.reduce((total, point) => total + point.amount, 0);
    const count = expenses.filter(
      (tx) => weekdayOf(tx.date) === index,
    ).length;
    return {
      index,
      label,
      full: WEEKDAY_FULL[index],
      amount,
      count,
      occurrences: points.length,
      average: points.length ? amount / points.length : 0,
    };
  });

  // Pembanding: tanggal yang sama pada bulan sebelumnya, supaya setara dengan
  // angka "vs bulan lalu" di dasbor dan tidak terpengaruh panjang bulan.
  const previousWindow: WindowSummary | null = days.length
    ? {
        from: sameDayPreviousMonth(start),
        to: sameDayPreviousMonth(end),
        label: "",
        spending: 0,
      }
    : null;

  const previousExpenses = previousWindow
    ? transactions.filter(
        (tx) =>
          tx.direction === "expense" &&
          tx.date >= previousWindow.from &&
          tx.date <= previousWindow.to,
      )
    : [];

  if (previousWindow) {
    previousWindow.spending = previousExpenses.reduce(
      (total, tx) => total + tx.amount,
      0,
    );
    previousWindow.label = rangeLabel(
      previousWindow.from,
      previousWindow.to,
      false,
    );
  }

  const previousByCategory = new Map<CategoryKey, number>();
  for (const tx of previousExpenses) {
    if (!tx.category) continue;
    previousByCategory.set(
      tx.category,
      (previousByCategory.get(tx.category) ?? 0) + tx.amount,
    );
  }

  const categoryTotals = CATEGORY_ORDER.map((category) => {
    const items = expenses.filter((tx) => tx.category === category);
    const amount = items.reduce((total, tx) => total + tx.amount, 0);
    const previous = previousByCategory.get(category) ?? 0;
    return {
      category,
      amount,
      count: items.length,
      share: percent(amount, spending),
      average: items.length ? amount / items.length : 0,
      previous,
      delta: previous ? ((amount - previous) / previous) * 100 : null,
    };
  })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const merchantMap = new Map<
    string,
    { name: string; amount: number; count: number; last: string; categories: Map<CategoryKey, number> }
  >();
  for (const tx of expenses) {
    const key = tx.merchant.trim().toLowerCase();
    const existing = merchantMap.get(key);
    if (existing) {
      existing.amount += tx.amount;
      existing.count += 1;
      if (tx.date > existing.last) existing.last = tx.date;
      if (tx.category) {
        existing.categories.set(
          tx.category,
          (existing.categories.get(tx.category) ?? 0) + 1,
        );
      }
    } else {
      merchantMap.set(key, {
        name: tx.merchant.trim(),
        amount: tx.amount,
        count: 1,
        last: tx.date,
        categories: new Map(tx.category ? [[tx.category, 1]] : []),
      });
    }
  }

  const previousMerchants = new Map<string, { amount: number; count: number }>();
  for (const tx of previousExpenses) {
    const key = tx.merchant.trim().toLowerCase();
    const entry = previousMerchants.get(key) ?? { amount: 0, count: 0 };
    entry.amount += tx.amount;
    entry.count += 1;
    previousMerchants.set(key, entry);
  }

  const merchants: MerchantStat[] = [...merchantMap.entries()]
    .map(([key, entry]) => {
      const dominant = [...entry.categories.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];
      const before = previousMerchants.get(key)?.amount ?? 0;
      return {
        name: entry.name,
        amount: entry.amount,
        count: entry.count,
        last: entry.last,
        share: percent(entry.amount, spending),
        category: dominant ? dominant[0] : null,
        previousCount: previousMerchants.get(key)?.count ?? 0,
        delta: before ? ((entry.amount - before) / before) * 100 : null,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const smallItems = expenses.filter((tx) => tx.amount < SMALL_EXPENSE);
  const amounts = expenses.map((tx) => tx.amount).sort((a, b) => a - b);
  const largest = expenses.reduce<Transaction | null>(
    (best, tx) => (!best || tx.amount > best.amount ? tx : best),
    null,
  );

  return {
    from: start,
    to: end,
    label: rangeLabel(start, end),
    days: days.length,
    activeDays,
    transactionCount: inRange.length,
    expenseCount: expenses.length,
    income,
    spending,
    dailyAverage: days.length ? spending / days.length : 0,
    median: amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0,
    largest,
    peak: peak && peak.amount > 0 ? peak : null,
    comparisonTotal,
    delta: comparisonTotal
      ? ((spending - comparisonTotal) / comparisonTotal) * 100
      : 0,
    previousWindow,
    series,
    weekdays,
    merchants,
    categories: categoryTotals,
    small: {
      count: smallItems.length,
      amount: smallItems.reduce((total, tx) => total + tx.amount, 0),
    },
  };
}

export interface Insight {
  label: string;
  title: string;
  detail: string;
}

/** Tiga temuan paling menentukan, ditulis sebagai kalimat biasa. */
export interface MonthPoint {
  key: string;
  year: number;
  month: number;
  /** "September 2026" */
  label: string;
  /** "Sep" */
  short: string;
  spending: number;
  income: number;
  count: number;
  /** Bulan berjalan yang belum penuh. */
  partial: boolean;
  /** Jumlah hari pembanding kalau delta memakai periode yang sama. */
  comparedDays: number | null;
  delta: number | null;
}

const MONTH_LONG = [
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

function previousMonthKey(key: string) {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const previous = month === 1 ? 12 : month - 1;
  return `${month === 1 ? year - 1 : year}-${pad(previous)}`;
}

/** Total per bulan untuk seluruh riwayat yang tersedia. */
export function monthlySeries(
  transactions: Transaction[],
  count = 6,
  today = todayIso(),
): MonthPoint[] {
  const current = currentPeriod(today);
  const totals = new Map<
    string,
    { spending: number; income: number; count: number }
  >();

  const byDay = new Map<string, number>();

  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    const entry = totals.get(key) ?? { spending: 0, income: 0, count: 0 };
    if (tx.direction === "expense") {
      entry.spending += tx.amount;
      byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + tx.amount);
    } else {
      entry.income += tx.amount;
    }
    entry.count += 1;
    totals.set(key, entry);
  }

  return [...totals.keys()]
    .sort()
    .slice(-count)
    .map((key) => {
      const year = Number(key.slice(0, 4));
      const month = Number(key.slice(5, 7));
      const entry = totals.get(key) ?? { spending: 0, income: 0, count: 0 };
      const partial =
        key === current.key &&
        current.daysElapsed < current.daysInMonth;
      const previousKey = previousMonthKey(key);
      // Bulan berjalan diadu dengan tanggal yang sama bulan lalu, bukan dengan
      // satu bulan penuh — kalau tidak, 17 hari selalu terlihat lebih hemat.
      const previousDays = new Date(
        Date.UTC(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, 0),
      ).getUTCDate();
      const comparedDays = partial
        ? Math.min(current.daysElapsed, previousDays)
        : null;
      const before =
        comparedDays === null
          ? totals.get(previousKey)?.spending ?? 0
          : eachDay(`${previousKey}-01`, `${previousKey}-${pad(comparedDays)}`).reduce(
              (total, day) => total + (byDay.get(day) ?? 0),
              0,
            );
      return {
        key,
        year,
        month,
        label: `${MONTH_LONG[month - 1]} ${year}`,
        short: MONTH_SHORT[month - 1],
        spending: entry.spending,
        income: entry.income,
        count: entry.count,
        partial,
        comparedDays,
        delta: before ? ((entry.spending - before) / before) * 100 : null,
      };
    });
}

export interface RecurringItem {
  merchant: string;
  category: CategoryKey | null;
  /** Nominal tengah dari seluruh kemunculan. */
  amount: number;
  /** Jumlah bulan berbeda tempat ini muncul. */
  months: number;
  occurrences: number;
  /** (termahal − termurah) ÷ nominal tengah. */
  spread: number;
  day: number;
  lastDate: string;
  nextDate: string;
  total: number;
}

/**
 * Mencari pengeluaran yang datang lagi tiap bulan: merchant sama, minimal tiga
 * bulan berbeda, paling banyak dua kali per bulan, dan nominalnya stabil
 * (selisih termahal–termurah tidak lebih dari 15% nominal tengah).
 */
export function detectRecurring(
  transactions: Transaction[],
  today = todayIso(),
): RecurringItem[] {
  interface Group {
    name: string;
    category: CategoryKey | null;
    perMonth: Map<string, number>;
    entries: { date: string; amount: number }[];
  }

  const groups = new Map<string, Group>();

  for (const tx of transactions) {
    if (tx.direction !== "expense") continue;
    const key = tx.merchant.trim().toLowerCase();
    const entry = groups.get(key) ?? {
      name: tx.merchant.trim(),
      category: tx.category,
      perMonth: new Map<string, number>(),
      entries: [],
    };
    const monthKey = tx.date.slice(0, 7);
    entry.perMonth.set(monthKey, (entry.perMonth.get(monthKey) ?? 0) + 1);
    entry.entries.push({ date: tx.date, amount: tx.amount });
    groups.set(key, entry);
  }

  const items: RecurringItem[] = [];

  for (const entry of groups.values()) {
    const monthKeys = [...entry.perMonth.keys()];
    if (monthKeys.length < 3) continue;
    if (Math.max(...entry.perMonth.values()) > 2) continue;

    const occurrences = entry.entries.length;
    if (occurrences > monthKeys.length * 1.5) continue;

    const amounts = entry.entries.map((item) => item.amount).sort((a, b) => a - b);
    const amount = amounts[Math.floor(amounts.length / 2)];
    if (!amount) continue;

    const spread = (amounts[amounts.length - 1] - amounts[0]) / amount;
    if (spread > 0.15) continue;

    // Tanggalnya juga harus konsisten: paling jauh empat hari dari titik tengah.
    const days = entry.entries
      .map((item) => dayOf(item.date))
      .sort((a, b) => a - b);
    const medianDay = days[Math.floor(days.length / 2)];
    if (days.some((value) => Math.abs(value - medianDay) > 4)) continue;

    const last = entry.entries.reduce(
      (best, item) => (item.date > best.date ? item : best),
      entry.entries[0],
    );

    items.push({
      merchant: entry.name,
      category: entry.category,
      amount,
      months: monthKeys.length,
      occurrences,
      spread,
      day: medianDay,
      lastDate: last.date,
      nextDate: nextOccurrence(medianDay, today),
      total: entry.entries.reduce((sum, item) => sum + item.amount, 0),
    });
  }

  return items.sort((a, b) => b.amount - a.amount);
}

export function buildInsights(analysis: RangeAnalysis): Insight[] {
  if (!analysis.expenseCount) return [];
  const insights: Insight[] = [];

  if (analysis.peak) {
    const multiple = analysis.dailyAverage
      ? analysis.peak.amount / analysis.dailyAverage
      : 0;
    insights.push({
      label: "Hari termahal",
      title: `${WEEKDAY_FULL[analysis.peak.weekday]}, ${formatLongDate(
        analysis.peak.iso,
      )}`,
      detail: `${formatIDR(analysis.peak.amount)} dalam sehari — ${multiple
        .toFixed(1)
        .replace(".", ",")}× rata-rata harian periode ini.`,
    });
  }

  const ranked = [...analysis.weekdays]
    .filter((day) => day.occurrences > 0 && day.average > 0)
    .sort((a, b) => b.average - a.average);

  if (ranked.length > 1) {
    const high = ranked[0];
    const low = ranked[ranked.length - 1];
    insights.push({
      label: "Ritme mingguan",
      title: `${high.full} paling mahal, ${low.full} paling hemat`,
      detail: `${formatIDR(high.average)} vs ${formatIDR(
        low.average,
      )} rata-rata per hari. Selisihnya ${formatIDR(
        high.average - low.average,
      )}.`,
    });
  }

  if (analysis.small.count >= 5) {
    insights.push({
      label: "Kebocoran kecil",
      title: `${analysis.small.count} transaksi di bawah ${formatIDR(
        SMALL_EXPENSE,
      )}`,
      detail: `Kalau digabung jadi ${formatIDR(
        analysis.small.amount,
      )} — ${formatPercent(
        percent(analysis.small.amount, analysis.spending),
      )} dari seluruh pengeluaran.`,
    });
  }

  const frequent = [...analysis.merchants].sort((a, b) => b.count - a.count)[0];
  if (frequent && frequent.count >= 3) {
    insights.push({
      label: "Kebiasaan berulang",
      title: `${frequent.name} muncul ${frequent.count} kali`,
      detail: `Total ${formatIDR(frequent.amount)} atau ${formatPercent(
        frequent.share,
      )} dari pengeluaran periode ini.`,
    });
  }

  return insights.slice(0, 3);
}
