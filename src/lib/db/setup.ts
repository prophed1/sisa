import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "@/lib/auth-options";
import { ensureSchema, type Queryable } from "@/lib/db/repository";
import type { BetterAuthOptions } from "better-auth";

export interface SetupResult {
  /** Tabel ledger yang dipastikan ada. */
  ledger: string[];
  /** Tabel Better Auth yang baru dibuat pada pemanggilan ini. */
  authTables: string[];
}

/**
 * Siapkan database: tabel ledger lebih dulu, lalu tabel Better Auth lewat
 * perencana migrasi resminya. Aman dipanggil berkali-kali.
 */
export async function setupDatabase(
  db: Queryable,
  options: BetterAuthOptions = authOptions(),
): Promise<SetupResult> {
  await ensureSchema(db);

  const migration = await getMigrations(options, { throwOnUnsafe: true });
  const authTables = migration.toBeCreated.map((entry) => entry.table);
  await migration.runMigrations();

  return {
    ledger: ["transactions", "budgets"],
    authTables,
  };
}
