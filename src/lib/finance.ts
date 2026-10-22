import { CATEGORY_ORDER } from "@/lib/data/categories";
import { EMPTY_BUDGET, OPENING_BALANCE, SOURCE_META } from "@/lib/data/ledger-seed";
import {
  MONTH_SHORT,
  currentPeriod,
  monthKeyOf,
  type Period,
} from "@/lib/period";
import type {
  Budget,
  CategoryKey,
  DailyPoint,
  Transaction,
  TransactionSource,
} from "@/lib/types";
import { percent } from "@/lib/format";

/** Diteruskan dari modul periode supaya nama bulan tetap satu sumber. */
export { MONTH_SHORT };

export interface BudgetLineSummary {
  category: CategoryKey;
  limit: number;
  spent: number;
  ratio: number;
  over: boolean;
}

/** Perkiraan laju belanja terhadap anggaran bulan berjalan. */
export interface BudgetPace {
  /** Rata-rata belanja per hari sampai hari ini. */
  dailyAverage: number;
  /** Sisa hari kalender bulan ini. */
  daysLeft: number;
  /** Sisa anggaran dibagi sisa hari. */
  safePerDay: number;
  /** Hari saat anggaran benar-benar tembus; null kalau belum. */
  crossedDay: number | null;
  /** Perkiraan hari tembus dengan laju sekarang; null kalau tidak tembus. */
  projectedDay: number | null;
  /** Proyeksi total pengeluaran satu bulan penuh. */
  projectedTotal: number;
  /** Proyeksi masih di bawah anggaran. */
  onTrack: boolean;
}

export interface LedgerSummary {
  count: number;
  spending: number;
  income: number;
  balance: number;
  previousSpending: number;
  comparisonLabel: string;
  delta: number;
  budgetTotal: number;
  budgetUsed: number;
  budgetLeft: number;
  budgetLines: BudgetLineSummary[];
  byCategory: { category: CategoryKey; amount: number; count: number }[];
  sources: {
    source: TransactionSource;
    label: string;
    color: string;
    count: number;
  }[];
  daily: DailyPoint[];
  pace: BudgetPace;
  recent: Transaction[];
  biggest: Transaction | null;
  daysElapsed: number;
  dailyAverage: number;
  projected: number;
  overBudget: boolean;
}

const sum = (items: Transaction[]) =>
  items.reduce((total, item) => total + item.amount, 0);

export function dayOf(iso: string) {
  return Number(iso.slice(8, 10));
}

export function monthOf(iso: string) {
  return Number(iso.slice(5, 7));
}

export function yearOf(iso: string) {
  return Number(iso.slice(0, 4));
}

export function isInPeriod(iso: string, period: Period = currentPeriod()) {
  return (
    monthOf(iso) === period.monthIndex &&
    yearOf(iso) === period.year &&
    dayOf(iso) >= 1 &&
    dayOf(iso) <= period.daysInMonth
  );
}

export function formatDayLabel(iso: string) {
  return `${dayOf(iso)} ${MONTH_SHORT[monthOf(iso) - 1]}`;
}

export function formatLongDate(iso: string) {
  return `${dayOf(iso)} ${MONTH_SHORT[monthOf(iso) - 1]} ${yearOf(iso)}`;
}

export function transactionOrder(tx: Transaction) {
  return `${tx.date}T${tx.time}`;
}

export function byNewest(a: Transaction, b: Transaction) {
  return transactionOrder(b).localeCompare(transactionOrder(a));
}

export function summarizeLedger(
  transactions: Transaction[],
  budget: Budget = EMPTY_BUDGET,
  period: Period = currentPeriod(),
): LedgerSummary {
  const inPeriod = transactions.filter((tx) => isInPeriod(tx.date, period));
  const expenses = inPeriod.filter((tx) => tx.direction === "expense");
  const incomes = inPeriod.filter((tx) => tx.direction === "income");

  const spending = sum(expenses);
  const income = sum(incomes);

  const byCategory = CATEGORY_ORDER.map((category) => {
    const items = expenses.filter((tx) => tx.category === category);
    return { category, amount: sum(items), count: items.length };
  })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const highestDay = inPeriod.reduce(
    (highest, tx) => Math.max(highest, dayOf(tx.date)),
    0,
  );
  // Bulan yang belum berjalan dihitung sebagai satu bulan penuh (pembandingnya
  // bulan lalu penuh), dan bulan tanpa catatan tetap punya satu hari hitung
  // supaya rata-rata serta proyeksi tidak menjadi NaN.
  const windowDays = period.isFuture
    ? period.daysInMonth
    : Math.max(
        1,
        Math.min(period.daysInMonth, Math.max(period.daysElapsed, highestDay)),
      );

  // Pembanding diambil dari transaksi bulan sebelumnya, bukan angka tetap.
  const previousMonthIndex = period.previousMonthIndex;
  const previousYear = period.previousYear;
  const previousByDay = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.direction !== "expense") continue;
    if (
      monthOf(tx.date) !== previousMonthIndex ||
      yearOf(tx.date) !== previousYear
    ) {
      continue;
    }
    const day = dayOf(tx.date);
    previousByDay.set(day, (previousByDay.get(day) ?? 0) + tx.amount);
  }

  const daily: DailyPoint[] = Array.from({ length: windowDays }, (_, index) => {
    const day = index + 1;
    return {
      day,
      current: sum(expenses.filter((tx) => dayOf(tx.date) === day)),
      previous: previousByDay.get(day) ?? 0,
    };
  });

  const previousSpending = daily.reduce(
    (total, point) => total + point.previous,
    0,
  );

  const dailyAverage = spending / windowDays;
  const projected = dailyAverage * period.daysInMonth;
  const budgetLeft = budget.total - spending;
  const budgetUsed = percent(spending, budget.total);

  // Laju dihitung dari hari berjalan, lalu dipakai untuk memperkirakan kapan
  // anggaran tembus — angka yang jauh lebih berguna daripada sekadar persen.
  let crossedDay: number | null = null;
  let running = 0;
  if (budget.total > 0) {
    for (const point of daily) {
      running += point.current;
      if (running >= budget.total) {
        crossedDay = point.day;
        break;
      }
    }
  }
  const daysLeft = Math.max(period.daysInMonth - windowDays, 0);
  const projectedDay =
    budget.total > 0 && dailyAverage > 0
      ? Math.ceil(budget.total / dailyAverage)
      : null;
  const pace: BudgetPace = {
    dailyAverage,
    daysLeft,
    safePerDay: daysLeft > 0 ? Math.max(budgetLeft, 0) / daysLeft : 0,
    crossedDay,
    projectedDay,
    projectedTotal: projected,
    onTrack: budget.total === 0 || projected <= budget.total,
  };

  const budgetLines: BudgetLineSummary[] = CATEGORY_ORDER.filter(
    (category) => budget.limits[category] !== undefined,
  ).map((category) => {
    const limit = budget.limits[category] ?? 0;
    const spent = byCategory.find((entry) => entry.category === category)?.amount ?? 0;
    const ratio = percent(spent, limit);
    return { category, limit, spent, ratio, over: ratio > 100 };
  });

  const sources = (Object.keys(SOURCE_META) as TransactionSource[])
    .map((source) => ({
      source,
      ...SOURCE_META[source],
      count: inPeriod.filter((tx) => tx.source === source).length,
    }))
    .filter((entry) => entry.count > 0);

  const biggest = expenses.reduce<Transaction | null>(
    (largest, tx) => (!largest || tx.amount > largest.amount ? tx : largest),
    null,
  );

  // Saldo berjalan sampai akhir bulan yang dibaca, bukan hanya bulan itu:
  // membuka September tidak boleh menampilkan saldo seolah riwayat Juli–Agustus
  // tidak pernah terjadi.
  let balance = OPENING_BALANCE;
  for (const tx of transactions) {
    if (monthKeyOf(tx.date) > period.key) continue;
    balance += tx.direction === "income" ? tx.amount : -tx.amount;
  }

  return {
    count: inPeriod.length,
    spending,
    income,
    balance,
    previousSpending,
    comparisonLabel: `1 – ${windowDays} ${
      MONTH_SHORT[previousMonthIndex - 1]
    }`,
    delta: previousSpending
      ? ((spending - previousSpending) / previousSpending) * 100
      : 0,
    budgetTotal: budget.total,
    budgetUsed,
    budgetLeft,
    budgetLines,
    byCategory,
    sources,
    daily,
    pace,
    recent: [...transactions].sort(byNewest).slice(0, 9),
    biggest,
    daysElapsed: windowDays,
    dailyAverage,
    projected,
    overBudget: projected > budget.total,
  };
}
