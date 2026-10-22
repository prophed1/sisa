/**
 * Menyiapkan database: tabel ledger lalu tabel Better Auth.
 *
 * Jalankan dengan `npm run db:setup`, yang memuat `.env.local` lebih dulu.
 * Skrip ini tidak pernah mencetak string koneksi atau rahasia apa pun.
 */
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "@": new URL("../src", import.meta.url).pathname },
  interopDefault: true,
});

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL kosong. Isi di .env.local (lihat .env.example), lalu jalankan lagi.",
  );
  process.exit(1);
}

try {
  const { database } = await jiti.import("../src/lib/db/pg.ts");
  const { setupDatabase } = await jiti.import("../src/lib/db/setup.ts");

  const result = await setupDatabase(database);
  console.log("Tabel ledger siap:", result.ledger.join(", "));
  console.log(
    result.authTables.length
      ? `Tabel auth baru dibuat: ${result.authTables.join(", ")}`
      : "Tabel auth sudah ada sebelumnya.",
  );
  console.log("Selesai. Tidak ada data yang dihapus.");
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Gagal menyiapkan database:", message);
  process.exit(1);
}
