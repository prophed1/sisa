import type { CategoryKey, Transaction, TransactionSource } from "@/lib/types";

/**
 * Riwayat Juli–September 2026 dibangkitkan secara deterministik (tanpa
 * Math.random) supaya hasilnya sama di server dan di klien. Tagihan muncul
 * setiap bulan pada tanggal yang sama dengan nominal mirip sehingga pola
 * berulangnya bisa dikenali, dan setiap bulan punya belanja besar eksplisit
 * agar perbandingan bulan-ke-bulan tidak timpang.
 */

const pad = (value: number) => String(value).padStart(2, "0");

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isWorkday(year: number, month: number, day: number) {
  const index = weekdayOf(year, month, day);
  return index >= 1 && index <= 5;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

interface Draft {
  day: number;
  time: string;
  merchant: string;
  note?: string;
  category: CategoryKey | null;
  amount: number;
  direction: "expense" | "income";
  source: TransactionSource;
}

interface MonthPlan {
  month: number;
  days: number;
  seed: number;
  coffee: number;
  meals: number;
  groceries: number;
  commuteRate: number;
  utilities: { pln: number; pdam: number; indihome: number };
  invoice: boolean;
  notable: Omit<Draft, "direction">[];
}

const PLANS: MonthPlan[] = [
  {
    month: 7,
    days: 31,
    seed: 20_260_714,
    coffee: 10,
    meals: 12,
    groceries: 4,
    commuteRate: 0.55,
    utilities: { pln: 398_000, pdam: 82_000, indihome: 385_000 },
    invoice: false,
    notable: [
      { day: 2, time: "10:20", merchant: "Bengkel Roda Utara", note: "Servis motor & ganti oli", category: "transportasi", amount: 420_000, source: "manual" },
      { day: 6, time: "06:45", merchant: "Tiket Argo Parahyangan", note: "Jakarta–Bandung", category: "transportasi", amount: 200_000, source: "email" },
      { day: 9, time: "21:15", merchant: "Tokopedia", note: "Perlengkapan mandi", category: "belanja", amount: 412_000, source: "email" },
      { day: 11, time: "13:40", merchant: "Tokopedia", note: "Rak buku", category: "belanja", amount: 240_500, source: "email" },
      { day: 13, time: "19:45", merchant: "Sushi Tei", note: "Makan malam tim", category: "makanan", amount: 391_000, source: "manual" },
      { day: 16, time: "21:00", merchant: "Tokopedia", note: "Belanja bulanan", category: "belanja", amount: 684_000, source: "email" },
      { day: 18, time: "13:40", merchant: "Shopee", note: "Kabel USB-C", category: "belanja", amount: 56_000, source: "email" },
      { day: 20, time: "18:22", merchant: "Apotek Sania", note: "Vitamin & obat", category: "kesehatan", amount: 186_000, source: "scan" },
      { day: 24, time: "20:00", merchant: "Kemang XXI", note: "Tiket film", category: "hiburan", amount: 120_000, source: "scan" },
      { day: 27, time: "14:20", merchant: "Buku Akasia", note: "Buku catatan & pena", category: "belanja", amount: 127_000, source: "manual" },
    ],
  },
  {
    month: 8,
    days: 31,
    seed: 20_260_822,
    coffee: 12,
    meals: 15,
    groceries: 5,
    commuteRate: 0.7,
    utilities: { pln: 421_500, pdam: 91_000, indihome: 385_000 },
    invoice: true,
    notable: [
      { day: 6, time: "20:30", merchant: "Tokopedia", note: "Sepatu lari", category: "belanja", amount: 549_000, source: "email" },
      { day: 8, time: "21:00", merchant: "M Bloc Live", note: "Tiket konser mini", category: "hiburan", amount: 182_000, source: "scan" },
      { day: 9, time: "13:40", merchant: "Tokopedia", note: "Rak buku", category: "belanja", amount: 240_500, source: "email" },
      { day: 12, time: "21:03", merchant: "Tokopedia", note: "Belanja bulanan & dapur", category: "belanja", amount: 1_240_000, source: "email" },
      { day: 15, time: "18:22", merchant: "Apotek Kimia Farma", note: "Obat maag", category: "kesehatan", amount: 198_000, source: "scan" },
      { day: 18, time: "13:40", merchant: "Shopee", note: "Kabel USB-C", category: "belanja", amount: 56_000, source: "email" },
      { day: 22, time: "20:00", merchant: "CGV Grand Indonesia", note: "Film malam", category: "hiburan", amount: 120_000, source: "scan" },
      { day: 26, time: "11:20", merchant: "Tokopedia", note: "Lampu meja", category: "belanja", amount: 385_500, source: "email" },
      { day: 29, time: "19:45", merchant: "Sushi Tei", note: "Makan malam tim", category: "makanan", amount: 391_000, source: "manual" },
    ],
  },
  {
    month: 9,
    days: 30,
    seed: 20_260_903,
    coffee: 15,
    meals: 17,
    groceries: 6,
    commuteRate: 0.85,
    utilities: { pln: 452_000, pdam: 86_000, indihome: 385_000 },
    invoice: true,
    notable: [
      { day: 2, time: "21:03", merchant: "Tokopedia", note: "Belanja bulanan & dapur", category: "belanja", amount: 1_240_000, source: "email" },
      { day: 5, time: "20:30", merchant: "Tokopedia", note: "Kursi kerja", category: "belanja", amount: 549_000, source: "email" },
      { day: 7, time: "13:40", merchant: "Tokopedia", note: "Rak buku", category: "belanja", amount: 240_500, source: "email" },
      { day: 9, time: "13:40", merchant: "Shopee", note: "Kabel USB-C", category: "belanja", amount: 56_000, source: "email" },
      { day: 11, time: "21:15", merchant: "Tokopedia", note: "Perlengkapan mandi", category: "belanja", amount: 412_000, source: "email" },
      { day: 13, time: "11:20", merchant: "Tokopedia", note: "Lampu meja", category: "belanja", amount: 385_500, source: "email" },
      { day: 14, time: "10:20", merchant: "Bengkel Roda Utara", note: "Servis motor & ganti oli", category: "transportasi", amount: 420_000, source: "manual" },
      { day: 16, time: "19:45", merchant: "Sushi Tei", note: "Makan malam tim", category: "makanan", amount: 391_000, source: "manual" },
      { day: 20, time: "20:00", merchant: "Kemang XXI", note: "Tiket film", category: "hiburan", amount: 110_000, source: "scan" },
      { day: 23, time: "14:20", merchant: "Buku Akasia", note: "Buku catatan & pena", category: "belanja", amount: 127_000, source: "manual" },
      { day: 29, time: "21:00", merchant: "M Bloc Live", note: "Tiket konser mini", category: "hiburan", amount: 182_000, source: "scan" },
    ],
  },
];

/** Pengeluaran tetap: tanggal dan nominalnya sengaja mirip antarbulan. */
const FIXED = (plan: MonthPlan): Draft[] => [
  { day: 1, time: "09:05", merchant: "Sewa kos bulanan", note: "Kamar 3B", category: "tagihan", amount: 1_250_000, direction: "expense", source: "manual" },
  { day: 5, time: "08:40", merchant: "BPJS Kesehatan", note: "Iuran keluarga", category: "kesehatan", amount: 150_000, direction: "expense", source: "system" },
  { day: 5, time: "16:30", merchant: "Iuran renovasi gang", note: "Kas warga", category: "lainnya", amount: 150_000, direction: "expense", source: "manual" },
  { day: 7, time: "19:00", merchant: "Netflix", note: "Langganan premium", category: "hiburan", amount: 186_000, direction: "expense", source: "system" },
  { day: 11, time: "07:00", merchant: "Spotify", note: "Langganan keluarga", category: "hiburan", amount: 55_000, direction: "expense", source: "system" },
  { day: 14, time: "09:00", merchant: "PDAM", note: "Tagihan air", category: "tagihan", amount: plan.utilities.pdam, direction: "expense", source: "email" },
  { day: 15, time: "08:00", merchant: "IndiHome", note: "Internet 30 Mbps", category: "tagihan", amount: plan.utilities.indihome, direction: "expense", source: "email" },
  { day: 15, time: "09:10", merchant: "PLN Pascabayar", note: "Tagihan listrik rumah", category: "tagihan", amount: plan.utilities.pln, direction: "expense", source: "manual" },
  { day: 16, time: "09:00", merchant: "Gaji bulanan — PT Cerah Digital", note: "Payroll", category: null, amount: 12_500_000, direction: "income", source: "system" },
  ...(plan.invoice
    ? [
        {
          day: 22,
          time: "14:20",
          merchant: "Invoice proyek — Studio Akar",
          note: "Pembayaran termin",
          category: null,
          amount: 1_750_000,
          direction: "income" as const,
          source: "manual" as const,
        },
      ]
    : []),
];

const COFFEE_SHOPS = [
  { merchant: "Toko Kopi Tuku", note: "Kopi susu", amounts: [44_000, 48_000] },
  { merchant: "Kopi Kenangan", note: "Kopi pagi", amounts: [28_000, 32_000] },
  { merchant: "Kopi Janji Jiwa", note: "Kopi & croissant", amounts: [48_000, 54_000] },
];

const MEAL_SPOTS = [
  { merchant: "Warung Tekko", note: "Nasi campur", amounts: [96_000, 108_000] },
  { merchant: "Bakmi Naga", note: "Makan siang", amounts: [28_000, 72_000] },
  { merchant: "Sate Pak Kumis", note: "Makan malam", amounts: [116_000, 138_000] },
];

const GROCERY_ITEMS = [
  { merchant: "Indomaret", note: "Sayur, telur, beras", amounts: [84_000, 96_500] },
  { merchant: "Indomaret", note: "Belanja mingguan", amounts: [87_000, 110_000] },
  { merchant: "Air galon Aqua", note: "Dua galon", amounts: [22_000, 24_000] },
];

const COMMUTE = [
  { merchant: "Gojek", note: "Perjalanan ke kantor", amounts: [27_500, 42_000] },
  { merchant: "Gojek", note: "Ojek ke stasiun", amounts: [64_500, 99_500] },
  { merchant: "Grab", note: "Pulang kerja", amounts: [34_000, 50_000] },
  { merchant: "Grab", note: "Pulang dari Kemang", amounts: [48_000, 54_000] },
];

function buildMonth(plan: MonthPlan): Draft[] {
  const random = mulberry32(plan.seed);
  const drafts: Draft[] = [...FIXED(plan)];
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const amountBetween = (min: number, max: number) =>
    roundTo(min + random() * (max - min), 500);

  for (const item of plan.notable) {
    drafts.push({ ...item, direction: "expense" });
  }

  // Perjalanan pada hari kerja.
  for (let day = 1; day <= plan.days; day += 1) {
    if (!isWorkday(2026, plan.month, day)) continue;
    if (random() > plan.commuteRate) continue;
    const route = pick(COMMUTE);
    const morning = random() > 0.4;
    const hour = morning ? 6 + Math.floor(random() * 2) : 17 + Math.floor(random() * 2);
    drafts.push({
      day,
      time: `${pad(hour)}:${pad(Math.floor(random() * 60))}`,
      merchant: route.merchant,
      note: route.note,
      category: "transportasi",
      amount: amountBetween(route.amounts[0], route.amounts[1]),
      direction: "expense",
      source: "email",
    });
  }

  const spread = (total: number) => {
    const days: number[] = [];
    while (days.length < total) {
      const day = 1 + Math.floor(random() * plan.days);
      if (!days.includes(day)) days.push(day);
    }
    return days.sort((a, b) => a - b);
  };

  for (const day of spread(plan.coffee)) {
    const shop = pick(COFFEE_SHOPS);
    drafts.push({
      day,
      time: `${pad(7 + Math.floor(random() * 2))}:${pad(Math.floor(random() * 60))}`,
      merchant: shop.merchant,
      note: shop.note,
      category: "makanan",
      amount: pick(shop.amounts),
      direction: "expense",
      source: "manual",
    });
  }

  for (const day of spread(plan.meals)) {
    const spot = pick(MEAL_SPOTS);
    drafts.push({
      day,
      time: random() > 0.5 ? "12:30" : "19:45",
      merchant: spot.merchant,
      note: spot.note,
      category: "makanan",
      amount: pick(spot.amounts),
      direction: "expense",
      source: "manual",
    });
  }

  for (const day of spread(plan.groceries)) {
    const item = pick(GROCERY_ITEMS);
    drafts.push({
      day,
      time: "08:15",
      merchant: item.merchant,
      note: item.note,
      category: item.merchant === "Air galon Aqua" ? "makanan" : "belanja",
      amount: amountBetween(item.amounts[0], item.amounts[1]),
      direction: "expense",
      source: "manual",
    });
  }

  for (const day of spread(3)) {
    drafts.push({
      day,
      time: "21:00",
      merchant: "Biaya admin transfer",
      note: "Transfer antarbank",
      category: "lainnya",
      amount: 6_500,
      direction: "expense",
      source: "system",
    });
  }

  if (random() > 0.4) {
    drafts.push({
      day: spread(1)[0],
      time: "21:30",
      merchant: "Kitabisa",
      note: "Donasi",
      category: "lainnya",
      amount: 50_000,
      direction: "expense",
      source: "manual",
    });
  }

  return drafts;
}

function toTransactions(): Transaction[] {
  const result: Transaction[] = [];
  for (const plan of PLANS) {
    const drafts = buildMonth(plan)
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    drafts.forEach((draft, index) => {
      result.push({
        id: `trx-h-${plan.month}-${pad(index + 1)}`,
        date: `2026-${pad(plan.month)}-${pad(draft.day)}`,
        time: draft.time,
        merchant: draft.merchant,
        note: draft.note,
        category: draft.category,
        amount: draft.amount,
        direction: draft.direction,
        source: draft.source,
      });
    });
  }
  return result;
}

/** 1 Juli – 30 September 2026, digabung sebelum transaksi Oktober. */
export const HISTORY_TRANSACTIONS: Transaction[] = toTransactions();
