import { describe, expect, it } from "vitest";
import { suggestCategory } from "@/lib/categorize";
import type { CategoryKey, Transaction } from "@/lib/types";

function expense(
  merchant: string,
  category: CategoryKey,
  extra: Partial<Transaction> = {},
): Transaction {
  return {
    id: `${merchant}-${Math.random().toString(36).slice(2, 7)}`,
    date: "2026-09-10",
    time: "12:00",
    merchant,
    category,
    amount: 50_000,
    direction: "expense",
    source: "manual",
    ...extra,
  };
}

const ledger: Transaction[] = [
  expense("Toko Kopi Tuku", "makanan"),
  expense("Toko Kopi Tuku", "makanan"),
  expense("Toko Kopi Tuku", "makanan"),
  expense("Bengkel Roda Utara", "transportasi"),
  expense("Sewa kos bulanan", "tagihan"),
  expense("Warung Tekko", "makanan"),
  expense("Gaji bulanan", "lainnya", { direction: "income" }),
];

describe("suggestCategory — dari riwayat", () => {
  it("mengenali merchant yang persis sama", () => {
    expect(suggestCategory("Toko Kopi Tuku", ledger)).toEqual({
      category: "makanan",
      origin: "history",
      support: 3,
    });
  });

  it("mengabaikan perbedaan huruf besar dan tanda baca", () => {
    expect(suggestCategory("toko kopi tuku!!", ledger)?.category).toBe("makanan");
  });

  it("memakai kategori terbanyak saat riwayat bercampur", () => {
    const mixed = [
      expense("Indomaret", "belanja"),
      expense("Indomaret", "belanja"),
      expense("Indomaret", "makanan"),
    ];
    expect(suggestCategory("Indomaret", mixed)).toEqual({
      category: "belanja",
      origin: "history",
      support: 2,
    });
  });

  it("mengenali varian nama lewat satu kata yang sama", () => {
    expect(suggestCategory("Warung Tekko Cabang", ledger)).toMatchObject({
      category: "makanan",
      origin: "history",
    });
  });

  it("tidak memakai pemasukan sebagai bukti kategori", () => {
    expect(suggestCategory("Gaji bulanan", ledger)).toBeNull();
  });

  it("tidak menebak dari kemiripan yang terlalu tipis", () => {
    expect(suggestCategory("Toko Melati", ledger)).toBeNull();
  });

  it("tidak memakai kata umum seperti 'toko' sebagai bukti", () => {
    expect(suggestCategory("Toko Merah", ledger)).toBeNull();
  });

  it("mengembalikan null untuk merchant yang terlalu pendek", () => {
    expect(suggestCategory("ab", ledger)).toBeNull();
    expect(suggestCategory("   ", ledger)).toBeNull();
  });
});

describe("suggestCategory — dari kamus", () => {
  it("mengenali merchant umum tanpa riwayat", () => {
    expect(suggestCategory("Netflix.com", [])).toMatchObject({
      category: "hiburan",
      origin: "keyword",
    });
    expect(suggestCategory("PLN Pascabayar", [])?.category).toBe("tagihan");
    expect(suggestCategory("Gojek", [])?.category).toBe("transportasi");
    expect(suggestCategory("Apotek Kimia Farma", [])?.category).toBe("kesehatan");
    expect(suggestCategory("Shopee", [])?.category).toBe("belanja");
  });

  it("memberi jalan buntu untuk nama yang tidak dikenal", () => {
    expect(suggestCategory("Zyxwvu", [])).toBeNull();
  });

  it("mendahulukan riwayat daripada kamus", () => {
    const custom = [expense("Gojek", "lainnya")];
    expect(suggestCategory("Gojek", custom)).toEqual({
      category: "lainnya",
      origin: "history",
      support: 1,
    });
  });
});
