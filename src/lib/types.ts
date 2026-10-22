export type CategoryKey =
  | "makanan"
  | "transportasi"
  | "belanja"
  | "tagihan"
  | "hiburan"
  | "kesehatan"
  | "lainnya";

export type TransactionSource = "manual" | "email" | "scan" | "system";

export type TransactionDirection = "expense" | "income";

export interface Transaction {
  id: string;
  /** ISO date, mis. "2026-10-07" */
  date: string;
  /** HH:mm */
  time: string;
  merchant: string;
  note?: string;
  category: CategoryKey | null;
  amount: number;
  direction: TransactionDirection;
  source: TransactionSource;
}

/** Bentuk data yang dikirim form ke penyimpanan; id dibuat oleh store. */
export type TransactionDraft = Omit<Transaction, "id">;

/** Anggaran bulanan: satu batas total dan batas opsional per kategori. */
export interface Budget {
  total: number;
  limits: Partial<Record<CategoryKey, number>>;
}

export interface CategoryTotal {
  category: CategoryKey;
  amount: number;
  count: number;
}

export interface DailyPoint {
  day: number;
  current: number;
  previous: number;
}

/** Hasil parsing email bank yang menunggu konfirmasi pengguna. */
export interface EmailDraft {
  id: string;
  date: string;
  time: string;
  merchant: string;
  amount: number;
  direction: TransactionDirection;
  category: CategoryKey | null;
  note?: string;
  subject?: string;
  sender?: string;
  /** ISO timestamp kapan email diterima. */
  receivedAt: string;
}
