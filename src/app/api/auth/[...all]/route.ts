import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/**
 * Semua endpoint Better Auth (/api/auth/sign-up/email, /sign-in/email,
 * /get-session, /sign-out, ...) diarahkan ke instance yang dibuat saat
 * permintaan pertama, sehingga build tidak butuh `DATABASE_URL`.
 */
const handler = toNextJsHandler((request) => getAuth().handler(request));

export const { GET, POST } = handler;
