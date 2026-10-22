import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, database } from "@/lib/db/pg";
import { ensureSchema } from "@/lib/db/repository";
import { readLedger, applyOperation } from "@/lib/ledger-service";
import type { Transaction } from "@/lib/types";

/**
 * Jalur produksi yang sama seperti di Neon: `pg.Pool` lewat soket TCP →
 * repository → layanan ledger. Hanya penyedianya yang berbeda.
 */
let pg: PGlite;
let server: PGLiteSocketServer;

const userA = "user-satu";
const userB = "user-dua";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "trx-a",
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

beforeAll(async () => {
  pg = new PGlite();
  // `maxConnections` bawaan pglite adalah 1, sedangkan Postgres sungguhan
  // (dan Neon) melayani beberapa koneksi bersamaan — `readLedger` memang
  // mengirim dua kueri sekaligus.
  server = new PGLiteSocketServer({
    db: pg,
    port: 0,
    host: "127.0.0.1",
    maxConnections: 5,
  });
  await server.start();

  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`;
  await ensureSchema(database);
}, 120_000);

afterAll(async () => {
  // Kolam ditutup sebelum soketnya, kalau tidak pg melaporkan koneksi terputus.
  await closePool();
  await server?.stop();
  await pg?.close();
});

describe("readLedger", () => {
  it("tidak mengarang anggaran untuk akun yang belum pernah mengatur apa pun", async () => {
    const ledger = await readLedger(database, "user-baru");
    expect(ledger.transactions).toEqual([]);
    expect(ledger.budgets).toEqual({});
  });
});

describe("applyOperation: upsert", () => {
  it("menyimpan satu catatan lalu membacanya kembali utuh", async () => {
    const result = await applyOperation(database, userA, {
      type: "upsert",
      transactions: [tx({ note: "Nasi campur" })],
    });

    expect(result.affected).toBe(1);
    expect(result.ledger.transactions).toHaveLength(1);
    const stored = result.ledger.transactions[0];
    expect(stored.id).toBe("trx-a");
    expect(stored.date).toBe("2026-10-05");
    expect(stored.time).toBe("12:30");
    expect(stored.merchant).toBe("Warung Tekko");
    expect(stored.note).toBe("Nasi campur");
    expect(stored.category).toBe("makanan");
    expect(stored.amount).toBe(108_000);
    expect(stored.direction).toBe("expense");
    expect(stored.source).toBe("manual");
  });

  it("memperbarui catatan dengan id yang sama, bukan menggandakannya", async () => {
    await applyOperation(database, userA, {
      type: "upsert",
      transactions: [tx({ amount: 120_000, note: undefined })],
    });

    const ledger = await readLedger(database, userA);
    expect(ledger.transactions).toHaveLength(1);
    expect(ledger.transactions[0].amount).toBe(120_000);
    expect(ledger.transactions[0].note).toBeUndefined();
  });

  it("mengurutkan hasil bacaan dari yang terbaru", async () => {
    await applyOperation(database, userA, {
      type: "upsert",
      transactions: [
        tx({ id: "trx-lama", date: "2026-10-01", time: "08:00" }),
        tx({ id: "trx-baru", date: "2026-10-11", time: "19:00" }),
      ],
    });

    const ledger = await readLedger(database, userA);
    expect(ledger.transactions.map((row) => row.id)).toEqual([
      "trx-baru",
      "trx-a",
      "trx-lama",
    ]);
  });

  it("memecah kiriman besar menjadi beberapa pernyataan", async () => {
    const many = Array.from({ length: 620 }, (_, index) =>
      tx({ id: `trx-banyak-${index}`, amount: index + 1 }),
    );
    const result = await applyOperation(database, "user-banyak", {
      type: "upsert",
      transactions: many,
    });
    expect(result.affected).toBe(620);
    expect(result.ledger.transactions).toHaveLength(620);
  });
});

describe("applyOperation: delete, budget, replace", () => {
  it("menghapus catatan yang diminta saja", async () => {
    const result = await applyOperation(database, userA, {
      type: "delete",
      ids: ["trx-lama"],
    });
    expect(result.affected).toBe(1);
    expect(result.ledger.transactions.map((row) => row.id)).toEqual([
      "trx-baru",
      "trx-a",
    ]);
  });

  it("menyimpan anggaran total beserta batas per kategori", async () => {
    const result = await applyOperation(database, userA, {
      type: "budget",
      month: "2026-10",
      budget: { total: 15_000_000, limits: { makanan: 2_000_000 } },
    });
    expect(result.ledger.budgets["2026-10"]).toEqual({
      total: 15_000_000,
      limits: { makanan: 2_000_000 },
    });

    const reread = await readLedger(database, userA);
    expect(reread.budgets["2026-10"].total).toBe(15_000_000);
    expect(reread.budgets["2026-10"].limits.makanan).toBe(2_000_000);
  });

  it("tidak membawa anggaran Oktober ke bulan lain", async () => {
    await applyOperation(database, userA, {
      type: "budget",
      month: "2026-11",
      budget: { total: 4_000_000, limits: {} },
    });

    const ledger = await readLedger(database, userA);
    expect(ledger.budgets["2026-10"].total).toBe(15_000_000);
    expect(ledger.budgets["2026-11"].total).toBe(4_000_000);
  });

  it("mengganti seluruh ledger tanpa menyisakan catatan lama", async () => {
    const result = await applyOperation(database, userA, {
      type: "replace",
      transactions: [tx({ id: "trx-contoh", date: "2026-07-02", time: "09:15" })],
    });
    expect(result.ledger.transactions.map((row) => row.id)).toEqual([
      "trx-contoh",
    ]);
    expect(result.ledger.transactions).toHaveLength(1);
    // Anggaran tidak ikut diganti karena tidak dikirim.
    expect(result.ledger.budgets["2026-10"].total).toBe(15_000_000);
  });
});

describe("applyOperation: adopt", () => {
  it("memindahkan ledger peramban ke akun yang masih kosong", async () => {
    const result = await applyOperation(database, "user-pindah", {
      type: "adopt",
      month: "2026-10",
      transactions: [tx({ id: "trx-pindah-1" }), tx({ id: "trx-pindah-2" })],
      budget: { total: 9_000_000, limits: { tagihan: 1_000_000 } },
    });

    expect(result.skipped).toBe(false);
    expect(result.affected).toBe(2);
    expect(result.ledger.transactions).toHaveLength(2);
    expect(result.ledger.budgets["2026-10"].total).toBe(9_000_000);
  });

  it("tidak menyentuh akun yang sudah berisi", async () => {
    const result = await applyOperation(database, "user-pindah", {
      type: "adopt",
      month: "2026-11",
      transactions: [tx({ id: "trx-pindah-3", merchant: "Tidak boleh masuk" })],
      budget: { total: 1, limits: {} },
    });

    expect(result.skipped).toBe(true);
    expect(result.affected).toBe(0);
    expect(result.ledger.transactions.map((row) => row.id).sort()).toEqual([
      "trx-pindah-1",
      "trx-pindah-2",
    ]);
    expect(result.ledger.budgets["2026-10"].total).toBe(9_000_000);
    expect(result.ledger.budgets["2026-11"]).toBeUndefined();
  });
});

describe("isolasi antar pengguna", () => {
  it("tidak menampilkan catatan milik akun lain", async () => {
    await applyOperation(database, userB, {
      type: "upsert",
      transactions: [tx({ id: "trx-b", merchant: "Milik dua" })],
    });

    const ledgerB = await readLedger(database, userB);
    expect(ledgerB.transactions.map((row) => row.id)).toEqual(["trx-b"]);

    const ledgerA = await readLedger(database, userA);
    expect(ledgerA.transactions.some((row) => row.id === "trx-b")).toBe(false);
  });

  it("menolak menghapus catatan milik akun lain meski id-nya benar", async () => {
    const result = await applyOperation(database, userB, {
      type: "delete",
      ids: ["trx-contoh"],
    });

    expect(result.ledger.transactions.map((row) => row.id)).toEqual(["trx-b"]);
    const ledgerA = await readLedger(database, userA);
    expect(ledgerA.transactions.map((row) => row.id)).toEqual(["trx-contoh"]);
  });

  it("mengganti ledger satu akun tanpa menyentuh anggaran akun lain", async () => {
    await applyOperation(database, userB, {
      type: "replace",
      transactions: [],
    });

    expect((await readLedger(database, userB)).transactions).toEqual([]);
    expect((await readLedger(database, userA)).transactions).toHaveLength(1);
    expect((await readLedger(database, userA)).budgets["2026-10"].total).toBe(
      15_000_000,
    );
  });
});
