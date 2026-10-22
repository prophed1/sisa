import type { BetterAuthOptions } from "better-auth";
import { getPool } from "@/lib/db/pg";

/**
 * Konfigurasi Better Auth tanpa plugin Next.js, supaya skrip dan pengujian
 * bisa memakainya di luar runtime Next. Dibaca saat dipanggil, bukan saat
 * modul dimuat, jadi `next build` dan `npm test` jalan tanpa `DATABASE_URL`.
 */
export function authOptions(): BetterAuthOptions {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET belum diisi. Lihat .env.example untuk cara membuatnya.",
    );
  }

  return {
    database: getPool(),
    secret,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Satu pengguna, tanpa layanan email: verifikasi tautan dilewati.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  };
}
