import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth";
import { closePool, database } from "@/lib/db/pg";
import {
  countTransactions,
  listTransactions,
  migrateLedger,
  saveTransactions,
} from "@/lib/db/repository";
import { setupDatabase } from "@/lib/db/setup";
import { DEFAULT_BUDGET, SEED_TRANSACTIONS } from "@/lib/data/ledger-seed";
import type { Transaction } from "@/lib/types";

/**
 * Postgres sungguhan (PGlite) yang dibuka lewat soket TCP, sehingga yang diuji
 * adalah jalur produksi yang sama persis: `pg.Pool` → repository → Better Auth.
 * Hanya nama host dan penyedianya yang berbeda dari Neon.
 */
let pg: PGlite;
let server: PGLiteSocketServer;
let auth: ReturnType<typeof createAuth>;

const password = "kata-sandi-uji-123";

/** Ambil cookie sesi dari header Set-Cookie. */
function sessionCookie(headers: Headers) {
  const raw = headers.get("set-cookie") ?? "";
  return raw.split(";")[0] ?? "";
}

async function signUp(email: string) {
  const result = await auth.api.signUpEmail({
    body: { email, password, name: email.split("@")[0] },
    returnHeaders: true,
  });
  return result;
}

async function signIn(email: string) {
  return auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
}

beforeAll(async () => {
  pg = new PGlite();
  server = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
  await server.start();

  // getServerConn() mengembalikan "host:port" dari soket yang benar-benar dibuka.
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`;
  process.env.BETTER_AUTH_SECRET = "rahasia-uji-yang-tidak-dipakai-di-produksi";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  // Tabel ledger + tabel Better Auth, lewat jalur yang sama dengan `npm run db:setup`.
  await setupDatabase(database);

  // Tanpa plugin nextCookies: pengujian ini di luar permintaan Next.
  auth = createAuth({ plugins: [] });
}, 120_000);

afterAll(async () => {
  // Urutannya penting: kolam ditutup sebelum soketnya, kalau tidak pg
  // melaporkan "Connection terminated unexpectedly" saat pengujian selesai.
  await closePool();
  await server?.stop();
  await pg?.close();
});

describe("pendaftaran dan masuk", () => {
  it("mendaftarkan pengguna lalu memulihkan sesi dari cookie", async () => {
    const { response, headers } = await signUp("raka@contoh.test");
    expect(response?.user?.email).toBe("raka@contoh.test");

    const cookie = sessionCookie(headers);
    expect(cookie).toContain("better-auth");

    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.email).toBe("raka@contoh.test");
  });

  it("memberi sesi baru saat masuk dengan kata sandi yang benar", async () => {
    const { headers } = await signIn("raka@contoh.test");
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie(headers) }),
    });
    expect(session?.user.id).toBeTruthy();
  });

  it("menolak kata sandi yang salah", async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: "raka@contoh.test", password: "salah-sekali-99" },
      }),
    ).rejects.toThrow();
  });

  it("menolak email yang sudah terdaftar", async () => {
    await expect(signUp("raka@contoh.test")).rejects.toThrow();
  });

  it("menolak kata sandi yang terlalu pendek", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: "pendek@contoh.test", password: "123", name: "Pendek" },
      }),
    ).rejects.toThrow();
  });

  it("mematikan sesi setelah keluar", async () => {
    const { headers } = await signIn("raka@contoh.test");
    const cookie = sessionCookie(headers);

    await auth.api.signOut({ headers: new Headers({ cookie }) });

    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session).toBeNull();
  });

  it("tidak memberi sesi tanpa cookie", async () => {
    const session = await auth.api.getSession({ headers: new Headers() });
    expect(session).toBeNull();
  });
});

describe("isolasi data per akun", () => {
  const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "trx-a",
    date: "2026-10-05",
    time: "12:00",
    merchant: "Warung Tekko",
    category: "makanan",
    amount: 50_000,
    direction: "expense",
    source: "manual",
    ...overrides,
  });

  it("memisahkan catatan dua akun sungguhan", async () => {
    const first = await signUp("satu@contoh.test");
    const second = await signUp("dua@contoh.test");
    const userIdA = first.response?.user?.id as string;
    const userIdB = second.response?.user?.id as string;
    expect(userIdA).not.toBe(userIdB);

    await saveTransactions(database, userIdA, [tx({ id: "milik-a" })]);
    await saveTransactions(database, userIdB, [tx({ id: "milik-b" })]);

    expect(await countTransactions(database, userIdA)).toBe(1);
    expect((await listTransactions(database, userIdA))[0].id).toBe("milik-a");
    expect((await listTransactions(database, userIdB))[0].id).toBe("milik-b");
  });

  it("memindahkan seluruh ledger contoh ke akun yang baru dibuat", async () => {
    const created = await signUp("pindah@contoh.test");
    const userId = created.response?.user?.id as string;

    const result = await migrateLedger(database, userId, {
      transactions: SEED_TRANSACTIONS,
      budget: DEFAULT_BUDGET,
      month: "2026-10",
    });

    expect(result).toEqual({
      moved: SEED_TRANSACTIONS.length,
      skipped: false,
      existing: 0,
    });
    expect(await countTransactions(database, userId)).toBe(
      SEED_TRANSACTIONS.length,
    );
  });
});
