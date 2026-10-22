import type { CategoryKey, Transaction } from "@/lib/types";

export interface CategoryGuess {
  category: CategoryKey;
  /** "history" = merchant ini pernah dicatat; "keyword" = cocok kamus. */
  origin: "history" | "keyword";
  /** Berapa catatan lama yang mendukung tebakan riwayat. */
  support: number;
}

/**
 * Kata kunci darurat untuk merchant yang belum pernah dicatat. Riwayat selalu
 * menang, jadi kamus ini hanya menyelamatkan impor pertama.
 */
const KEYWORDS: [RegExp, CategoryKey][] = [
  // Makanan & minuman
  [/\b(kopi|kafe|cafe|coffee|warung|warteg|bakmi|mie|sate|soto|bakso|nasi|ayam|seafood|sushi|resto|restoran|kebab|pizza|burger|bubur|martabak|donat|jco|starbucks|kfc|mcd|makan)\b/, "makanan"],
  // Transportasi
  [/\b(gojek|grab|ojek|taksi|taxi|bluebird|transjakarta|krl|mrt|lrt|kereta|argo|bensin|pertamina|shell|spbu|parkir|tol|e-toll|bengkel|servis|travel|damri|bus|pesawat|garuda|citilink)\b/, "transportasi"],
  // Belanja
  [/\b(shopee|tokopedia|lazada|blibli|bukalapak|indomaret|alfamart|superindo|hypermart|ikea|informa|uniqlo)\b/, "belanja"],
  // Tagihan
  [/\b(pln|pdam|indihome|telkom|firstmedia|biznet|myrepublic|sewa|kos|kontrakan|wifi|internet|listrik|token)\b/, "tagihan"],
  // Hiburan
  [/\b(netflix|spotify|disney|vidio|youtube|steam|bioskop|xxi|cgv|cinema|konser|hbo|viu|prime video)\b/, "hiburan"],
  // Kesehatan
  [/\b(apotek|kimia farma|guardian|watsons|klinik|rumah sakit|dokter|gigi|dental|vitamin|obat|lab|bpjs)\b/, "kesehatan"],
  // Lainnya
  [/\b(admin|donasi|kitabisa|pajak|denda|zakat|iuran|sumbangan|transfer)\b/, "lainnya"],
];

/** Kata yang terlalu umum untuk dijadikan bukti kecocokan. */
const STOPWORDS = new Set([
  "toko",
  "warung",
  "pt",
  "cv",
  "the",
  "dan",
  "and",
  "bulanan",
  "online",
  "store",
  "shop",
  "indonesia",
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

interface HistoryEntry {
  counts: Map<CategoryKey, number>;
  total: number;
}

function buildHistory(known: Transaction[]) {
  const entries = new Map<string, HistoryEntry>();
  for (const tx of known) {
    if (tx.direction !== "expense" || !tx.category) continue;
    const key = normalize(tx.merchant);
    if (!key) continue;
    const entry = entries.get(key) ?? { counts: new Map(), total: 0 };
    entry.counts.set(tx.category, (entry.counts.get(tx.category) ?? 0) + 1);
    entry.total += 1;
    entries.set(key, entry);
  }
  return entries;
}

function dominant(entry: HistoryEntry) {
  let best: { category: CategoryKey; count: number } | null = null;
  for (const [category, count] of entry.counts) {
    if (!best || count > best.count) best = { category, count };
  }
  return best;
}

/**
 * Cocokkan nama merchant dengan riwayat lebih dulu (persis, lalu mirip), baru
 * ke kamus kata kunci. Ambang kecocokan mirip dibuat tinggi supaya "Bengkel
 * Roda Utara" tidak dianggap sama dengan "Warung Roda".
 */
export function suggestCategory(
  merchant: string,
  known: Transaction[],
): CategoryGuess | null {
  const query = normalize(merchant);
  if (query.length < 3) return null;
  const queryTokens = tokens(merchant);
  const history = buildHistory(known);

  let best: { score: number; entry: HistoryEntry } | null = null;
  for (const [name, entry] of history) {
    let score = 0;
    if (name === query) {
      score = 1000;
    } else if (name.length >= 4 && (query.includes(name) || name.includes(query))) {
      score = 40;
    } else {
      const shared = tokens(name).filter((token) => queryTokens.includes(token));
      score = shared.length * 12;
    }
    if (score > 0) score += Math.min(entry.total, 10) * 0.1;
    if (score >= 12 && (!best || score > best.score)) best = { score, entry };
  }

  const historical = best ? dominant(best.entry) : null;
  if (historical) {
    return {
      category: historical.category,
      origin: "history",
      support: historical.count,
    };
  }

  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(query)) return { category, origin: "keyword", support: 0 };
  }
  return null;
}
