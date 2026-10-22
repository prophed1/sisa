import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db/pg";
import { receiveInbound } from "@/lib/email-service";
import { isBodyTooLarge, jsonNoStore } from "@/lib/http";

/**
 * Webhook penerusan email. Tidak memakai sesi karena yang memanggil adalah
 * penyedia email, jadi pintunya dijaga rahasia bersama di header
 * `x-inbound-secret`. Hasilnya selalu draf, bukan transaksi.
 */

function secretMatches(value: string | null, expected: string) {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function firstString(
  payload: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function recipientsOf(payload: Record<string, unknown>) {
  const value = payload.to ?? payload.recipient ?? payload.envelope_to;
  const raw = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(/[,;]+/)
      : [];
  return raw.map((item) => item.trim()).filter(Boolean);
}

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as unknown;
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") payload[key] = value;
  }
  return payload;
}

export async function POST(request: Request) {
  const secret = process.env.EMAIL_INBOUND_SECRET;
  if (!secret) {
    return jsonNoStore(
      {
        error:
          "EMAIL_INBOUND_SECRET belum diatur, jadi webhook email belum aktif.",
      },
      { status: 503 },
    );
  }
  if (!secretMatches(request.headers.get("x-inbound-secret"), secret)) {
    return jsonNoStore({ error: "Rahasia webhook tidak cocok." }, { status: 401 });
  }
  if (isBodyTooLarge(request)) {
    return jsonNoStore({ error: "Kiriman terlalu besar." }, { status: 413 });
  }

  const payload = await readPayload(request);
  const recipients = recipientsOf(payload);

  // Pengirim tanpa alamat penerusan (skrip Gmail, mis.) menyebut tokennya
  // langsung di badan permintaan atau di header.
  const token =
    firstString(payload, ["token", "inbox_token", "inboxToken"]) ??
    request.headers.get("x-inbox-token") ??
    undefined;

  if (recipients.length === 0 && !token) {
    return jsonNoStore(
      { error: "Alamat penerima atau token penerusan kosong." },
      { status: 400 },
    );
  }

  const text =
    firstString(payload, [
      "text",
      "body-plain",
      "stripped-text",
      "body",
      "html",
      "content",
    ]) ?? "";

  try {
    const result = await receiveInbound(database, {
      recipients,
      token,
      sender: firstString(payload, ["from", "sender", "envelope_from"]),
      subject: firstString(payload, ["subject", "Subject"]),
      text,
      messageId: firstString(payload, [
        "message-id",
        "messageId",
        "Message-Id",
        "Message-ID",
      ]),
    });

    // 202 untuk semua email yang diterima penyedia: yang tidak dikenali cukup
    // dicatat, tidak perlu dikirim ulang berkali-kali.
    return jsonNoStore(
      {
        accepted: result.draft !== null,
        duplicate: result.duplicate,
        reason: result.reason,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[email] webhook gagal:", error);
    return jsonNoStore({ error: "Email tidak bisa diproses." }, { status: 500 });
  }
}
