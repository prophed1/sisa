import { Pool } from "pg";
import type { Queryable } from "@/lib/db/repository";

/**
 * Khusus sisi server. Jangan diimpor dari komponen klien: berkas ini memegang
 * string koneksi database.
 *
 * Kolam koneksi dibuat sekali per proses dan baru dibuka saat kueri pertama,
 * jadi `next build` tetap bisa jalan tanpa `DATABASE_URL`.
 */
let pool: Pool | null = null;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin connection string Neon ke .env.local.",
    );
  }
  if (!pool) {
    const created = new Pool({
      connectionString,
      max: 5,
      // Neon mematikan koneksi diam; batas ini menghindari koneksi mati dipakai ulang.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    // Koneksi diam yang diputus penyedia tidak boleh menjatuhkan proses.
    // Dipasang sekali saat kolam dibuat, bukan tiap kali diambil.
    created.on("error", (error) => {
      console.error("[db] koneksi idle diputus:", error.message);
    });
    pool = created;
  }

  return pool;
}

/** Tutup kolam dengan rapi; dipakai skrip dan pengujian sebelum keluar. */
export async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

export const database: Queryable = {
  async query<T>(text: string, params?: unknown[]) {
    const result = await getPool().query(text, params);
    return { rows: result.rows as T[] };
  },
};
