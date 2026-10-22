import { getSessionUser } from "@/lib/auth-session";
import { database } from "@/lib/db/pg";
import { isBodyTooLarge, isSameOriginRequest, jsonNoStore } from "@/lib/http";
import { parseOperation } from "@/lib/ledger-input";
import { applyOperation, readLedger } from "@/lib/ledger-service";

/**
 * Satu pintu data ledger untuk aplikasi. Semua permintaan wajib punya sesi;
 * pengguna hanya bisa menyentuh catatan miliknya sendiri.
 */

export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return jsonNoStore({ error: "Perlu masuk dulu." }, { status: 401 });
  }

  try {
    const ledger = await readLedger(database, user.id);
    return jsonNoStore(ledger);
  } catch (error) {
    console.error("[ledger] gagal membaca:", error);
    return jsonNoStore({ error: "Tidak bisa membaca catatan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return jsonNoStore({ error: "Perlu masuk dulu." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return jsonNoStore(
      { error: "Permintaan harus datang dari halaman aplikasi." },
      { status: 403 },
    );
  }
  if (isBodyTooLarge(request)) {
    return jsonNoStore({ error: "Kiriman terlalu besar." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const operation = parseOperation(body);
  if (!operation) {
    return jsonNoStore(
      { error: "Bentuk perubahan tidak dikenali." },
      { status: 400 },
    );
  }

  try {
    const result = await applyOperation(database, user.id, operation);
    return jsonNoStore(result);
  } catch (error) {
    console.error("[ledger] gagal menyimpan:", error);
    return jsonNoStore(
      { error: "Perubahan tidak tersimpan. Coba lagi." },
      { status: 500 },
    );
  }
}
