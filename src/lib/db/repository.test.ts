import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  countTransactions,
  deleteTransaction,
  ensureSchema,
  getBudgets,
  listTransactions,
  migrateLedger,
  saveBudget,
  saveTransactions,
  toBudget,
  toTransaction,
  type Queryable,
} from "@/lib/db/repository";
import { DEFAULT_BUDGET, SEED_TRANSACTIONS } from "@/lib/data/ledger-seed";
import { summarizeLedger } from "@/lib/finance";
import { periodFor, todayIso } from "@/lib/period";
import type { Budget, Transaction } from "@/lib/types";

const PERIOD = periodFor("2026-10", "2026-10-17");

/**
 * Postgres sungguhan (dikompilasi ke WASM) supaya skema dan kueri diuji apa
 * adanya; hanya string koneksinya yang berbeda dari Neon nanti.
 */
const pg = new PGlite();
const db: Queryable = {
  async query<T>(text: string, params?: unknown[]) {
    if (!params) {
      await pg.exec(text);
      return { rows: [] as T[] };
    }
    const result = await pg.query(text, params as never[]);
    return { rows: result.rows as T[] };
  },
};

const USER = "user-a";
const OTHER = "user-b";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "trx-1",
    date: "2026-10-05",
    time: "12:30",
    merchant: "Warung Tekko",
    category: "makanan",
    amount: 108_000,
    direction: "expense",
    source: "manual",
    ...overrides,
  };
}

beforeEach(async () => {
  await ensureSchema(db);
  await pg.exec("delete from transactions; delete from budgets;");
});

afterAll(async () => {
  await pg.close();
});

describe("skema", () => {
  it("bisa dijalankan berulang kali tanpa error", async () => {
    await ensureSchema(db);
    await ensureSchema(db);
    expect(await countTransactions(db, USER)).toBe(0);
  });

  it("memindahkan anggaran versi lama ke bulan berjalan", async () => {
    await pg.exec(`
      drop table budgets;
      create table budgets (
        user_id text primary key,
        total integer not null default 0 check (total >= 0),
        limits jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now()
      );
      insert into budgets (user_id, total, limits)
        values ('user-lama', 5000000, '{"makanan": 1000000}'::jsonb);
    `);

    await ensureSchema(db);

    const budgets = await getBudgets(db, "user-lama");
    const month = todayIso().slice(0, 7);
    expect(budgets[month]).toEqual({
      total: 5_000_000,
      limits: { makanan: 1_000_000 },
    });
  });

  it("menolak nominal negatif, arah, dan sumber yang tidak dikenal", async () => {
    await expect(
      saveTransactions(db, USER, [tx({ amount: -1 })]),
    ).rejects.toThrow();
    await expect(
      saveTransactions(db, USER, [
        tx({ direction: "transfer" as Transaction["direction"] }),
      ]),
    ).rejects.toThrow();
    await expect(
      saveTransactions(db, USER, [tx({ source: "telepati" as Transaction["source"] })]),
    ).rejects.toThrow();
  });
});

describe("transactions", () => {
  it("menyimpan dan membaca kembali seluruh bidang", async () => {
    await saveTransactions(db, USER, [
      tx({ note: "nasi campur", category: "makanan" }),
    ]);
    const [row] = await listTransactions(db, USER);
    expect(row).toEqual(tx({ note: "nasi campur", category: "makanan" }));
  });

  it("mengembalikan tanggal sebagai teks apa adanya", async () => {
    await saveTransactions(db, USER, [tx({ date: "2026-01-01" })]);
    const [row] = await listTransactions(db, USER);
    expect(row.date).toBe("2026-01-01");
  });

  it("mengurutkan dari yang terbaru", async () => {
    await saveTransactions(db, USER, [
      tx({ id: "a", date: "2026-10-01", time: "08:00" }),
      tx({ id: "b", date: "2026-10-05", time: "07:00" }),
      tx({ id: "c", date: "2026-10-05", time: "19:00" }),
    ]);
    expect((await listTransactions(db, USER)).map((row) => row.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("meng-update catatan dengan id yang sama, bukan menggandakannya", async () => {
    await saveTransactions(db, USER, [tx({ amount: 100_000 })]);
    await saveTransactions(db, USER, [tx({ amount: 125_000 })]);
    const rows = await listTransactions(db, USER);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(125_000);
  });

  it("menyimpan banyak baris dalam satu pernyataan", async () => {
    const bulk = Array.from({ length: 120 }, (_, index) =>
      tx({ id: `bulk-${index}`, amount: (index + 1) * 1000 }),
    );
    expect(await saveTransactions(db, USER, bulk)).toBe(120);
    expect(await countTransactions(db, USER)).toBe(120);
  });

  it("tidak mencampur catatan antar pengguna", async () => {
    await saveTransactions(db, USER, [tx({ id: "milik-a" })]);
    await saveTransactions(db, OTHER, [tx({ id: "milik-b", merchant: "Gojek" })]);
    expect((await listTransactions(db, USER)).map((row) => row.id)).toEqual([
      "milik-a",
    ]);
    expect(await countTransactions(db, USER)).toBe(1);
  });

  it("tidak bisa menghapus catatan milik pengguna lain", async () => {
    await saveTransactions(db, USER, [tx({ id: "milik-a" })]);
    await deleteTransaction(db, OTHER, "milik-a");
    expect(await countTransactions(db, USER)).toBe(1);
    await deleteTransaction(db, USER, "milik-a");
    expect(await countTransactions(db, USER)).toBe(0);
  });

  it("mengizinkan dua pengguna memakai id catatan yang sama", async () => {
    await saveTransactions(db, USER, [tx({ id: "sama" })]);
    await saveTransactions(db, OTHER, [tx({ id: "sama", merchant: "Grab" })]);
    expect((await listTransactions(db, OTHER))[0].merchant).toBe("Grab");
    expect((await listTransactions(db, USER))[0].merchant).toBe("Warung Tekko");
  });

  it("menerima pemasukan tanpa kategori", async () => {
    await saveTransactions(db, USER, [
      tx({ category: null, direction: "income", amount: 12_500_000 }),
    ]);
    const [row] = await listTransactions(db, USER);
    expect(row.category).toBeNull();
    expect(row.direction).toBe("income");
  });
});

describe("budgets", () => {
  it("menyimpan lalu membaca kembali batas per kategori", async () => {
    const budget: Budget = { total: 12_000_000, limits: { makanan: 1_500_000 } };
    await saveBudget(db, USER, "2026-10", budget);
    expect(await getBudgets(db, USER)).toEqual({ "2026-10": budget });
  });

  it("mengganti nilai lama di bulan yang sama", async () => {
    await saveBudget(db, USER, "2026-10", { total: 10_000_000, limits: {} });
    await saveBudget(db, USER, "2026-10", {
      total: 14_000_000,
      limits: { belanja: 3_000_000 },
    });
    expect((await getBudgets(db, USER))["2026-10"]).toEqual({
      total: 14_000_000,
      limits: { belanja: 3_000_000 },
    });
  });

  it("menyimpan anggaran tiap bulan secara terpisah", async () => {
    await saveBudget(db, USER, "2026-10", { total: 10_000_000, limits: {} });
    await saveBudget(db, USER, "2026-11", { total: 7_500_000, limits: {} });
    await saveBudget(db, OTHER, "2026-10", { total: 1_000_000, limits: {} });

    expect(await getBudgets(db, USER)).toEqual({
      "2026-10": { total: 10_000_000, limits: {} },
      "2026-11": { total: 7_500_000, limits: {} },
    });
    expect(await getBudgets(db, OTHER)).toEqual({
      "2026-10": { total: 1_000_000, limits: {} },
    });
  });

  it("mengembalikan objek kosong kalau anggarannya belum pernah disimpan", async () => {
    expect(await getBudgets(db, OTHER)).toEqual({});
  });
});

describe("migrasi ledger lokal", () => {
  const local = {
    transactions: [tx({ id: "lokal-1" }), tx({ id: "lokal-2", merchant: "Gojek" })],
    budget: { total: 12_000_000, limits: { makanan: 1_500_000 } },
    month: "2026-10",
  };

  it("memindahkan catatan dan anggaran ke akun pertama", async () => {
    const result = await migrateLedger(db, USER, local);
    expect(result).toEqual({ moved: 2, skipped: false, existing: 0 });
    expect(await countTransactions(db, USER)).toBe(2);
    expect((await getBudgets(db, USER))["2026-10"]?.total).toBe(12_000_000);
  });

  it("melewati migrasi kedua supaya data server tidak tertimpa", async () => {
    await migrateLedger(db, USER, local);
    await saveTransactions(db, USER, [tx({ id: "dari-server", merchant: "Baru" })]);
    const second = await migrateLedger(db, USER, local);
    expect(second.skipped).toBe(true);
    expect(await countTransactions(db, USER)).toBe(3);
  });

  it("tetap berjalan untuk akun kedua yang masih kosong", async () => {
    await migrateLedger(db, USER, local);
    const other = await migrateLedger(db, OTHER, local);
    expect(other).toEqual({ moved: 2, skipped: false, existing: 0 });
  });
});

describe("migrasi data contoh aplikasi ini", () => {
  it("memindahkan seluruh ledger contoh tanpa melanggar batasan kolom", async () => {
    const result = await migrateLedger(db, USER, {
      transactions: SEED_TRANSACTIONS,
      budget: DEFAULT_BUDGET,
      month: "2026-10",
    });

    expect(result.moved).toBe(SEED_TRANSACTIONS.length);
    expect(await countTransactions(db, USER)).toBe(SEED_TRANSACTIONS.length);

    const rows = await listTransactions(db, USER);
    expect(rows).toHaveLength(SEED_TRANSACTIONS.length);

    // Urutan dari database harus sama dengan urutan aplikasi (terbaru dulu).
    const first = rows[0];
    const last = rows[rows.length - 1];
    expect(`${first.date}T${first.time}` >= `${last.date}T${last.time}`).toBe(true);

    // Ringkasan yang dihitung dari database harus sama dengan dari data lokal.
    const budget =
      (await getBudgets(db, USER))["2026-10"] ?? DEFAULT_BUDGET;
    const fromDb = summarizeLedger(rows, budget, PERIOD);
    const fromLocal = summarizeLedger(SEED_TRANSACTIONS, DEFAULT_BUDGET, PERIOD);
    expect(fromDb.spending).toBe(fromLocal.spending);
    expect(fromDb.count).toBe(fromLocal.count);
    expect(fromDb.byCategory).toEqual(fromLocal.byCategory);
  });
});

describe("pembersihan nilai dari database", () => {
  it("membuang kategori, arah, dan sumber yang tidak dikenal", () => {
    expect(
      toTransaction({
        id: "x",
        date: "2026-10-01",
        time: "10:00",
        merchant: "Uji",
        note: null,
        category: "fiksi",
        amount: 1000,
        direction: "transfer",
        source: "telepati",
      }),
    ).toEqual({
      id: "x",
      date: "2026-10-01",
      time: "10:00",
      merchant: "Uji",
      note: undefined,
      category: null,
      amount: 1000,
      direction: "expense",
      source: "manual",
    });
  });

  it("membuang batas kategori yang tidak sah dan nilai negatif", () => {
    expect(
      toBudget({ total: "9000", limits: { makanan: 1000, fiksi: 500, belanja: -3 } }),
    ).toEqual({ total: 9000, limits: { makanan: 1000 } });
    expect(toBudget(null)).toEqual({ total: 0, limits: {} });
  });
});
