import {
  findDateInText,
  findTimeInText,
  parseAmountText,
} from "@/lib/receipt-parse";
import type { TransactionDirection } from "@/lib/types";

/**
 * Email notifikasi bank tidak punya satu format baku, bahkan dari bank yang
 * sama. Parser ini membaca penanda yang paling sering muncul (nominal, tanggal,
 * merchant/keterangan, kata debit/kredit) dan selalu mengembalikan alasan kalau
 * gagal — draft tidak pernah dibuat dari email yang tidak dipahami.
 */

export interface ParsedBankEmail {
  amount: number;
  date: string;
  time: string;
  merchant: string;
  direction: TransactionDirection;
  note?: string;
  /** Teks asli yang dipakai, untuk ditampilkan di kartu draf. */
  source: string;
}

export interface EmailParseResult {
  draft: ParsedBankEmail | null;
  reason?: string;
}

/** HTML email dipangkas jadi teks biasa sebelum diparsing. */
export function stripHtml(value: string) {
  return value
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|tr|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const DEBIT = /(debit|debet|pengeluaran|keluar|pembayaran|purchase|db\b)/i;
const CREDIT = /(kredit|pemasukan|masuk|penerimaan|transfer\s*masuk|cr\b)/i;

function detectDirection(text: string): TransactionDirection | null {
  // Baris yang menyebut jenis transaksi lebih dipercaya daripada kata yang
  // muncul di catatan kaki (mis. "transaksi debit dan kredit").
  const lines = text.split("\n");
  for (const line of lines) {
    if (!/(transaksi|jenis|type|tipe)/i.test(line)) continue;
    if (DEBIT.test(line) && !CREDIT.test(line)) return "expense";
    if (CREDIT.test(line) && !DEBIT.test(line)) return "income";
  }
  // Kalau tidak ada baris jenis, hitung kemunculan; yang dominan menang.
  const debit = (text.match(new RegExp(DEBIT, "gi")) ?? []).length;
  const credit = (text.match(new RegExp(CREDIT, "gi")) ?? []).length;
  if (debit === 0 && credit === 0) return null;
  if (credit > debit) return "income";
  if (debit > credit) return "expense";
  return null;
}

function findAmount(text: string): number | null {
  const candidates: { value: number; score: number }[] = [];
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    const matches = [
      ...line.matchAll(/(?:rp\.?|idr)\s*([\d][\d.,]*)/gi),
    ];
    if (matches.length === 0) continue;

    for (const match of matches) {
      const value = parseAmountText(match[1]);
      if (value === null || value < 1000 || value > 1_000_000_000) continue;

      let score = 10;
      if (/(nominal|amount|jumlah\s*transaksi|nilai\s*transaksi)/i.test(line))
        score += 60;
      if (/(saldo|balance|sisa\s*saldo)/i.test(line)) score -= 90;
      if (/(biaya|fee|admin|pajak|tax|bunga)/i.test(line)) score -= 50;
      score += index * 0.2;
      candidates.push({ value, score });
    }
  }

  if (candidates.length === 0) {
    // Sebagian email hanya menulis angka tanpa "Rp", mis. "Amount: 150000.00".
    const bare = [
      ...text.matchAll(
        /(?:nominal|amount|jumlah\s*transaksi|nilai\s*transaksi)\s*[:.]?\s*(?:idr|rp)?\s*([\d][\d.,]*)/gi,
      ),
    ];
    for (const match of bare) {
      const value = parseAmountText(match[1]);
      if (value !== null && value >= 1000 && value <= 1_000_000_000) {
        candidates.push({ value, score: 50 });
      }
    }
  }

  // Kandidat dengan skor negatif hampir pasti saldo, biaya, atau potongan.
  return (
    candidates
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.value ?? null
  );
}

/**
 * Penanda yang jelas menyebut merchant. Dipasang di awal baris supaya label
 * lain yang kebetulan memuat kata "transaksi" (mis. "Tanggal Transaksi:")
 * tidak ikut terbaca sebagai nama toko.
 */
const MERCHANT_LABEL =
  /^\s*(?:nama\s+merchant|merchant|keterangan|berita|description|deskripsi|uraian|nama\s+toko|penerima|nama\s+penerima|recipient)\s*[:.\-]\s*(.+)/i;
/** Label serbaguna: dipakai hanya kalau penanda di atas tidak ada. */
const GENERIC_LABEL = /^\s*transaksi\s*[:.\-]\s*(.+)/i;
/** Nilai yang menjelaskan jenis transaksi, bukan merchant. */
const NOT_A_MERCHANT =
  /^(?:transaksi|jenis\s+transaksi|transaksi\s+(?:debit|kredit|debet)|debit|kredit|debet|pembayaran|purchase|transfer(?:\s+(?:masuk|keluar|dana))?|berhasil|sukses|gagal|tunai|saldo)$/i;
const NOISE =
  /(bsi|bank\s*syariah|notifikasi|pemberitahuan|transaksi|debit|kredit|nominal|tanggal|saldo|rekening|account|jangan\s*membalas|email\s*ini)/i;

function cleanMerchant(raw: string) {
  return raw
    .replace(/^[\s:.\-•*]+/, "")
    // Waktu dan tanggal ikut terambil dari baris seperti
    // "Tanggal Transaksi: 18-10-2026 14:32:10"; keduanya bukan nama toko.
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/\b\d{2}[/\-.]\d{2}[/\-.]\d{2,4}\b/g, " ")
    .replace(/[\s:.\-•*]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 60);
}

function looksLikeMerchant(value: string) {
  if (value.length < 3) return false;
  if (NOT_A_MERCHANT.test(value)) return false;
  // Nama toko pasti punya huruf; "14:32:10" atau "000123" bukan merchant.
  if ((value.match(/[a-z]/gi) ?? []).length < 2) return false;
  if (NOISE.test(value) && value.length < 12) return false;
  return true;
}

function findMerchant(text: string, subject: string): string | null {
  const lines = text.split("\n");
  // Penanda khusus dicoba lebih dulu di seluruh baris, baru label serbaguna.
  for (const pattern of [MERCHANT_LABEL, GENERIC_LABEL]) {
    for (const line of lines) {
      const labelled = line.match(pattern);
      if (!labelled) continue;
      const value = cleanMerchant(labelled[1]);
      if (!looksLikeMerchant(value)) continue;
      return value;
    }
  }

  const subjectMerchant = subject.match(
    /(?:di|at|ke|dari)\s+([A-Z0-9][\w&.' -]{2,40})/i,
  );
  if (subjectMerchant) {
    const value = cleanMerchant(subjectMerchant[1]);
    // "Transfer BI Fast (Ke Bank Lain)" menyebut bank tujuan, bukan toko.
    if (looksLikeMerchant(value) && !/^bank\b/i.test(value)) return value;
  }

  return null;
}

export function parseBankEmail(input: {
  subject?: string;
  text: string;
}): EmailParseResult {
  const subject = (input.subject ?? "").trim();
  const text = stripHtml(input.text);
  const combined = `${subject}\n${text}`;

  if (!text && !subject) {
    return { draft: null, reason: "Email tidak punya isi yang bisa dibaca." };
  }

  const amount = findAmount(text) ?? findAmount(subject);
  if (amount === null) {
    return {
      draft: null,
      reason: "Nominal transaksi tidak ditemukan di isi email.",
    };
  }

  const date = findDateInText(combined);
  if (!date) {
    return {
      draft: null,
      reason: "Tanggal transaksi tidak ditemukan di isi email.",
    };
  }

  const merchant = findMerchant(text, subject);
  const direction = detectDirection(combined) ?? "expense";
  const time = findTimeInText(combined) ?? "12:00";

  return {
    draft: {
      amount,
      date,
      time,
      merchant: merchant ?? (direction === "income" ? "Pemasukan bank" : "Mutasi bank"),
      direction,
      note: subject ? subject.slice(0, 120) : undefined,
      source: text.slice(0, 4000),
    },
  };
}
