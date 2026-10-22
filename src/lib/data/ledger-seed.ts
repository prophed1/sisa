import { HISTORY_TRANSACTIONS } from "@/lib/data/ledger-history";
import type { Budget, Transaction, TransactionSource } from "@/lib/types";

export const PROFILE = {
  name: "Raka Prameswara",
  firstName: "Raka",
  email: "raka.prameswara@hey.com",
  plan: "Rencana personal",
};

export const OPENING_BALANCE = 3_100_000;

/** Anggaran kosong untuk bulan yang belum pernah diisi. */
export const EMPTY_BUDGET: Budget = { total: 0, limits: {} };

/** Nilai awal anggaran; bisa diubah pengguna di halaman Pengaturan. */
export const DEFAULT_BUDGET: Budget = {
  total: 12_000_000,
  limits: {
    makanan: 1_500_000,
    belanja: 3_500_000,
    transportasi: 1_400_000,
  },
};

export const SOURCE_META: Record<
  TransactionSource,
  { label: string; color: string }
> = {
  manual: { label: "Catat manual", color: "#3E4B8E" },
  email: { label: "Email BSI", color: "#8CA3B4" },
  scan: { label: "Scan struk", color: "#C9A45E" },
  system: { label: "Otomatis", color: "#A08C7C" },
};

const OCTOBER_TRANSACTIONS: Transaction[] = [
  // 1 Okt
  { id: "trx-0001", date: "2026-10-01", time: "09:05", merchant: "Sewa kos bulanan", note: "Kamar 3B — Oktober", category: "tagihan", amount: 1_250_000, direction: "expense", source: "manual" },
  { id: "trx-0002", date: "2026-10-01", time: "19:40", merchant: "Air galon Aqua", note: "Dua galon", category: "makanan", amount: 22_000, direction: "expense", source: "email" },
  // 2 Okt
  { id: "trx-0003", date: "2026-10-02", time: "08:15", merchant: "Indomaret", note: "Sayur, telur, beras", category: "belanja", amount: 96_500, direction: "expense", source: "manual" },
  { id: "trx-0004", date: "2026-10-02", time: "07:35", merchant: "Gojek", note: "Perjalanan ke kantor", category: "transportasi", amount: 27_500, direction: "expense", source: "email" },
  { id: "trx-0005", date: "2026-10-02", time: "20:10", merchant: "Sate Pak Kumis", note: "Makan malam keluarga", category: "makanan", amount: 116_000, direction: "expense", source: "manual" },
  { id: "trx-0006", date: "2026-10-02", time: "21:00", merchant: "Biaya admin transfer", note: "Transfer antarbank", category: "lainnya", amount: 6_500, direction: "expense", source: "system" },
  // 3 Okt
  { id: "trx-0007", date: "2026-10-03", time: "08:05", merchant: "Toko Kopi Tuku", note: "Kopi susu", category: "makanan", amount: 48_000, direction: "expense", source: "manual" },
  { id: "trx-0008", date: "2026-10-03", time: "18:20", merchant: "Grab", note: "Pulang kerja", category: "transportasi", amount: 50_000, direction: "expense", source: "email" },
  // 4 Okt
  { id: "trx-0009", date: "2026-10-04", time: "21:15", merchant: "Tokopedia", note: "Perlengkapan mandi", category: "belanja", amount: 412_000, direction: "expense", source: "email" },
  { id: "trx-0010", date: "2026-10-04", time: "20:00", merchant: "Kemang XXI", note: "Tiket film 20:40", category: "hiburan", amount: 100_000, direction: "expense", source: "scan" },
  { id: "trx-0011", date: "2026-10-04", time: "12:30", merchant: "Bakmi Naga", note: "Makan siang", category: "makanan", amount: 28_000, direction: "expense", source: "manual" },
  // 5 Okt
  { id: "trx-0012", date: "2026-10-05", time: "09:12", merchant: "Token listrik PLN", note: "Token listrik rumah", category: "tagihan", amount: 212_500, direction: "expense", source: "manual" },
  { id: "trx-0013", date: "2026-10-05", time: "07:50", merchant: "Gojek", note: "Ojek ke stasiun", category: "transportasi", amount: 99_500, direction: "expense", source: "email" },
  { id: "trx-0014", date: "2026-10-05", time: "16:30", merchant: "Iuran renovasi gang", note: "Kas warga Oktober", category: "lainnya", amount: 150_000, direction: "expense", source: "manual" },
  // 6 Okt
  { id: "trx-0015", date: "2026-10-06", time: "18:22", merchant: "Apotek Sania", note: "Vitamin & obat batuk", category: "kesehatan", amount: 186_000, direction: "expense", source: "scan" },
  { id: "trx-0016", date: "2026-10-06", time: "20:45", merchant: "Tokopedia", note: "Kursi kerja", category: "belanja", amount: 549_000, direction: "expense", source: "email" },
  { id: "trx-0017", date: "2026-10-06", time: "12:10", merchant: "Kopi Janji Jiwa", note: "Kopi & croissant", category: "makanan", amount: 54_000, direction: "expense", source: "manual" },
  // 7 Okt
  { id: "trx-0018", date: "2026-10-07", time: "21:03", merchant: "Tokopedia", note: "Belanja bulanan & perlengkapan dapur", category: "belanja", amount: 1_240_000, direction: "expense", source: "email" },
  { id: "trx-0019", date: "2026-10-07", time: "19:00", merchant: "Netflix", note: "Langganan premium", category: "hiburan", amount: 186_000, direction: "expense", source: "system" },
  { id: "trx-0020", date: "2026-10-07", time: "06:45", merchant: "Tiket Argo Parahyangan", note: "Jakarta–Bandung", category: "transportasi", amount: 200_000, direction: "expense", source: "email" },
  { id: "trx-0021", date: "2026-10-07", time: "08:20", merchant: "Grab", note: "Ke stasiun", category: "transportasi", amount: 54_000, direction: "expense", source: "email" },
  // 8 Okt
  { id: "trx-0022", date: "2026-10-08", time: "07:55", merchant: "Indomaret", note: "Roti & susu", category: "makanan", amount: 65_000, direction: "expense", source: "manual" },
  { id: "trx-0023", date: "2026-10-08", time: "09:30", merchant: "Gojek", note: "Perjalanan ke kantor", category: "transportasi", amount: 42_000, direction: "expense", source: "email" },
  { id: "trx-0024", date: "2026-10-08", time: "19:15", merchant: "Warung Tekko", note: "Nasi campur", category: "makanan", amount: 108_000, direction: "expense", source: "manual" },
  // 9 Okt
  { id: "trx-0025", date: "2026-10-09", time: "18:05", merchant: "Grab", note: "Pulang dari Kemang", category: "transportasi", amount: 48_000, direction: "expense", source: "email" },
  { id: "trx-0026", date: "2026-10-09", time: "08:10", merchant: "Toko Kopi Tuku", note: "Kopi susu", category: "makanan", amount: 44_000, direction: "expense", source: "manual" },
  { id: "trx-0027", date: "2026-10-09", time: "13:40", merchant: "Tokopedia", note: "Kabel USB-C", category: "belanja", amount: 56_000, direction: "expense", source: "email" },
  // 10 Okt
  { id: "trx-0028", date: "2026-10-10", time: "10:20", merchant: "Indomaret", note: "Belanja mingguan", category: "belanja", amount: 87_000, direction: "expense", source: "manual" },
  { id: "trx-0029", date: "2026-10-10", time: "20:15", merchant: "CGV Grand Indonesia", note: "Film malam", category: "hiburan", amount: 120_000, direction: "expense", source: "scan" },
  { id: "trx-0030", date: "2026-10-10", time: "08:05", merchant: "Gojek", note: "Perjalanan ke kantor", category: "transportasi", amount: 68_000, direction: "expense", source: "email" },
  // 11 Okt
  { id: "trx-0031", date: "2026-10-11", time: "09:40", merchant: "Bengkel Roda Utara", note: "Servis motor & ganti oli", category: "transportasi", amount: 420_000, direction: "expense", source: "manual" },
  { id: "trx-0032", date: "2026-10-11", time: "17:05", merchant: "Apotek Kimia Farma", note: "Obat maag", category: "kesehatan", amount: 198_000, direction: "expense", source: "scan" },
  { id: "trx-0033", date: "2026-10-11", time: "07:00", merchant: "Spotify", note: "Langganan keluarga", category: "hiburan", amount: 55_000, direction: "expense", source: "system" },
  { id: "trx-0034", date: "2026-10-11", time: "14:20", merchant: "Buku Akasia", note: "Buku catatan & pena", category: "belanja", amount: 127_000, direction: "expense", source: "manual" },
  { id: "trx-0035", date: "2026-10-11", time: "21:30", merchant: "Kitabisa", note: "Donasi bencana", category: "lainnya", amount: 50_000, direction: "expense", source: "manual" },
  // 12 Okt
  { id: "trx-0036", date: "2026-10-12", time: "07:40", merchant: "Gojek", note: "Perjalanan ke kantor", category: "transportasi", amount: 64_500, direction: "expense", source: "email" },
  { id: "trx-0037", date: "2026-10-12", time: "20:05", merchant: "Tokopedia", note: "Rak buku", category: "belanja", amount: 240_500, direction: "expense", source: "email" },
  // 13 Okt
  { id: "trx-0038", date: "2026-10-13", time: "22:18", merchant: "Grab", note: "Pulang dari Kemang", category: "transportasi", amount: 34_000, direction: "expense", source: "email" },
  { id: "trx-0039", date: "2026-10-13", time: "19:45", merchant: "Sushi Tei", note: "Makan malam tim", category: "makanan", amount: 391_000, direction: "expense", source: "manual" },
  // 14 Okt
  { id: "trx-0040", date: "2026-10-14", time: "12:05", merchant: "Bakmi Naga", note: "Makan siang tim", category: "makanan", amount: 72_000, direction: "expense", source: "manual" },
  { id: "trx-0041", date: "2026-10-14", time: "07:30", merchant: "Kopi Kenangan", note: "Kopi pagi", category: "makanan", amount: 32_000, direction: "expense", source: "manual" },
  { id: "trx-0042", date: "2026-10-14", time: "09:00", merchant: "PDAM", note: "Tagihan air", category: "tagihan", amount: 86_000, direction: "expense", source: "email" },
  // 15 Okt
  { id: "trx-0043", date: "2026-10-15", time: "09:10", merchant: "PLN Pascabayar", note: "Tagihan listrik rumah", category: "tagihan", amount: 412_500, direction: "expense", source: "manual" },
  { id: "trx-0044", date: "2026-10-15", time: "19:35", merchant: "Kemang XXI", note: "Tiket film 20:40", category: "hiburan", amount: 120_000, direction: "expense", source: "scan" },
  { id: "trx-0045", date: "2026-10-15", time: "11:20", merchant: "Tokopedia", note: "Lampu meja", category: "belanja", amount: 385_500, direction: "expense", source: "email" },
  { id: "trx-0046", date: "2026-10-15", time: "21:00", merchant: "M Bloc Live", note: "Tiket konser mini", category: "hiburan", amount: 182_000, direction: "expense", source: "scan" },
  { id: "trx-0047", date: "2026-10-15", time: "08:00", merchant: "IndiHome", note: "Internet 30 Mbps", category: "tagihan", amount: 385_000, direction: "expense", source: "email" },
  // 16 Okt
  { id: "trx-0048", date: "2026-10-16", time: "21:03", merchant: "Tokopedia", note: "Belanja bulanan", category: "belanja", amount: 684_000, direction: "expense", source: "email" },
  { id: "trx-0049", date: "2026-10-16", time: "19:20", merchant: "Indomaret", note: "Snack & air", category: "makanan", amount: 84_000, direction: "expense", source: "manual" },
  { id: "trx-0050", date: "2026-10-16", time: "09:00", merchant: "Gaji bulanan — PT Cerah Digital", note: "Payroll Oktober", category: null, amount: 12_500_000, direction: "income", source: "system" },
  { id: "trx-0051", date: "2026-10-16", time: "14:20", merchant: "Invoice proyek — Studio Akar", note: "Pembayaran termin kedua", category: null, amount: 1_750_000, direction: "income", source: "manual" },
  // 17 Okt
  { id: "trx-0052", date: "2026-10-17", time: "08:12", merchant: "Toko Kopi Tuku", note: "Kopi susu & roti", category: "makanan", amount: 48_000, direction: "expense", source: "manual" },
  { id: "trx-0053", date: "2026-10-17", time: "07:45", merchant: "Gojek", note: "Perjalanan ke kantor", category: "transportasi", amount: 27_500, direction: "expense", source: "email" },
];

/** Seluruh riwayat yang tersedia: Juli–September 2026 lalu 1–17 Oktober. */
export const SEED_TRANSACTIONS: Transaction[] = [
  ...HISTORY_TRANSACTIONS,
  ...OCTOBER_TRANSACTIONS,
];
