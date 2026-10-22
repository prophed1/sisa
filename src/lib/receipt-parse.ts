/**
 * Membaca teks hasil OCR struk atau tangkapan layar QRIS dan menebak nominal,
 * tanggal, waktu, serta nama merchant. Semua angka di sini hanya usulan:
 * pengguna tetap melihat form sebelum menyimpan, jadi tebakan yang salah
 * gampang diperbaiki, bukan tersimpan diam-diam.
 */

export interface ReceiptDraft {
  amount: number | null;
  /** ISO "YYYY-MM-DD". */
  date: string | null;
  /** "HH:mm". */
  time: string | null;
  merchant: string | null;
  /** QRIS dikenali dari penanda khas, bukan dari bentuk gambarnya. */
  kind: "struk" | "qris";
  /** Bidang yang benar-benar ditemukan, untuk ditandai di antarmuka. */
  found: { amount: boolean; date: boolean; merchant: boolean };
}

const MONTHS: Record<string, number> = {
  jan: 1,
  januari: 1,
  feb: 2,
  februari: 2,
  pebruari: 2,
  mar: 3,
  maret: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  agu: 8,
  agt: 8,
  agustus: 8,
  aug: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  nov: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
};

const pad = (value: number) => String(value).padStart(2, "0");

function isoOf(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "Rp 1.250.000", "IDR 50.000,00", "1250000" → 1250000. */
export function parseAmountText(raw: string): number | null {
  const cleaned = raw
    .replace(/[oO]/g, "0")
    .replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const hasSeparators = /[.,]/.test(cleaned);
  let digits = cleaned;

  if (!hasSeparators) {
    digits = cleaned;
  } else {
    // Buang bagian desimal ",00" / ".00" lebih dulu, lalu semua pemisah ribuan.
    const withoutCents = cleaned.replace(/[.,]\d{2}$/, "");
    digits = withoutCents.replace(/[.,]/g, "");
  }

  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

/** Kumpulan nominal per baris, dipakai untuk memilih kandidat terbaik. */
const THOUSANDS = /\d{1,3}(?:[.,]\d{3})+/;
/** Baris yang memuat tanggal; angka di baris ini biasanya tahun, bukan nominal. */
const DATE_LINE =
  /(\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b|\b\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|januari|februari|maret|april|juni|juli|agustus|september|oktober|november|desember)\b|\btanggal\b|\bdate\b)/i;

function amountCandidates(lines: string[]) {
  const candidates: { value: number; score: number }[] = [];
  const strong = /(grand\s*total|total\s*(bayar|belanja|harga|akhir)?|jumlah|nominal|amount)/i;
  const weakTotal = /sub\s*total/i;
  const change = /(kembali|kembalian|change|tunai|cash|dp|diskon|discount|pajak|tax|ppn|hemat)/i;
  const notMoney =
    /(telp|telepon|phone|hp|nmid|no\.?\s*ref|\bref\b|invoice|nota|struk|kode|npwp|rekening|account|\bpan\b)/i;

  lines.forEach((line, index) => {
    const lineHasCurrency = /(rp\.?|idr)/i.test(line);
    if (notMoney.test(line) && !lineHasCurrency) return;

    // Penanda mata uang diikutkan supaya "Rp 73.000" bisa dibedakan dari
    // angka telanjang seperti "2026" pada baris tanggal QRIS.
    const matches = [...line.matchAll(/(rp\.?|idr)?\s*([\d][\d.,]{2,})/gi)];
    for (const match of matches) {
      const value = parseAmountText(match[2]);
      if (value === null || value < 1000 || value > 100_000_000) continue;

      const currency = Boolean(match[1]);
      const grouped = THOUSANDS.test(match[2]);
      // Angka tanpa "Rp" dan tanpa pemisah ribuan yang jatuh di rentang tahun
      // hampir pasti bagian dari tanggal, bukan nominal belanja.
      if (!currency && !grouped && value >= 1900 && value <= 2100) continue;

      let score = 0;
      if (currency) score += 50;
      if (grouped) score += 30;
      if (DATE_LINE.test(line)) score -= 40;
      if (strong.test(line)) score += 60;
      if (weakTotal.test(line)) score += 10;
      if (change.test(line)) score -= 80;
      if (notMoney.test(line)) score -= 40;
      // Label "Total Bayar" sering berada satu baris di atas nominalnya.
      if (index > 0 && strong.test(lines[index - 1])) score += 25;
      // Baris yang lebih bawah biasanya berisi total akhir.
      score += index * 0.4;
      candidates.push({ value, score });
    }
  });

  return candidates.sort((a, b) => b.score - a.score || b.value - a.value);
}

export function findDateInText(text: string): string | null {
  // 17/10/2026, 17-10-26, 2026-10-17
  const numeric = [
    ...text.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g),
  ];
  for (const match of numeric) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;

    // Indonesia memakai dd/mm; kalau tidak mungkin, coba mm/dd.
    const dayFirst = isoOf(year, b, a);
    if (dayFirst) return dayFirst;
    const monthFirst = isoOf(year, a, b);
    if (monthFirst) return monthFirst;
  }

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const value = isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (value) return value;
  }

  // 17 Okt 2026 / 17 Oktober 2026
  const named = [
    ...text.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/g),
  ];
  for (const match of named) {
    const month = MONTHS[match[2].toLowerCase()];
    if (!month) continue;
    const value = isoOf(Number(match[3]), month, Number(match[1]));
    if (value) return value;
  }

  return null;
}

export function findTimeInText(text: string): string | null {
  const labelled = text.match(
    /(?:jam|waktu|time|pukul)\s*[:.]?\s*(\d{1,2})[:.](\d{2})/i,
  );
  const match = labelled ?? text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

const MERCHANT_LABEL =
  /(?:nama\s*merchant|merchant|nama\s*toko|penjual|diterima\s*oleh|kepada)\s*[:.\-]\s*(.+)/i;
const HEADER_NOISE =
  /(struk|nota|invoice|faktur|receipt|qris|qr\s*code|bayar|pembayaran|total|kasir|no\.?\s*transaksi|tanggal|date|jam|time|npwp|nmid|a\.n\.|atas\s*nama|bank|bca|bri|bni|mandiri|bsi|ovo|gopay|dana|shopeepay|linkaja|berhasil|sukses|gagal|scan|untuk|silakan)/i;

function cleanMerchant(raw: string) {
  return raw
    .replace(/^[\s:.\-•*]+/, "")
    .replace(/[\s:.\-•*]+$/, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60)
    .trim();
}

/**
 * Baris nama toko harus menyisakan satu kata yang bukan istilah struk. Dengan
 * begitu "GOPAY MERCHANT" masih terbaca, sedangkan "TOTAL BAYAR" dan
 * "Scan untuk bayar" tidak.
 */
function hasStoreName(value: string) {
  const words = value
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ""))
    .filter((word) => word.length >= 3);
  return words.some((word) => !HEADER_NOISE.test(word));
}

function findMerchant(lines: string[]) {
  for (const line of lines) {
    const labelled = line.match(MERCHANT_LABEL);
    if (!labelled) continue;
    const value = cleanMerchant(labelled[1]);
    // Nilai seperti "PAN : 9360000000000000001" bukan nama toko.
    if (value.length < 3 || !hasStoreName(value)) continue;
    return value;
  }

  // Kalau tidak ada label: baris pertama yang terlihat seperti nama toko.
  for (const line of lines.slice(0, 8)) {
    const value = cleanMerchant(line);
    if (value.length < 3 || value.length > 60) continue;
    if (!/[A-Za-z]{3}/.test(value)) continue;
    if (/\d{2,}/.test(value)) continue;
    if (!hasStoreName(value)) continue;
    return value;
  }

  return null;
}

function looksLikeQris(text: string) {
  return /(qris|qr\s*code|nmid|merchant\s*pan|scan\s*(untuk|to)\s*bayar)/i.test(
    text,
  );
}

export function parseReceiptText(raw: string): ReceiptDraft {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const candidates = amountCandidates(lines);
  const amount = candidates[0]?.value ?? null;
  const date = findDateInText(text);
  const time = findTimeInText(text);
  const merchant = findMerchant(lines);

  return {
    amount,
    date,
    time,
    merchant,
    kind: looksLikeQris(text) ? "qris" : "struk",
    found: {
      amount: amount !== null,
      date: date !== null,
      merchant: merchant !== null,
    },
  };
}
