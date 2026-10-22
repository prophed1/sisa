import { randomBytes } from "node:crypto";
import { CATEGORY_ORDER } from "@/lib/data/categories";
import { SCHEMA_SQL } from "@/lib/db/schema";
import type {
  Budget,
  CategoryKey,
  EmailDraft,
  Transaction,
  TransactionDirection,
  TransactionDraft,
  TransactionSource,
} from "@/lib/types";

/**
 * Cukup untuk `pg.Pool.query` maupun klien Postgres lain, sehingga kueri di
 * sini bisa diuji terhadap Postgres sungguhan tanpa layanan cloud.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

interface TransactionRow {
  id: string;
  date: string;
  time: string;
  merchant: string;
  note: string | null;
  category: string | null;
  amount: number;
  direction: string;
  source: string;
}

const CATEGORIES = new Set<string>(CATEGORY_ORDER);
const DIRECTIONS = new Set<string>(["expense", "income"]);
const SOURCES = new Set<string>(["manual", "email", "scan", "system"]);

/** Nilai dari database tidak dipercaya begitu saja; rapikan ke bentuk aplikasi. */
export function toTransaction(row: TransactionRow): Transaction {
  const category = row.category && CATEGORIES.has(row.category)
    ? (row.category as CategoryKey)
    : null;
  const direction: TransactionDirection = DIRECTIONS.has(row.direction)
    ? (row.direction as TransactionDirection)
    : "expense";
  const source: TransactionSource = SOURCES.has(row.source)
    ? (row.source as TransactionSource)
    : "manual";

  return {
    id: row.id,
    date: row.date,
    time: row.time,
    merchant: row.merchant,
    note: row.note ?? undefined,
    category,
    amount: Number(row.amount),
    direction,
    source,
  };
}

export function toBudget(value: unknown): Budget {
  const raw = (value ?? {}) as { total?: unknown; limits?: unknown };
  const total = Number(raw.total);
  const limits: Partial<Record<CategoryKey, number>> = {};
  if (raw.limits && typeof raw.limits === "object") {
    for (const [key, limit] of Object.entries(raw.limits as Record<string, unknown>)) {
      const amount = Number(limit);
      if (CATEGORIES.has(key) && Number.isFinite(amount) && amount >= 0) {
        limits[key as CategoryKey] = Math.round(amount);
      }
    }
  }
  return { total: Number.isFinite(total) && total > 0 ? Math.round(total) : 0, limits };
}

/** `date` dibaca sebagai teks supaya tidak bergeser karena zona waktu. */
const SELECT_COLUMNS = `
  id, date::text as date, time, merchant, note, category, amount, direction, source
`;

export async function ensureSchema(db: Queryable) {
  await db.query(SCHEMA_SQL);
}

export async function listTransactions(
  db: Queryable,
  userId: string,
): Promise<Transaction[]> {
  const { rows } = await db.query<TransactionRow>(
    `select ${SELECT_COLUMNS} from transactions
      where user_id = $1
      order by date desc, time desc`,
    [userId],
  );
  return rows.map(toTransaction);
}

export async function countTransactions(db: Queryable, userId: string) {
  const { rows } = await db.query<{ count: number }>(
    "select count(*)::int as count from transactions where user_id = $1",
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function deleteTransaction(
  db: Queryable,
  userId: string,
  id: string,
) {
  await deleteTransactions(db, userId, [id]);
}

/** Hapus sekumpulan catatan milik satu pengguna dalam satu pernyataan. */
export async function deleteTransactions(
  db: Queryable,
  userId: string,
  ids: string[],
) {
  if (ids.length === 0) return 0;
  await db.query(
    "delete from transactions where user_id = $1 and id = any($2::text[])",
    [userId, ids],
  );
  return ids.length;
}

/** Kosongkan ledger satu pengguna; dasar dari “kembalikan data contoh”. */
export async function deleteAllTransactions(db: Queryable, userId: string) {
  await db.query("delete from transactions where user_id = $1", [userId]);
}

/**
 * Satu pernyataan Postgres memakai 10 parameter per baris, jadi kiriman
 * besar dipecah agar tidak menembus batas parameter apapun. */
const ROWS_PER_STATEMENT = 500;

/**
 * Simpan banyak catatan sekaligus. Id yang sama di-update, jadi mengimpor
 * ulang berkas yang sama atau mengulang migrasi tidak menggandakan catatan.
 */
export async function saveTransactions(
  db: Queryable,
  userId: string,
  rows: Transaction[],
) {
  if (rows.length === 0) return 0;

  for (let start = 0; start < rows.length; start += ROWS_PER_STATEMENT) {
    const chunk = rows.slice(start, start + ROWS_PER_STATEMENT);
    const values: unknown[] = [];
    const tuples = chunk.map((tx, index) => {
      const base = index * 10;
      values.push(
        userId,
        tx.id,
        tx.date,
        tx.time,
        tx.merchant,
        tx.note ?? null,
        tx.category,
        Math.round(tx.amount),
        tx.direction,
        tx.source,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
    });

    await db.query(
      `insert into transactions
         (user_id, id, date, time, merchant, note, category, amount, direction, source)
       values ${tuples.join(", ")}
       on conflict (user_id, id) do update set
         date = excluded.date,
         time = excluded.time,
         merchant = excluded.merchant,
         note = excluded.note,
         category = excluded.category,
         amount = excluded.amount,
         direction = excluded.direction,
         source = excluded.source,
         updated_at = now()`,
      values,
    );
  }

  return rows.length;
}

/**
 * Jarak jam yang masih dianggap transaksi yang sama. Email bank menulis jam
 * notifikasi, sedangkan catatan manual kadang dibulatkan ke menit terdekat,
 * jadi jendela kecil ini mencegah catatan yang sama tercatat dua kali tanpa
 * menelan dua pembayaran berbeda dengan nominal sama di hari yang sama.
 */
export const SAME_TRANSACTION_MINUTES = 10;

export interface DraftFingerprint {
  date: string;
  time: string;
  amount: number;
  direction: TransactionDirection;
}

/**
 * Catatan yang sudah ada dengan tanggal, nominal, dan jenis yang sama.
 * Dipakai jalur email supaya mutasi yang sudah pernah diinput tidak tersimpan
 * dua kali — termasuk catatan lama dari bulan-bulan sebelumnya.
 */
export async function findSimilarTransaction(
  db: Queryable,
  userId: string,
  input: DraftFingerprint,
): Promise<Transaction | null> {
  const { rows } = await db.query<TransactionRow>(
    `select ${SELECT_COLUMNS} from transactions
      where user_id = $1
        and date = $2::date
        and amount = $3
        and direction = $4
        and abs(extract(epoch from (time::time - $5::time))) <= $6
      order by date desc
      limit 1`,
    [
      userId,
      input.date,
      Math.round(input.amount),
      input.direction,
      input.time,
      SAME_TRANSACTION_MINUTES * 60,
    ],
  );
  return rows[0] ? toTransaction(rows[0]) : null;
}

/** Sama seperti di atas, tetapi untuk draf yang masih menunggu konfirmasi. */
export async function findSimilarDraft(
  db: Queryable,
  userId: string,
  input: DraftFingerprint,
): Promise<EmailDraft | null> {
  const { rows } = await db.query<DraftRow>(
    `select ${DRAFT_COLUMNS} from email_drafts
      where user_id = $1
        and status = 'pending'
        and date = $2::date
        and amount = $3
        and direction = $4
        and abs(extract(epoch from (time::time - $5::time))) <= $6
      limit 1`,
    [
      userId,
      input.date,
      Math.round(input.amount),
      input.direction,
      input.time,
      SAME_TRANSACTION_MINUTES * 60,
    ],
  );
  return rows[0] ? toEmailDraft(rows[0]) : null;
}

/** Kolom tabel email_drafts untuk draf yang menunggu konfirmasi. */
interface DraftRow {
  id: string;
  date: string;
  time: string;
  merchant: string;
  amount: number;
  direction: string;
  category: string | null;
  note: string | null;
  subject: string | null;
  sender: string | null;
  received_at: string;
}

const DRAFT_COLUMNS = `
  id, date::text as date, time, merchant, amount, direction, category, note,
  subject, sender, received_at::text as received_at
`;

function toEmailDraft(row: DraftRow): EmailDraft {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    merchant: row.merchant,
    amount: Number(row.amount),
    direction: row.direction === "income" ? "income" : "expense",
    category:
      row.category && CATEGORIES.has(row.category)
        ? (row.category as CategoryKey)
        : null,
    note: row.note ?? undefined,
    subject: row.subject ?? undefined,
    sender: row.sender ?? undefined,
    receivedAt: row.received_at,
  };
}

/** Token alamat penerusan email; dibuat sekali lalu dipakai terus. */
export async function ensureInboxToken(db: Queryable, userId: string) {
  const existing = await db.query<{ token: string }>(
    "select token from email_inbox where user_id = $1",
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0].token;

  // Tabrakan token sangat kecil kemungkinannya, tetapi tetap dicoba ulang.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(6).toString("hex");
    const inserted = await db.query<{ token: string }>(
      `insert into email_inbox (user_id, token) values ($1, $2)
       on conflict (user_id) do nothing
       returning token`,
      [userId, token],
    );
    if (inserted.rows[0]) return inserted.rows[0].token;

    const again = await db.query<{ token: string }>(
      "select token from email_inbox where user_id = $1",
      [userId],
    );
    if (again.rows[0]) return again.rows[0].token;
  }

  throw new Error("Tidak bisa membuat alamat email penerusan.");
}

export async function findInboxUserId(db: Queryable, token: string) {
  const { rows } = await db.query<{ user_id: string }>(
    "select user_id from email_inbox where token = $1",
    [token],
  );
  return rows[0]?.user_id ?? null;
}

export async function insertEmailDraft(
  db: Queryable,
  userId: string,
  draft: EmailDraft & {
    messageId?: string;
    rawText?: string;
  },
): Promise<EmailDraft | null> {
  const { rows } = await db.query<DraftRow>(
    `insert into email_drafts
       (user_id, id, message_id, sender, subject, date, time, merchant, amount,
        direction, category, note, raw_text)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     on conflict (user_id, id) do nothing
     returning ${DRAFT_COLUMNS}`,
    [
      userId,
      draft.id,
      draft.messageId ?? null,
      draft.sender ?? null,
      draft.subject ?? null,
      draft.date,
      draft.time,
      draft.merchant,
      Math.round(draft.amount),
      draft.direction,
      draft.category,
      draft.note ?? null,
      draft.rawText ?? null,
    ],
  );
  return rows[0] ? toEmailDraft(rows[0]) : null;
}

/** Satu halaman daftar draf; dipakai juga saat menyusul email lama. */
export const DRAFT_PAGE_SIZE = 50;

/**
 * Draf yang masih menunggu konfirmasi, terbaru dulu. `id` ikut jadi urutan
 * kedua karena email lama yang diimpor sekaligus punya `received_at` yang
 * hampir sama — tanpa itu halaman bisa melompati atau mengulang baris.
 */
export async function listEmailDrafts(
  db: Queryable,
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<EmailDraft[]> {
  const limit = Math.min(Math.max(options.limit ?? DRAFT_PAGE_SIZE, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const { rows } = await db.query<DraftRow>(
    `select ${DRAFT_COLUMNS} from email_drafts
      where user_id = $1 and status = 'pending'
      order by received_at desc, id desc
      limit $2 offset $3`,
    [userId, limit, offset],
  );
  return rows.map(toEmailDraft);
}

/** Jumlah seluruh draf yang menunggu, termasuk yang belum tampil di layar. */
export async function countPendingEmailDrafts(
  db: Queryable,
  userId: string,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `select count(*)::text as count from email_drafts
      where user_id = $1 and status = 'pending'`,
    [userId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getEmailDraft(
  db: Queryable,
  userId: string,
  id: string,
) {
  const { rows } = await db.query<DraftRow>(
    `select ${DRAFT_COLUMNS} from email_drafts
      where user_id = $1 and id = $2 and status = 'pending'`,
    [userId, id],
  );
  return rows[0] ? toEmailDraft(rows[0]) : null;
}

export async function setEmailDraftStatus(
  db: Queryable,
  userId: string,
  id: string,
  status: "confirmed" | "dismissed",
) {
  await db.query(
    "update email_drafts set status = $3 where user_id = $1 and id = $2",
    [userId, id, status],
  );
}

export async function getBudgets(
  db: Queryable,
  userId: string,
): Promise<Record<string, Budget>> {
  const { rows } = await db.query<{
    month: string;
    total: number;
    limits: unknown;
  }>("select month, total, limits from budgets where user_id = $1", [userId]);

  const budgets: Record<string, Budget> = {};
  for (const row of rows) {
    budgets[row.month] = {
      total: Number.isFinite(Number(row.total)) ? Math.round(Number(row.total)) : 0,
      limits: toBudget(row).limits,
    };
  }
  return budgets;
}

export async function saveBudget(
  db: Queryable,
  userId: string,
  month: string,
  budget: Budget,
) {
  await db.query(
    `insert into budgets (user_id, month, total, limits)
     values ($1, $2, $3, $4::jsonb)
     on conflict (user_id, month) do update set
       total = excluded.total,
       limits = excluded.limits,
       updated_at = now()`,
    [userId, month, Math.round(budget.total), JSON.stringify(budget.limits)],
  );
}

/**
 * Pindahkan ledger lokal ke akun pertama. Dijalankan sekali: kalau akun itu
 * sudah punya catatan, tidak ada yang ditulis supaya data perangkat tidak
 * menimpa data server.
 */
export async function migrateLedger(
  db: Queryable,
  userId: string,
  local: { transactions: Transaction[]; budget: Budget; month: string },
) {
  const existing = await countTransactions(db, userId);
  if (existing > 0) {
    return { moved: 0, skipped: true, existing };
  }
  const moved = await saveTransactions(db, userId, local.transactions);
  await saveBudget(db, userId, local.month, local.budget);
  return { moved, skipped: false, existing: 0 };
}

/** Buang nilai yang tidak masuk akal sebelum menyentuh database. */
export function toDraft(tx: Transaction): TransactionDraft & { id: string } {
  return {
    id: tx.id,
    date: tx.date,
    time: tx.time,
    merchant: tx.merchant,
    note: tx.note,
    category: tx.category,
    amount: tx.amount,
    direction: tx.direction,
    source: tx.source,
  };
}
