import { describe, expect, it } from "vitest";
import {
  MAX_BATCH,
  parseBudget,
  parseOperation,
  parseTransaction,
  parseTransactions,
} from "@/lib/ledger-input";
import { applyOperation, type LedgerState } from "@/lib/ledger-store";
import { DEFAULT_BUDGET } from "@/lib/data/ledger-seed";
import type { Transaction } from "@/lib/types";

const valid: Transaction = {
  id: "trx-1",
  date: "2026-10-05",
  time: "12:30",
  merchant: "Warung Tekko",
  note: "Nasi campur",
  category: "makanan",
  amount: 108_000,
  direction: "expense",
  source: "manual",
};

describe("parseTransaction", () => {
  it("menerima catatan yang lengkap", () => {
    expect(parseTransaction(valid)).toEqual(valid);
  });

  it("menolak yang tidak berbentuk objek", () => {
    for (const value of [null, undefined, 7, "trx", []]) {
      expect(parseTransaction(value)).toBeNull();
    }
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(parseTransaction({ ...valid, date: "2026-02-31" })).toBeNull();
    expect(parseTransaction({ ...valid, date: "31/10/2026" })).toBeNull();
    expect(parseTransaction({ ...valid, date: "2026-13-01" })).toBeNull();
  });

  it("menolak waktu yang tidak berbentuk HH:mm", () => {
    expect(parseTransaction({ ...valid, time: "24:00" })).toBeNull();
    expect(parseTransaction({ ...valid, time: "12:60" })).toBeNull();
    expect(parseTransaction({ ...valid, time: "12.30" })).toBeNull();
  });

  it("menolak nominal negatif atau bukan angka", () => {
    expect(parseTransaction({ ...valid, amount: -1 })).toBeNull();
    expect(parseTransaction({ ...valid, amount: "seribu" })).toBeNull();
    expect(parseTransaction({ ...valid, amount: 1e15 })).toBeNull();
  });

  it("menolak arah yang tidak dikenal", () => {
    expect(parseTransaction({ ...valid, direction: "transfer" })).toBeNull();
  });

  it("membuang kategori dan sumber yang tidak dikenal tanpa menolak catatan", () => {
    const parsed = parseTransaction({
      ...valid,
      category: "crypto",
      source: "telepati",
    });
    expect(parsed?.category).toBeNull();
    expect(parsed?.source).toBe("manual");
  });

  it("membulatkan nominal dan memotong teks yang terlalu panjang", () => {
    const parsed = parseTransaction({
      ...valid,
      amount: 108_000.6,
      merchant: "M".repeat(400),
      note: "N".repeat(900),
    });
    expect(parsed?.amount).toBe(108_001);
    expect(parsed?.merchant).toHaveLength(160);
    expect(parsed?.note).toHaveLength(400);
  });

  it("mengubah catatan kosong menjadi undefined, bukan string kosong", () => {
    expect(parseTransaction({ ...valid, note: "   " })?.note).toBeUndefined();
  });
});

describe("parseTransactions", () => {
  it("membuang entri rusak tanpa menggagalkan seluruh kiriman", () => {
    const parsed = parseTransactions([
      valid,
      { ...valid, id: "rusak", date: "besok" },
      { ...valid, id: "trx-2" },
    ]);
    expect(parsed?.map((tx) => tx.id)).toEqual(["trx-1", "trx-2"]);
  });

  it("menolak kiriman yang bukan larik atau kebesaran", () => {
    expect(parseTransactions("bukan larik")).toBeNull();
    expect(
      parseTransactions(Array.from({ length: MAX_BATCH + 1 }, () => valid)),
    ).toBeNull();
  });
});

describe("parseBudget", () => {
  it("menyimpan hanya batas kategori yang dikenal", () => {
    const parsed = parseBudget({
      total: 12_000_000,
      limits: { makanan: 1_500_000, crypto: 9_000, belanja: "3.500.000" },
    });
    expect(parsed).toEqual({ total: 12_000_000, limits: { makanan: 1_500_000 } });
  });

  it("menolak anggaran tanpa total yang masuk akal", () => {
    expect(parseBudget({ limits: {} })).toBeNull();
    expect(parseBudget({ total: -5 })).toBeNull();
  });
});

describe("parseOperation", () => {
  it("mengenali perintah yang dipakai aplikasi", () => {
    expect(parseOperation({ type: "upsert", transactions: [valid] })?.type).toBe(
      "upsert",
    );
    expect(parseOperation({ type: "delete", ids: ["trx-1", ""] })).toEqual({
      type: "delete",
      ids: ["trx-1"],
    });
    expect(
      parseOperation({
        type: "budget",
        month: "2026-10",
        budget: DEFAULT_BUDGET,
      }),
    ).toEqual({ type: "budget", month: "2026-10", budget: DEFAULT_BUDGET });
  });

  it("menolak anggaran tanpa bulan yang sah", () => {
    expect(
      parseOperation({ type: "budget", budget: DEFAULT_BUDGET }),
    ).toBeNull();
    expect(
      parseOperation({
        type: "budget",
        month: "2026-13",
        budget: DEFAULT_BUDGET,
      }),
    ).toBeNull();
    expect(
      parseOperation({
        type: "budget",
        month: "Oktober",
        budget: DEFAULT_BUDGET,
      }),
    ).toBeNull();
  });

  it("menolak perintah yang tidak dikenal atau tidak lengkap", () => {
    expect(parseOperation({ type: "drop-tables" })).toBeNull();
    expect(parseOperation(null)).toBeNull();
    expect(parseOperation({ type: "delete", ids: [] })).toBeNull();
    expect(parseOperation({ type: "upsert", transactions: "semua" })).toBeNull();
    expect(
      parseOperation({ type: "adopt", transactions: [valid] }),
    ).toBeNull();
    expect(
      parseOperation({
        type: "adopt",
        month: "2026-10",
        transactions: [valid],
      }),
    ).toBeNull();
  });
});

describe("applyOperation", () => {
  const state: LedgerState = {
    transactions: [
      { ...valid, id: "lama", date: "2026-10-01", time: "08:00" },
    ],
    budgets: { "2026-10": DEFAULT_BUDGET },
  };

  it("menggabungkan catatan baru dan mengurutkannya terbaru dulu", () => {
    const next = applyOperation(state, {
      type: "upsert",
      transactions: [{ ...valid, id: "baru", date: "2026-10-09", time: "20:00" }],
    });
    expect(next.transactions.map((tx) => tx.id)).toEqual(["baru", "lama"]);
  });

  it("memperbarui catatan yang sama tanpa menggandakannya", () => {
    const next = applyOperation(state, {
      type: "upsert",
      transactions: [{ ...valid, id: "lama", merchant: "Warung Baru" }],
    });
    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0].merchant).toBe("Warung Baru");
  });

  it("menghapus hanya id yang diminta", () => {
    const next = applyOperation(state, { type: "delete", ids: ["lain"] });
    expect(next.transactions).toHaveLength(1);
    expect(applyOperation(state, { type: "delete", ids: ["lama"] }).transactions)
      .toHaveLength(0);
  });

  it("mengganti seluruh ledger saat data contoh dikembalikan", () => {
    const replacement: Transaction[] = [
      { ...valid, id: "contoh", date: "2026-07-01", time: "09:00" },
    ];
    const next = applyOperation(state, {
      type: "replace",
      transactions: replacement,
    });
    expect(next.transactions.map((tx) => tx.id)).toEqual(["contoh"]);
    // Anggaran tiap bulan tidak ikut berubah.
    expect(next.budgets).toEqual(state.budgets);
  });

  it("menulis anggaran hanya ke bulan yang dituju", () => {
    const next = applyOperation(state, {
      type: "budget",
      month: "2026-11",
      budget: { total: 4_000_000, limits: { tagihan: 900_000 } },
    });
    expect(next.budgets["2026-11"]).toEqual({
      total: 4_000_000,
      limits: { tagihan: 900_000 },
    });
    expect(next.budgets["2026-10"]).toEqual(DEFAULT_BUDGET);
  });
});
