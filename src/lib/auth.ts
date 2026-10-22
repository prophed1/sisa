import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "@/lib/auth-options";

/**
 * Instance untuk runtime Next: `nextCookies()` menyalurkan cookie sesi lewat
 * `next/headers`, jadi hanya boleh dimuat dari kode server Next.
 */
export function createAuth(overrides: Partial<BetterAuthOptions> = {}) {
  return betterAuth({ ...authOptions(), plugins: [nextCookies()], ...overrides });
}

let instance: ReturnType<typeof createAuth> | null = null;

/** Satu instance per proses, dibuat pada permintaan pertama. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
