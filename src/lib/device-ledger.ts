import { DEFAULT_BUDGET, SEED_TRANSACTIONS } from "@/lib/data/ledger-seed";
import type { Budget, Transaction } from "@/lib/types";

/**
 * Catatan yang dulu hidup di `localStorage` sekarang tinggal di akun. Berkas
 * ini membacanya sekali saja, untuk dipindahkan ke akun pertama yang masuk di
 * peramban ini; sesudah itu penanda di bawah mencegah pemindahan kedua.
 *
 * Hanya sisi klien: `localStorage` tidak ada di server.
 */

const STORAGE_KEY = "sisa.ledger.v1";
const ADOPTED_KEY = "sisa.ledger.adopted.v1";
const SEED_VERSION = 2;

/** Id data contoh versi lama (Oktober saja) untuk mengenali catatan yang belum disentuh. */
const LEGACY_SAMPLE_IDS = new Set(
  Array.from({ length: 53 }, (_, index) =>
    `trx-${String(index + 1).padStart(4, "0")}`,
  ),
);

export interface DeviceLedger {
  transactions: Transaction[];
  budget: Budget;
}

function isTransaction(value: unknown): value is Transaction {
  const tx = value as Partial<Transaction> | null;
  return Boolean(
    tx &&
      typeof tx.id === "string" &&
      typeof tx.date === "string" &&
      typeof tx.merchant === "string" &&
      typeof tx.amount === "number" &&
      (tx.direction === "expense" || tx.direction === "income"),
  );
}

function isBudget(value: unknown): value is Budget {
  const budget = value as Partial<Budget> | null;
  return Boolean(
    budget &&
      typeof budget.total === "number" &&
      budget.limits !== null &&
      typeof budget.limits === "object",
  );
}

/**
 * Ledger yang tampil di peramban ini sebelum ada akun — termasuk suntingan
 * pengguna. `null` berarti sudah pernah dipindahkan (atau tidak ada apa-apa
 * yang bisa dibaca).
 */
export function readDeviceLedger(): DeviceLedger | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(ADOPTED_KEY)) return null;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Belum pernah dibuka di peramban ini: yang tampil adalah data contoh.
      return { transactions: SEED_TRANSACTIONS, budget: DEFAULT_BUDGET };
    }

    const parsed = JSON.parse(raw) as {
      transactions?: unknown;
      budget?: unknown;
      seedVersion?: unknown;
    };
    const stored = Array.isArray(parsed?.transactions)
      ? parsed.transactions.filter(isTransaction)
      : null;

    // Riwayat contoh Juli–September hanya diadopsi kalau catatan tersimpan
    // masih persis data contoh lama, jadi catatan sungguhan tidak pernah hilang.
    const version =
      typeof parsed?.seedVersion === "number" ? parsed.seedVersion : 0;
    const untouchedSample =
      stored !== null &&
      stored.length === LEGACY_SAMPLE_IDS.size &&
      stored.every((tx) => LEGACY_SAMPLE_IDS.has(tx.id));
    const adoptSeed = !stored || (version < SEED_VERSION && untouchedSample);

    return {
      transactions: adoptSeed ? SEED_TRANSACTIONS : stored,
      budget: isBudget(parsed?.budget) ? parsed.budget : DEFAULT_BUDGET,
    };
  } catch {
    // Cache rusak atau penyimpanan diblokir: pakai data contoh.
    return { transactions: SEED_TRANSACTIONS, budget: DEFAULT_BUDGET };
  }
}

/** Dipanggil setelah server menerima pemindahan, supaya hanya terjadi sekali. */
export function markDeviceLedgerAdopted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADOPTED_KEY, new Date().toISOString());
  } catch {
    // Penyimpanan diblokir: pemindahan berikutnya akan ditolak server
    // karena akunnya sudah berisi.
  }
}
