import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, database } from "@/lib/db/pg";
import { ensureSchema, saveTransactions } from "@/lib/db/repository";
import {
  confirmDraft,
  dismissDraft,
  ingestEmail,
  readDrafts,
  readInbox,
  receiveInbound,
  tokenFromRecipient,
} from "@/lib/email-service";
import { readLedger } from "@/lib/ledger-service";

/**
 * Jalur produksi yang sama seperti di Neon: `pg.Pool` lewat soket TCP.
 * Email bank diuji sampai transaksi benar-benar tersimpan, bukan hanya
 * sampai hasil parsing.
 */
let pg: PGlite;
let server: PGLiteSocketServer;

const userA = "user-email-a";
const userB = "user-email-b";

const debitEmail = `
Yth. Nasabah,
Pemberitahuan Transaksi
Transaksi Debit
Tanggal: 17/10/2026 14:32:05
Nominal: Rp150.000,00
Merchant: TOKOPEDIA
Saldo: Rp 2.500.000
`;

beforeAll(async () => {
  pg = new PGlite();
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
  await closePool();
  await server?.stop();
  await pg?.close();
});

describe("alamat penerusan", () => {
  it("memberi token yang stabil dan alamat hanya kalau domain diisi", async () => {
    const first = await readInbox(database, userA);
    expect(first.address).toBeNull();
    expect(first.webhookConfigured).toBe(false);

    const second = await readInbox(database, userA);
    const third = await readInbox(database, userA);
    expect(second.address).toBeNull();
    expect(third.address).toBeNull();

    process.env.EMAIL_INBOUND_DOMAIN = "inbox.contoh.test";
    try {
      const withDomain = await readInbox(database, userA);
      expect(withDomain.address).toMatch(/^sisa\+[a-f0-9]{12}@inbox\.contoh\.test$/);
    } finally {
      delete process.env.EMAIL_INBOUND_DOMAIN;
    }
  });

  it("mengambil token dari alamat yang dibungkus nama tampilan", () => {
    expect(tokenFromRecipient("Sisa <sisa+ab12cd34ef56@inbox.test>")).toBe(
      "ab12cd34ef56",
    );
    expect(tokenFromRecipient("sisa+AB12CD34EF56@inbox.test")).toBe(
      "ab12cd34ef56",
    );
    expect(tokenFromRecipient("sisa@inbox.test")).toBeNull();
    expect(tokenFromRecipient("bukan-alamat")).toBeNull();
  });
});

describe("ingestEmail", () => {
  it("membuat draf dari email debit tanpa menulis transaksi", async () => {
    const result = await ingestEmail(database, userA, {
      text: debitEmail,
      subject: "Notifikasi Transaksi BSI",
      messageId: "<pesan-1@bsi>",
    });

    expect(result.duplicate).toBe(false);
    expect(result.draft?.amount).toBe(150_000);
    expect(result.draft?.merchant).toBe("TOKOPEDIA");
    expect(result.draft?.direction).toBe("expense");

    const drafts = await readDrafts(database, userA);
    expect(drafts).toHaveLength(1);

    // Draf belum boleh muncul sebagai transaksi.
    const ledger = await readLedger(database, userA);
    expect(ledger.transactions).toEqual([]);
  });

  it("tidak menggandakan email yang sama", async () => {
    const again = await ingestEmail(database, userA, {
      text: debitEmail,
      subject: "Notifikasi Transaksi BSI",
      messageId: "<pesan-1@bsi>",
    });

    expect(again.duplicate).toBe(true);
    expect(await readDrafts(database, userA)).toHaveLength(1);
  });

  it("menolak email tanpa nominal dan menjelaskan alasannya", async () => {
    const result = await ingestEmail(database, userA, {
      text: "Promo menarik bulan ini.",
      subject: "Promo",
    });
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/nominal/i);
  });
});

describe("konfirmasi dan abaikan", () => {
  it("menyimpan draf menjadi transaksi sumber email", async () => {
    const [draft] = await readDrafts(database, userA);
    const { transaction } = await confirmDraft(database, userA, draft.id);

    expect(transaction?.source).toBe("email");
    expect(transaction?.amount).toBe(150_000);
    expect(transaction?.merchant).toBe("TOKOPEDIA");
    expect(transaction?.note).toBe("Notifikasi Transaksi BSI");
    // Kategori ditebak dari merchant supaya grafik per kategori tetap terisi.
    expect(transaction?.category).toBe("belanja");

    const ledger = await readLedger(database, userA);
    expect(ledger.transactions.map((row) => row.id)).toEqual([transaction?.id]);
    expect(await readDrafts(database, userA)).toHaveLength(0);
  });

  it("menolak konfirmasi kedua untuk draf yang sama", async () => {
    const drafts = await readDrafts(database, userA);
    expect(drafts).toHaveLength(0);
    const again = await confirmDraft(database, userA, "draft-0000000000000000");
    expect(again.transaction).toBeNull();
    expect(again.duplicate).toBe(false);
  });

  it("mengabaikan draf tanpa menyentuh ledger", async () => {
    const created = await ingestEmail(database, userA, {
      text: debitEmail
        .replace("TOKOPEDIA", "INDOMARET")
        .replace("150.000", "42.000"),
      subject: "Mutasi lain",
      messageId: "<pesan-2@bsi>",
    });
    expect(created.draft).not.toBeNull();

    await dismissDraft(database, userA, created.draft!.id);
    expect(await readDrafts(database, userA)).toHaveLength(0);
    expect((await readLedger(database, userA)).transactions).toHaveLength(1);
  });

  it("memakai kategori pilihan pengguna, bukan tebakan merchant", async () => {
    const created = await ingestEmail(database, userA, {
      text: debitEmail
        .replace("TOKOPEDIA", "GOJEK")
        .replace("150.000", "75.000"),
      subject: "Mutasi pilihan kategori",
      messageId: "<pesan-kategori@bsi>",
    });
    expect(created.draft).not.toBeNull();

    const { transaction } = await confirmDraft(
      database,
      userA,
      created.draft!.id,
      "hiburan",
    );

    // Tebakan dari merchant akan menghasilkan "transportasi"; pilihan pengguna menang.
    expect(transaction?.category).toBe("hiburan");
  });
});

describe("anti duplikat lintas sumber", () => {
  it("melewati mutasi yang sudah tercatat walau jamnya meleset beberapa menit", async () => {
    const result = await ingestEmail(database, userA, {
      text: debitEmail.replace("14:32:05", "14:35:00"),
      subject: "Notifikasi Transaksi BSI",
      messageId: "<ulang-okt@bsi>",
    });

    expect(result.duplicate).toBe(true);
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/sudah tercatat/i);
  });

  it("mendeteksi mutasi lama dari bulan sebelumnya", async () => {
    await saveTransactions(database, userB, [
      {
        id: "trx-manual-sep",
        date: "2026-09-03",
        time: "09:12",
        merchant: "TOKOPEDIA",
        category: "belanja",
        amount: 150_000,
        direction: "expense",
        source: "manual",
      },
    ]);

    const result = await ingestEmail(database, userB, {
      text: debitEmail.replace("17/10/2026 14:32:05", "03/09/2026 09:12:00"),
      subject: "Notifikasi Transaksi BSI",
      messageId: "<lama-sep@bsi>",
    });

    expect(result.duplicate).toBe(true);
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/3 Sep 2026/);
  });

  it("menutup draf yang ternyata sudah dicatat manual sebelum disimpan", async () => {
    const created = await ingestEmail(database, userA, {
      text: debitEmail
        .replace("150.000", "88.000")
        .replace("14:32:05", "15:00:00"),
      subject: "Mutasi yang dicatat manual",
      messageId: "<balapan@bsi>",
    });
    expect(created.draft).not.toBeNull();

    await saveTransactions(database, userA, [
      {
        id: "trx-manual-88",
        date: "2026-10-17",
        time: "15:02",
        merchant: "TOKOPEDIA",
        category: null,
        amount: 88_000,
        direction: "expense",
        source: "manual",
      },
    ]);

    const result = await confirmDraft(database, userA, created.draft!.id);
    expect(result.duplicate).toBe(true);
    expect(result.transaction).toBeNull();
    expect(await readDrafts(database, userA)).toHaveLength(0);
  });

  it("tetap menerima nominal lain pada hari yang sama", async () => {
    const result = await ingestEmail(database, userA, {
      text: debitEmail.replace("150.000", "151.000"),
      subject: "Mutasi lain lagi",
      messageId: "<beda@bsi>",
    });

    expect(result.duplicate).toBe(false);
    expect(result.draft).not.toBeNull();

    // Bersihkan draf supaya tes webhook di bawah mulai dari keadaan kosong.
    await dismissDraft(database, userA, result.draft!.id);
  });
});

describe("webhook penerusan", () => {
  it("mencocokkan alamat ke akun dan membuat draf", async () => {
    process.env.EMAIL_INBOUND_DOMAIN = "inbox.contoh.test";
    try {
      const inbox = await readInbox(database, userB);
      const result = await receiveInbound(database, {
        recipients: [`Sisa <${inbox.address}>`],
        sender: "notifikasi@bsi.co.id",
        subject: "Transaksi Debit",
        text: debitEmail
          .replace("TOKOPEDIA", "WARUNG KOPI")
          .replace("150.000", "28.000"),
        messageId: "<pesan-webhook@bsi>",
      });

      expect(result.userId).toBe(userB);
      expect(result.draft?.merchant).toBe("WARUNG KOPI");

      // Akun lain tidak melihat draf ini.
      expect(await readDrafts(database, userA)).toHaveLength(0);
      expect(await readDrafts(database, userB)).toHaveLength(1);
    } finally {
      delete process.env.EMAIL_INBOUND_DOMAIN;
    }
  });

  it("menolak alamat yang tidak dikenali tanpa melempar error", async () => {
    const result = await receiveInbound(database, {
      recipients: ["sisa+ffffffffffff@inbox.contoh.test"],
      text: debitEmail,
    });
    expect(result.userId).toBeNull();
    expect(result.reason).toMatch(/alamat/i);
  });

  it("menerima pengirim yang hanya mengirim token, tanpa alamat penerusan", async () => {
    const inbox = await readInbox(database, userB);
    expect(inbox.address).toBeNull(); // domain belum diatur di sini
    expect(inbox.token).toMatch(/^[a-f0-9]{12}$/);

    const result = await receiveInbound(database, {
      recipients: [],
      token: inbox.token,
      sender: "notifikasi@bsi.co.id",
      subject: "Notifikasi Transaksi BSI",
      text: debitEmail
        .replace("TOKOPEDIA", "ALFAMART")
        .replace("150.000", "66.000"),
      messageId: "<pesan-token@bsi>",
    });

    expect(result.userId).toBe(userB);
    expect(result.draft?.merchant).toBe("ALFAMART");
  });

  it("menolak token yang tidak dikenali", async () => {
    const result = await receiveInbound(database, {
      recipients: [],
      token: "ffffffffffff",
      text: debitEmail,
    });
    expect(result.userId).toBeNull();
    expect(result.reason).toMatch(/token/i);
  });
});
