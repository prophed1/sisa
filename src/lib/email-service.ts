import { createHash } from "node:crypto";
import { suggestCategory } from "@/lib/categorize";
import {
  countPendingEmailDrafts,
  ensureInboxToken,
  findInboxUserId,
  findSimilarDraft,
  findSimilarTransaction,
  getEmailDraft,
  insertEmailDraft,
  listEmailDrafts,
  listTransactions,
  saveTransactions,
  setEmailDraftStatus,
  type Queryable,
} from "@/lib/db/repository";
import { parseBankEmail } from "@/lib/email-parse";
import type { CategoryKey, EmailDraft, Transaction } from "@/lib/types";

/**
 * Alur email bank: masuk → diparsing → disimpan sebagai draf → pengguna
 * mengonfirmasi → baru menjadi transaksi. Tidak ada email yang langsung
 * menulis ke ledger.
 */

export function inboxAddress(token: string) {
  const domain = process.env.EMAIL_INBOUND_DOMAIN?.trim();
  return domain ? `sisa+${token}@${domain}` : null;
}

export async function readInbox(db: Queryable, userId: string) {
  const token = await ensureInboxToken(db, userId);
  return {
    address: inboxAddress(token),
    // Token selalu ada, alamat butuh domain. Tanpa domain, pengirim yang
    // memanggil webhook sendiri (mis. skrip Gmail) memakai token ini.
    token,
    webhookConfigured: Boolean(process.env.EMAIL_INBOUND_SECRET),
  };
}

export async function readDrafts(db: Queryable, userId: string) {
  return listEmailDrafts(db, userId);
}

/** Satu halaman draf beserta jumlah total yang menunggu. */
export async function readDraftPage(
  db: Queryable,
  userId: string,
  options: { limit?: number; offset?: number } = {},
) {
  const [drafts, total] = await Promise.all([
    listEmailDrafts(db, userId, options),
    countPendingEmailDrafts(db, userId),
  ]);
  return { drafts, total };
}

/** Id draf dibuat deterministik supaya email yang sama tidak masuk dua kali. */
function draftId(seed: string) {
  return `draft-${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

export interface IngestResult {
  draft: EmailDraft | null;
  duplicate: boolean;
  reason?: string;
}

/** "17 Okt 2026, 14:32" tanpa mengimpor format tanggal penuh ke lapisan data. */
function momentText(date: string, time: string) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = Number(date.slice(8, 10));
  const month = months[Number(date.slice(5, 7)) - 1] ?? "";
  return `${day} ${month} ${date.slice(0, 4)}, ${time}`;
}

/** Parsing satu email; dipakai jalur tempel maupun webhook. */
export async function ingestEmail(
  db: Queryable,
  userId: string,
  input: {
    text: string;
    subject?: string;
    sender?: string;
    messageId?: string;
  },
): Promise<IngestResult> {
  const parsed = parseBankEmail({ subject: input.subject, text: input.text });
  if (!parsed.draft) {
    return { draft: null, duplicate: false, reason: parsed.reason };
  }

  const email = parsed.draft;

  // Email BSI bisa diteruskan berkali-kali (trigger berulang, penerusan ulang,
  // atau mutasi dari bulan lalu yang baru disalin). Sebelum draf dibuat,
  // bandingkan dengan catatan yang sudah ada di bulan mana pun dan dengan draf
  // lain yang masih menunggu — bukan hanya dengan message-id yang sama.
  const existing = await findSimilarTransaction(db, userId, email);
  if (existing) {
    return {
      draft: null,
      duplicate: true,
      reason: `Sudah tercatat: ${existing.merchant} ${momentText(
        existing.date,
        existing.time,
      )}.`,
    };
  }

  const pending = await findSimilarDraft(db, userId, email);
  if (pending) {
    return {
      draft: null,
      duplicate: true,
      reason: `Draf untuk ${pending.merchant} ${momentText(
        pending.date,
        pending.time,
      )} sudah menunggu konfirmasi.`,
    };
  }

  const seed =
    input.messageId ??
    [
      input.sender ?? "",
      input.subject ?? "",
      email.date,
      email.amount,
      email.merchant,
      email.source,
    ].join("|");

  const stored = await insertEmailDraft(db, userId, {
    id: draftId(seed),
    date: email.date,
    time: email.time,
    merchant: email.merchant,
    amount: email.amount,
    direction: email.direction,
    category: null,
    note: email.note,
    subject: input.subject,
    sender: input.sender,
    receivedAt: new Date().toISOString(),
    messageId: input.messageId,
    rawText: email.source,
  });

  return { draft: stored, duplicate: stored === null };
}

export interface ConfirmResult {
  transaction: Transaction | null;
  /** Catatan dengan tanggal, nominal, dan jenis yang sama sudah ada. */
  duplicate: boolean;
  existing?: Transaction;
}

/**
 * Simpan draf sebagai transaksi sungguhan lalu tandai sudah dikonfirmasi.
 * `chosenCategory` adalah kategori yang dipilih pengguna di kartu draf; kalau
 * kosong, kategori ditebak seperti jalur impor CSV.
 */
export async function confirmDraft(
  db: Queryable,
  userId: string,
  id: string,
  chosenCategory?: CategoryKey | null,
): Promise<ConfirmResult> {
  const draft = await getEmailDraft(db, userId, id);
  if (!draft) return { transaction: null, duplicate: false };

  // Draf bisa menunggu beberapa hari; selama itu pengguna mungkin sudah
  // mencatat mutasi yang sama. Periksa sekali lagi tepat sebelum menulis.
  const existing = await findSimilarTransaction(db, userId, draft);
  if (existing) {
    await setEmailDraftStatus(db, userId, id, "dismissed");
    return { transaction: null, duplicate: true, existing };
  }

  // Kategori diisi seperti jalur impor CSV: pilihan pengguna lebih dulu, lalu
  // riwayat merchant sendiri, lalu kamus kata kunci. Tanpa itu semua catatan
  // dari email menumpuk tanpa kategori dan grafik per kategori kehilangan
  // sebagian isinya.
  const category =
    chosenCategory ??
    draft.category ??
    (draft.direction === "expense"
      ? suggestCategory(draft.merchant, await listTransactions(db, userId))
          ?.category ?? null
      : null);

  const transaction: Transaction = {
    id: `trx-${draft.id}`,
    date: draft.date,
    time: draft.time,
    merchant: draft.merchant,
    note: draft.note ?? draft.subject,
    category,
    amount: draft.amount,
    direction: draft.direction,
    source: "email",
  };

  await saveTransactions(db, userId, [transaction]);
  await setEmailDraftStatus(db, userId, id, "confirmed");
  return { transaction, duplicate: false };
}

export async function dismissDraft(db: Queryable, userId: string, id: string) {
  await setEmailDraftStatus(db, userId, id, "dismissed");
}

/** Berapa draf yang disimpan per permintaan saat pengguna menekan Simpan semua. */
export const BULK_CONFIRM_LIMIT = 25;

export interface BulkConfirmResult {
  confirmed: number;
  /** Draf yang ditutup karena mutasinya sudah ada di catatan. */
  skipped: number;
  /** Sisa draf yang masih menunggu setelah putaran ini. */
  remaining: number;
}

/**
 * Simpan banyak draf sekaligus. Dipakai saat menyusul email lama: satu bulan
 * mutasi bisa menghasilkan puluhan draf, dan menekan Simpan satu per satu
 * membuat impor riwayat tidak masuk akal. Pemanggil mengulang selama
 * `remaining` masih lebih dari nol, jadi satu permintaan tidak pernah
 * menggantung terlalu lama.
 */
export async function confirmPendingDrafts(
  db: Queryable,
  userId: string,
  limit = BULK_CONFIRM_LIMIT,
): Promise<BulkConfirmResult> {
  const batch = await listEmailDrafts(db, userId, { limit, offset: 0 });
  let confirmed = 0;
  let skipped = 0;

  for (const draft of batch) {
    const result = await confirmDraft(db, userId, draft.id);
    if (result.transaction) confirmed += 1;
    else if (result.duplicate) skipped += 1;
  }

  return {
    confirmed,
    skipped,
    remaining: await countPendingEmailDrafts(db, userId),
  };
}

/** Ambil token dari alamat seperti "Sisa <sisa+ab12cd34ef56@domain.test>". */
export function tokenFromRecipient(recipient: string) {
  const match = recipient.match(/[^\s<>,;"]+@[^\s<>,;"]+/);
  if (!match) return null;
  const local = match[0].slice(0, match[0].indexOf("@"));
  const token = local.includes("+") ? local.slice(local.lastIndexOf("+") + 1) : local;
  return /^[a-f0-9]{8,32}$/i.test(token) ? token.toLowerCase() : null;
}

export interface InboundResult {
  userId: string | null;
  draft: EmailDraft | null;
  duplicate: boolean;
  reason?: string;
}

/** Token yang dikirim langsung oleh pengirim webhook, bukan dari alamat. */
export function normalizeToken(raw: string | undefined) {
  const value = raw?.trim().toLowerCase();
  return value && /^[a-f0-9]{8,32}$/.test(value) ? value : null;
}

/** Titik masuk webhook penyedia penerusan email. */
export async function receiveInbound(
  db: Queryable,
  input: {
    recipients: string[];
    /** Dipakai kalau pengirim tidak punya alamat penerima, mis. skrip Gmail. */
    token?: string;
    sender?: string;
    subject?: string;
    text: string;
    messageId?: string;
  },
): Promise<InboundResult> {
  const direct = normalizeToken(input.token);
  if (direct) {
    const userId = await findInboxUserId(db, direct);
    if (userId) {
      const result = await ingestEmail(db, userId, {
        text: input.text,
        subject: input.subject,
        sender: input.sender,
        messageId: input.messageId,
      });
      return { userId, ...result };
    }
  }

  for (const recipient of input.recipients) {
    const token = tokenFromRecipient(recipient);
    if (!token) continue;
    const userId = await findInboxUserId(db, token);
    if (!userId) continue;

    const result = await ingestEmail(db, userId, {
      text: input.text,
      subject: input.subject,
      sender: input.sender,
      messageId: input.messageId,
    });

    return { userId, ...result };
  }

  return {
    userId: null,
    draft: null,
    duplicate: false,
    reason: direct
      ? "Token penerusan tidak dikenali."
      : "Alamat penerima tidak dikenali.",
  };
}
