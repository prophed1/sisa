import {
  countTransactions,
  deleteAllTransactions,
  deleteTransactions,
  getBudgets,
  listTransactions,
  migrateLedger,
  saveBudget,
  saveTransactions,
  type Queryable,
} from "@/lib/db/repository";
import type { LedgerOperation } from "@/lib/ledger-input";
import type { Budget, Transaction } from "@/lib/types";

/**
 * Satu-satunya pintu ke data ledger di sisi server. Setiap fungsi di sini
 * menerima `userId` dari sesi yang sudah diverifikasi, bukan dari klien, jadi
 * tidak ada cara meminta catatan milik orang lain.
 */

export interface Ledger {
  transactions: Transaction[];
  /** Anggaran per bulan, diindeks "YYYY-MM". Bulan tanpa isi tidak muncul. */
  budgets: Record<string, Budget>;
}

export async function readLedger(db: Queryable, userId: string): Promise<Ledger> {
  const [transactions, budgets] = await Promise.all([
    listTransactions(db, userId),
    getBudgets(db, userId),
  ]);
  return { transactions, budgets };
}

export interface OperationResult {
  /** Keadaan ledger sesudah perubahan, supaya klien tidak perlu menebak. */
  ledger: Ledger;
  /** Berapa baris yang benar-benar tersentuh. */
  affected: number;
  /** Khusus adopsi: true kalau akunnya sudah berisi sehingga tidak ada yang ditulis. */
  skipped?: boolean;
}

async function apply(
  db: Queryable,
  userId: string,
  operation: LedgerOperation,
): Promise<{ affected: number; skipped?: boolean }> {
  switch (operation.type) {
    case "upsert": {
      const affected = await saveTransactions(db, userId, operation.transactions);
      return { affected };
    }

    case "delete": {
      const affected = await deleteTransactions(db, userId, operation.ids);
      return { affected };
    }

    case "budget": {
      await saveBudget(db, userId, operation.month, operation.budget);
      return { affected: 1 };
    }

    case "replace": {
      await deleteAllTransactions(db, userId);
      const affected = await saveTransactions(db, userId, operation.transactions);
      return { affected };
    }

    case "adopt": {
      // Hanya akun yang masih kosong yang menerima ledger dari peramban;
      // kalau tidak, data perangkat bisa menimpa data yang sudah ada.
      const result = await migrateLedger(db, userId, {
        transactions: operation.transactions,
        budget: operation.budget,
        month: operation.month,
      });
      return { affected: result.moved, skipped: result.skipped };
    }
  }
}

/** Terapkan satu perintah lalu kembalikan keadaan ledger yang baru dibaca. */
export async function applyOperation(
  db: Queryable,
  userId: string,
  operation: LedgerOperation,
): Promise<OperationResult> {
  const { affected, skipped } = await apply(db, userId, operation);
  const ledger = await readLedger(db, userId);
  return { ledger, affected, skipped };
}

/** Dipakai klien untuk tahu apakah akun ini sudah berisi sebelum mengadopsi. */
export async function isEmptyLedger(db: Queryable, userId: string) {
  return (await countTransactions(db, userId)) === 0;
}
