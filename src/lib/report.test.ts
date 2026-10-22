import { describe, expect, it } from "vitest";
import {
  bucketByMonth,
  buildReport,
  daysInRange,
  inRange,
  isIsoDate,
  normalizeRange,
  rangePresets,
} from "@/lib/report";
import type { Transaction } from "@/lib/types";

const tx = (
  id: string,
  date: string,
  amount: number,
  extra: Partial<Transaction> = {},
): Transaction => ({
  id,
  date,
  time: "12:00",
  merchant: id,
  amount,
  direction: "expense",
  category: "makanan",
  source: "manual",
  ...extra,
});

const TODAY = "2026-10-20";

const ledger: Transaction[] = [
  tx("sep-awal", "2026-09-01", 10_000),
  tx("sep-tengah", "2026-09-20", 20_000),
  tx("okt-awal", "2026-10-01", 30_000),
  tx("okt-tengah", "2026-10-05", 40_000),
  tx("okt-kini", "2026-10-20", 50_000, { category: "belanja" }),
  tx("gaji", "2026-10-02", 900_000, {
    direction: "income",
    category: null,
    source: "email",
  }),
];

describe("rentang tanggal", () => {
  it("menghitung hari secara inklusif", () => {
    expect(daysInRange({ from: "2026-10-01", to: "2026-10-01" })).toBe(1);
    expect(daysInRange({ from: "2026-09-20", to: "2026-10-05" })).toBe(16);
    expect(daysInRange({ from: "2026-02-01", to: "2026-03-01" })).toBe(29);
  });

  it("menukar rentang terbalik alih-alih mengosongkannya", () => {
    expect(normalizeRange("2026-10-05", "2026-09-20")).toEqual({
      from: "2026-09-20",
      to: "2026-10-05",
    });
  });

  it("hanya menerima tanggal yang benar-benar ada", () => {
    expect(isIsoDate("2026-10-20")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("20/10/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("memasukkan kedua ujung rentang", () => {
    const range = { from: "2026-10-01", to: "2026-10-05" };
    expect(inRange("2026-10-01", range)).toBe(true);
    expect(inRange("2026-10-05", range)).toBe(true);
    expect(inRange("2026-10-06", range)).toBe(false);
    expect(inRange("2026-09-30", range)).toBe(false);
  });
});

describe("rangePresets", () => {
  const presets = rangePresets(TODAY);

  it("menyediakan empat pintasan yang diminta", () => {
    expect(presets.map((preset) => preset.key)).toEqual([
      "bulan-ini",
      "bulan-lalu-penuh",
      "lintas-bulan",
      "tiga-puluh-hari",
    ]);
  });

  it("bulan ini mulai tanggal 1 sampai hari ini", () => {
    expect(presets[0]).toMatchObject({ from: "2026-10-01", to: TODAY });
  });

  it("bulan lalu memakai satu bulan penuh di tahun yang sama", () => {
    expect(presets[1]).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("lintas bulan: awal bulan lalu sampai hari ini", () => {
    expect(presets[2]).toMatchObject({ from: "2026-09-01", to: TODAY });
  });

  it("30 hari terakhir mencakup hari ini", () => {
    expect(presets[3]).toMatchObject({ from: "2026-09-21", to: TODAY });
    expect(daysInRange(presets[3])).toBe(30);
  });

  it("tetap benar saat pergantian tahun", () => {
    const january = rangePresets("2026-01-05");
    expect(january[1]).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("buildReport", () => {
  it("menghitung rentang lintas bulan tanpa kehilangan ujungnya", () => {
    const report = buildReport(ledger, { from: "2026-09-20", to: "2026-10-05" });
    expect(report.rows.map((row) => row.id)).toEqual([
      "sep-tengah",
      "okt-awal",
      "gaji",
      "okt-tengah",
    ]);
    expect(report.expense).toBe(90_000);
    expect(report.income).toBe(900_000);
    expect(report.net).toBe(810_000);
    expect(report.count).toBe(4);
    expect(report.days).toBe(16);
    expect(report.dailyAverage).toBe(5_625);
  });

  it("menandai rentang terbalik tetapi tetap menghitungnya", () => {
    const report = buildReport(ledger, { from: "2026-10-05", to: "2026-09-20" });
    expect(report.reversed).toBe(true);
    expect(report.range).toEqual({ from: "2026-09-20", to: "2026-10-05" });
    expect(report.count).toBe(4);
  });

  it("membagi kategori menurut pengeluaran saja", () => {
    const report = buildReport(ledger, { from: "2026-10-01", to: "2026-10-31" });
    expect(report.expense).toBe(120_000);
    expect(report.byCategory.map((row) => row.category)).toEqual([
      "makanan",
      "belanja",
    ]);
    const total = report.byCategory.reduce((sum, row) => sum + row.share, 0);
    expect(total).toBeCloseTo(100, 5);
    expect(report.byCategory[0].amount).toBe(70_000);
  });

  it("menampilkan pengeluaran tanpa kategori supaya rincian berjumlah total", () => {
    const withUncategorized = [
      ...ledger,
      tx("tanpa-kategori", "2026-10-06", 15_000, { category: null }),
    ];
    const report = buildReport(withUncategorized, {
      from: "2026-10-01",
      to: "2026-10-31",
    });

    const uncategorized = report.byCategory.find((row) => row.category === null);
    expect(uncategorized).toMatchObject({ label: "Tanpa kategori", amount: 15_000 });
    const total = report.byCategory.reduce((sum, row) => sum + row.amount, 0);
    expect(total).toBe(report.expense);
  });

  it("menyediakan batas tanggal dari data yang ada", () => {
    const report = buildReport(ledger, { from: TODAY, to: TODAY });
    expect(report.bounds).toEqual({ from: "2026-09-01", to: TODAY });
  });

  it("aman untuk rentang kosong", () => {
    const report = buildReport(ledger, { from: "2025-01-01", to: "2025-01-31" });
    expect(report.count).toBe(0);
    expect(report.expense).toBe(0);
    expect(report.dailyAverage).toBe(0);
    expect(report.biggest).toBeNull();
  });
});

describe("bucketByMonth", () => {
  it("mengelompokkan baris menjadi deret bulan yang urut", () => {
    const buckets = bucketByMonth(ledger);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-09", "2026-10"]);
    expect(buckets[0]).toMatchObject({ expense: 30_000, count: 2 });
    expect(buckets[1]).toMatchObject({ expense: 120_000, income: 900_000 });
  });
});
