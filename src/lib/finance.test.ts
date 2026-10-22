import { describe, expect, it } from "vitest";
import { summarizeLedger } from "@/lib/finance";
import { periodFor } from "@/lib/period";
import type { Budget, Transaction } from "@/lib/types";

/** Oktober 2026 dengan 17 hari berjalan, sama seperti data contoh. */
const period = periodFor("2026-10", "2026-10-17");

const october = (day: number, amount: number): Transaction => ({
  id: `t-${day}-${amount}`,
  date: `2026-10-${String(day).padStart(2, "0")}`,
  time: "10:00",
  merchant: "Uji",
  category: "belanja",
  amount,
  direction: "expense",
  source: "manual",
});

const budget: Budget = { total: 1_000_000, limits: {} };

describe("summarizeLedger — laju anggaran", () => {
  it("menghitung rata-rata harian dan sisa aman per hari", () => {
    const summary = summarizeLedger([october(1, 100_000)], budget, period);
    expect(summary.pace.dailyAverage).toBeCloseTo(100_000 / period.daysElapsed);
    expect(summary.pace.daysLeft).toBe(period.daysInMonth - period.daysElapsed);
    expect(summary.pace.safePerDay).toBeCloseTo(900_000 / 14);
    expect(summary.pace.onTrack).toBe(true);
    expect(summary.pace.crossedDay).toBeNull();
  });

  it("menandai hari saat anggaran benar-benar tembus", () => {
    const summary = summarizeLedger(
      [october(1, 200_000), october(2, 900_000)],
      budget,
      period,
    );
    expect(summary.pace.crossedDay).toBe(2);
    expect(summary.pace.onTrack).toBe(false);
  });

  it("memperkirakan hari tembus saat laju tinggi tapi belum lewat", () => {
    const summary = summarizeLedger([october(1, 600_000)], budget, period);
    expect(summary.pace.crossedDay).toBeNull();
    expect(summary.pace.projectedDay).toBe(29);
    expect(summary.pace.projectedDay! < period.daysInMonth).toBe(true);
    expect(summary.pace.projectedTotal).toBeGreaterThan(budget.total);
    expect(summary.pace.onTrack).toBe(false);
  });

  it("tidak menghitung apa pun saat anggaran nol", () => {
    const summary = summarizeLedger(
      [october(1, 100_000)],
      { total: 0, limits: {} },
      period,
    );
    expect(summary.pace.projectedDay).toBeNull();
    expect(summary.pace.crossedDay).toBeNull();
    expect(summary.pace.onTrack).toBe(true);
  });

  it("tidak melewati anggaran saat laju rendah", () => {
    const summary = summarizeLedger([october(3, 50_000)], budget, period);
    expect(summary.pace.projectedTotal).toBeLessThan(budget.total);
    expect(summary.pace.projectedDay).not.toBeNull();
    expect(summary.pace.projectedDay! > period.daysInMonth).toBe(true);
  });
});

describe("summarizeLedger — bulan yang dibaca", () => {
  it("memakai satu bulan penuh untuk bulan yang sudah lewat", () => {
    const september: Transaction = {
      ...october(5, 300_000),
      date: "2026-09-05",
    };
    const summary = summarizeLedger(
      [september, october(2, 999_000)],
      budget,
      periodFor("2026-09", "2026-10-17"),
    );
    expect(summary.count).toBe(1);
    expect(summary.spending).toBe(300_000);
    expect(summary.daysElapsed).toBe(30);
    expect(summary.comparisonLabel).toBe("1 – 30 Agu");
  });

  it("tidak menghasilkan NaN untuk bulan tanpa catatan", () => {
    const summary = summarizeLedger(
      [october(2, 100_000)],
      { total: 0, limits: {} },
      periodFor("2026-12", "2026-10-17"),
    );
    expect(summary.count).toBe(0);
    expect(Number.isFinite(summary.pace.dailyAverage)).toBe(true);
    expect(Number.isFinite(summary.pace.projectedTotal)).toBe(true);
    expect(summary.pace.projectedDay).toBeNull();
  });

  it("menghitung saldo sampai akhir bulan yang dibaca", () => {
    const income: Transaction = {
      ...october(1, 0),
      direction: "income",
      category: null,
      amount: 2_000_000,
    };
    const summary = summarizeLedger(
      [income, october(3, 500_000)],
      budget,
      period,
    );
    // Saldo awal 3.100.000 + pemasukan 2.000.000 − pengeluaran 500.000.
    expect(summary.balance).toBe(4_600_000);

    const september = summarizeLedger(
      [income, october(3, 500_000)],
      budget,
      periodFor("2026-09", "2026-10-17"),
    );
    expect(september.balance).toBe(3_100_000);
  });
});
