import { describe, expect, it } from "vitest";
import {
  currentPeriod,
  earliestMonthKey,
  initialMonthKey,
  isMonthKey,
  latestMonthKey,
  monthKeyOf,
  periodFor,
  shiftMonthKey,
  todayIso,
} from "@/lib/period";
import type { Budget, Transaction } from "@/lib/types";

const tx = (date: string): Transaction => ({
  id: `t-${date}`,
  date,
  time: "10:00",
  merchant: "Uji",
  category: "makanan",
  amount: 10_000,
  direction: "expense",
  source: "manual",
});

const budget: Budget = { total: 1_000_000, limits: {} };

describe("shiftMonthKey", () => {
  it("melewati batas tahun ke dua arah", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-10", -13)).toBe("2025-09");
  });
});

describe("periodFor", () => {
  it("menghitung hari berjalan hanya untuk bulan berjalan", () => {
    const current = periodFor("2026-10", "2026-10-19");
    expect(current.isCurrent).toBe(true);
    expect(current.daysInMonth).toBe(31);
    expect(current.daysElapsed).toBe(19);
    expect(current.range).toBe("1 – 19 Okt 2026");
    expect(current.previousKey).toBe("2026-09");
    expect(current.previousMonthIndex).toBe(9);
  });

  it("menganggap bulan lalu penuh dan bulan depan kosong", () => {
    const past = periodFor("2026-09", "2026-10-19");
    expect(past.isCurrent).toBe(false);
    expect(past.daysElapsed).toBe(30);
    expect(past.range).toBe("1 – 30 Sep 2026");

    const future = periodFor("2026-11", "2026-10-19");
    expect(future.isFuture).toBe(true);
    expect(future.daysElapsed).toBe(0);
  });

  it("menangani pergantian tahun untuk pembanding", () => {
    const january = periodFor("2026-01", "2026-01-05");
    expect(january.previousKey).toBe("2025-12");
    expect(january.previousYear).toBe(2025);
    expect(january.previousMonthIndex).toBe(12);
  });

  it("jatuh ke bulan berjalan kalau kuncinya tidak sah", () => {
    expect(periodFor("bukan-bulan", "2026-10-19").key).toBe("2026-10");
  });
});

describe("batas bulan", () => {
  it("mengenali kunci bulan yang sah saja", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey(2026_10)).toBe(false);
  });

  it("memakai catatan paling awal sebagai batas bawah", () => {
    expect(earliestMonthKey([tx("2026-07-04"), tx("2026-09-30")], "2026-10-19")).toBe(
      "2026-07",
    );
    expect(latestMonthKey("2026-10-19")).toBe("2026-11");
  });
});

describe("initialMonthKey", () => {
  it("memilih bulan berjalan kalau sudah ada isinya", () => {
    expect(
      initialMonthKey([tx("2026-10-02")], {}, "2026-10-19"),
    ).toBe("2026-10");
  });

  it("memilih bulan terakhir yang ada catatannya saat bulan berjalan kosong", () => {
    expect(
      initialMonthKey([tx("2026-08-02"), tx("2026-09-30")], {}, "2026-11-03"),
    ).toBe("2026-09");
  });

  it("tetap membuka bulan berjalan untuk akun baru", () => {
    expect(initialMonthKey([], {}, "2026-11-03")).toBe("2026-11");
  });

  it("menghormati anggaran bulan berjalan walau belum ada catatan", () => {
    expect(
      initialMonthKey([tx("2026-09-30")], { "2026-11": budget }, "2026-11-03"),
    ).toBe("2026-11");
  });
});

describe("currentPeriod", () => {
  it("mengikuti tanggal yang diberikan, bukan jam sistem", () => {
    expect(currentPeriod("2026-12-31").key).toBe("2026-12");
    expect(monthKeyOf(todayIso(new Date(2027, 0, 2)))).toBe("2027-01");
  });
});
