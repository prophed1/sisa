import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

/**
 * Sesi yang sudah diverifikasi, dipakai bersama oleh layout server dan route
 * handler. `userId` dari sini adalah satu-satunya sumber identitas; id yang
 * dikirim klien tidak pernah dipercaya.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export async function getSessionUser(
  requestHeaders?: Headers,
): Promise<SessionUser | null> {
  const headerList = requestHeaders ?? (await headers());
  const session = await getAuth().api.getSession({ headers: headerList });
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
