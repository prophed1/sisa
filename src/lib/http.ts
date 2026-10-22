/**
 * Pembantu kecil untuk route handler: jawaban yang tidak boleh di-cache dan
 * pemeriksaan asal permintaan untuk perintah yang mengubah data.
 */

/** Batas badan permintaan; lebih dari ini bukan lagi catatan pribadi. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

export function jsonNoStore(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...(init?.headers ?? {}) },
  });
}

/**
 * Permintaan yang mengubah data hanya diterima kalau datang dari halaman
 * aplikasi ini sendiri. Peramban selalu mengirim header `Origin` untuk POST,
 * jadi ketiadaannya pun ditolak — sama seperti pemeriksaan CSRF Better Auth.
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function isBodyTooLarge(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}
