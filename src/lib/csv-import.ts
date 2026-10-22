import { suggestCategory } from "@/lib/categorize";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import { SOURCE_META } from "@/lib/data/ledger-seed";
import type {
  CategoryKey,
  Transaction,
  TransactionDirection,
  TransactionDraft,
  TransactionSource,
} from "@/lib/types";

export interface ImportDraft extends TransactionDraft {
  /** Nomor baris di berkas; baris pertama data berarti 2. */
  line: number;
  /** Asal kategori kalau kolomnya kosong atau tidak dikenali. */
  categoryOrigin?: "history" | "keyword";
}

export interface ImportNote {
  line: number;
  message: string;
}

export interface ImportPreview {
  /** Baris siap diimpor (bukan duplikat, tanpa masalah). */
  drafts: ImportDraft[];
  /** Baris yang isinya sudah ada di ledger. */
  duplicates: ImportDraft[];
  /** Baris yang dibuang beserta alasannya. */
  issues: ImportNote[];
  /** Baris yang tetap masuk, tapi ada bagian yang diabaikan. */
  warnings: ImportNote[];
  /** Jumlah baris data di berkas, di luar baris judul. */
  total: number;
  /** Baris yang kategorinya ditebak dari riwayat merchant. */
  guessed: number;
  columns: string[];
  /** Pemisah kolom yang terdeteksi, mis. "," atau ";". */
  delimiter: string;
}

const DELIMITERS = [",", ";", "\t"];

export const DELIMITER_LABEL: Record<string, string> = {
  ",": "koma",
  ";": "titik koma",
  "\t": "tab",
};

type FieldKey =
  | "date"
  | "time"
  | "merchant"
  | "note"
  | "category"
  | "direction"
  | "source"
  | "amount"
  | "debit"
  | "credit";

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  date: ["tanggal", "tgl", "date", "tanggal transaksi", "transaction date"],
  time: ["waktu", "jam", "time"],
  merchant: [
    "merchant",
    "nama",
    "nama merchant",
    "deskripsi",
    "keterangan",
    "uraian",
    "description",
    "toko",
  ],
  note: ["catatan", "note", "memo", "remarks", "catatan tambahan"],
  category: ["kategori", "category"],
  direction: ["jenis", "tipe", "type", "jenis transaksi", "arah", "direction"],
  source: ["sumber", "source", "channel"],
  amount: ["nominal", "jumlah", "amount", "nilai", "total", "nominal rupiah"],
  debit: ["debit", "debet", "pengeluaran", "uang keluar", "keluar"],
  credit: ["kredit", "pemasukan", "uang masuk", "masuk", "credit"],
};

/** Huruf kecil, tanpa aksen, tanpa tanda baca. */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countOutsideQuotes(line: string, needle: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === needle) count += 1;
  }
  return count;
}

function firstLine(text: string) {
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') quoted = !quoted;
    else if ((char === "\n" || char === "\r") && !quoted) {
      return text.slice(0, index);
    }
  }
  return text;
}

function detectDelimiter(text: string) {
  const line = firstLine(text);
  let best = ",";
  let bestCount = 0;
  for (const candidate of DELIMITERS) {
    const count = countOutsideQuotes(line, candidate);
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

/** Pecah berkas jadi baris sel, mengikuti RFC 4180 (kutip ganda & baris baru). */
function parseRecords(text: string, delimiter: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Baris kosong di ujung berkas tidak dihitung.
    if (row.length === 1 && row[0].trim() === "") row = [];
    else rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.trim() === "") {
      quoted = true;
      field = "";
      continue;
    }
    if (char === delimiter) {
      endField();
      continue;
    }
    if (char === "\n") {
      endRow();
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }

  if (field !== "" || row.length) endRow();
  return rows;
}

function mapColumns(header: string[]) {
  const normalized = header.map(normalize);
  const found: Partial<Record<FieldKey, number>> = {};
  for (const key of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    const aliases = FIELD_ALIASES[key];
    const exact = normalized.findIndex((cell) => aliases.includes(cell));
    if (exact >= 0) {
      found[key] = exact;
      continue;
    }
    const partial = normalized.findIndex((cell) =>
      aliases.some((alias) => cell.startsWith(`${alias} `)),
    );
    if (partial >= 0) found[key] = partial;
  }
  return found;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  peb: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  ags: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
  december: 12,
};

const pad = (value: number) => String(value).padStart(2, "0");

function toIso(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const y = year < 100 ? (year < 70 ? 2000 + year : 1900 + year) : year;
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return `${y}-${pad(month)}-${pad(day)}`;
}

function normalizeTime(raw: string) {
  const match = raw.trim().match(/^(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Terima ISO, 17/10/2026 (hari dulu), 10/17/2026, dan "17 Okt 2026". */
export function parseDateCell(raw: string) {
  const text = raw.trim();
  if (!text) return null;

  const iso = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/,
  );
  if (iso) {
    const date = toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return date ? { date, time: iso[4] ? normalizeTime(iso[4]) : null } : null;
  }

  const numeric = text.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const last = numeric[3];
    if (numeric[1].length === 4) {
      const date = toIso(first, second, Number(last));
      return date ? { date, time: null } : null;
    }
    // Tanpa penanda lain, berkas Indonesia dibaca hari-bulan-tahun.
    const dayFirst = !(second > 12 && first <= 12);
    const date = dayFirst
      ? toIso(Number(last), second, first)
      : toIso(Number(last), first, second);
    return date ? { date, time: null } : null;
  }

  const dayMonth = text.match(
    /^(\d{1,2})[\s\-./]*([A-Za-z]{3,})[\s\-.,/]*(\d{2,4})?$/,
  );
  if (dayMonth) {
    const month = MONTH_NAMES[normalize(dayMonth[2])];
    if (month) {
      const date = toIso(
        dayMonth[3] ? Number(dayMonth[3]) : new Date().getUTCFullYear(),
        month,
        Number(dayMonth[1]),
      );
      return date ? { date, time: null } : null;
    }
  }

  const monthDay = text.match(
    /^([A-Za-z]{3,})[\s\-./]*(\d{1,2})[\s\-.,/]*(\d{2,4})?$/,
  );
  if (monthDay) {
    const month = MONTH_NAMES[normalize(monthDay[1])];
    if (month) {
      const date = toIso(
        monthDay[3] ? Number(monthDay[3]) : new Date().getUTCFullYear(),
        month,
        Number(monthDay[2]),
      );
      return date ? { date, time: null } : null;
    }
  }

  return null;
}

/** Terima "Rp 1.234.567", "1,234,567.00", "(1250)", "-48000", "1.250,50". */
export function parseAmountCell(raw: string) {
  const text = raw.trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || /^-/.test(text) || /\bminus\b/i.test(text);
  const cleaned = text.replace(/[^0-9.,]/g, "");
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma > lastDot ? "," : ".";
    const otherSeparator = separator === "," ? "." : ",";
    const tail = cleaned.length - cleaned.lastIndexOf(separator) - 1;
    const hasOther = cleaned.includes(otherSeparator);
    if (tail === 3 && !hasOther) {
      // "1.234.567" — pemisah ribuan.
      normalized = cleaned.split(separator).join("");
    } else if (tail === 3 && hasOther) {
      normalized = cleaned.split(otherSeparator).join("").split(separator).join("");
    } else {
      normalized = cleaned.split(otherSeparator).join("").replace(separator, ".");
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

const CATEGORY_LOOKUP = new Map<string, CategoryKey>();
for (const key of CATEGORY_ORDER) {
  CATEGORY_LOOKUP.set(normalize(key), key);
  CATEGORY_LOOKUP.set(normalize(CATEGORY_META[key].label), key);
  CATEGORY_LOOKUP.set(normalize(CATEGORY_META[key].shortLabel), key);
}
CATEGORY_LOOKUP.set("makanan minuman", "makanan");
CATEGORY_LOOKUP.set("makan", "makanan");
CATEGORY_LOOKUP.set("transport", "transportasi");
CATEGORY_LOOKUP.set("hiburan hobi", "hiburan");

const SOURCE_LOOKUP = new Map<string, TransactionSource>();
for (const key of Object.keys(SOURCE_META) as TransactionSource[]) {
  SOURCE_LOOKUP.set(normalize(key), key);
  SOURCE_LOOKUP.set(normalize(SOURCE_META[key].label), key);
}
SOURCE_LOOKUP.set("sistem", "system");
SOURCE_LOOKUP.set("manual", "manual");
SOURCE_LOOKUP.set("struk", "scan");
SOURCE_LOOKUP.set("scan struk qris", "scan");

function readDirection(value: string): TransactionDirection | null {
  const cell = normalize(value);
  if (!cell) return null;
  if (/^(masuk|pemasukan|penerimaan|income|kredit|credit|cr)$/.test(cell)) {
    return "income";
  }
  if (/^(keluar|pengeluaran|expense|debit|debet|db)$/.test(cell)) return "expense";
  if (cell.includes("masuk") || cell.includes("kredit")) return "income";
  if (cell.includes("keluar") || cell.includes("debit")) return "expense";
  return null;
}

function duplicateKey(draft: {
  date: string;
  amount: number;
  direction: TransactionDirection;
  merchant: string;
}) {
  return `${draft.date}|${draft.amount}|${draft.direction}|${draft.merchant
    .trim()
    .toLowerCase()}`;
}

/**
 * Baca CSV apa pun yang punya kolom tanggal dan merchant, lalu pisahkan jadi
 * baris siap impor, duplikat, dan baris bermasalah. Nama kolom dicocokkan
 * lewat alias, jadi hasil ekspor aplikasi ini, mutasi bank, dan ekspor
 * pelacak lain bisa masuk tanpa penyesuaian.
 */
export function parseLedgerCsv(text: string, known: Transaction[]): ImportPreview {
  const empty: ImportPreview = {
    drafts: [],
    duplicates: [],
    issues: [],
    warnings: [],
    total: 0,
    guessed: 0,
    columns: [],
    delimiter: ",",
  };
  if (!text.trim()) {
    return { ...empty, issues: [{ line: 1, message: "Berkas kosong." }] };
  }

  const delimiter = detectDelimiter(text);
  const records = parseRecords(text, delimiter);
  if (records.length === 0) {
    return { ...empty, delimiter, issues: [{ line: 1, message: "Berkas kosong." }] };
  }

  const [header, ...body] = records;
  const columns = header.map((cell) => cell.trim());
  const index = mapColumns(header);
  const missing: string[] = [];
  if (index.date === undefined) missing.push("tanggal");
  if (index.merchant === undefined) missing.push("merchant");
  const hasSplitAmount = index.debit !== undefined || index.credit !== undefined;
  if (index.amount === undefined && !hasSplitAmount) missing.push("nominal");
  if (missing.length) {
    return {
      ...empty,
      delimiter,
      columns,
      total: body.length,
      issues: [
        {
          line: 1,
          message: `Kolom wajib tidak ditemukan: ${missing.join(", ")}.`,
        },
      ],
    };
  }

  const knownKeys = new Set(known.map((tx) => duplicateKey(tx)));
  const preview: ImportPreview = {
    drafts: [],
    duplicates: [],
    issues: [],
    warnings: [],
    total: body.length,
    guessed: 0,
    columns,
    delimiter,
  };
  const inFile = new Set<string>();

  body.forEach((record, offset) => {
    const line = offset + 2;
    if (!record.some((value) => value.trim() !== "")) return;

    const cell = (key: FieldKey) => {
      const at = index[key];
      return at === undefined ? "" : (record[at] ?? "").trim();
    };

    const parsed = parseDateCell(cell("date"));
    if (!parsed) {
      preview.issues.push({
        line,
        message: cell("date")
          ? `Tanggal tidak dikenali: "${cell("date")}".`
          : "Tanggal kosong.",
      });
      return;
    }

    const merchant = cell("merchant");
    if (!merchant) {
      preview.issues.push({ line, message: "Nama merchant kosong." });
      return;
    }

    let direction: TransactionDirection | null = null;
    let amount: number | null = null;

    const debit = parseAmountCell(cell("debit"));
    const credit = parseAmountCell(cell("credit"));
    if (hasSplitAmount && (debit !== null || credit !== null)) {
      if (debit !== null && Math.abs(debit) > 0 && !(credit !== null && Math.abs(credit) > 0)) {
        direction = "expense";
        amount = Math.abs(debit);
      } else if (credit !== null && Math.abs(credit) > 0) {
        direction = "income";
        amount = Math.abs(credit);
      }
    }

    if (amount === null) {
      const parsedAmount = parseAmountCell(cell("amount"));
      if (parsedAmount === null) {
        preview.issues.push({
          line,
          message: cell("amount")
            ? `Nominal tidak terbaca: "${cell("amount")}".`
            : "Nominal kosong.",
        });
        return;
      }
      amount = Math.abs(parsedAmount);
      const stated = readDirection(cell("direction"));
      if (stated) direction = stated;
      else if (cell("direction")) {
        preview.issues.push({
          line,
          message: `Jenis transaksi tidak dikenali: "${cell("direction")}".`,
        });
        return;
      } else {
        // Tanpa kolom jenis, baris tanpa tanda dianggap pengeluaran.
        direction = "expense";
      }
    } else {
      const stated = readDirection(cell("direction"));
      if (stated && stated !== direction) {
        // Kolom nominal sudah menentukan arah; kolom jenis dipakai kalau kosong.
        preview.warnings.push({
          line,
          message: `Jenis "${cell("direction")}" diabaikan karena kolom debit/kredit lebih spesifik.`,
        });
      }
    }

    if (!direction) direction = "expense";
    if (amount <= 0) {
      preview.issues.push({ line, message: "Nominal nol, baris dilewati." });
      return;
    }

    let category: CategoryKey | null = null;
    const categoryCell = cell("category");
    if (categoryCell) {
      category = CATEGORY_LOOKUP.get(normalize(categoryCell)) ?? null;
    }

    // Kolom kategori kosong atau asing: tebak dari riwayat merchant sendiri.
    let categoryOrigin: ImportDraft["categoryOrigin"];
    if (!category) {
      const guess = suggestCategory(merchant, known);
      if (guess) {
        category = guess.category;
        categoryOrigin = guess.origin;
        preview.guessed += 1;
      }
      if (categoryCell) {
        preview.warnings.push({
          line,
          message: guess
            ? `Kategori "${categoryCell}" tidak dikenali, ditebak menjadi ${CATEGORY_META[guess.category].label}.`
            : `Kategori "${categoryCell}" tidak dikenali, dibiarkan kosong.`,
        });
      }
    }

    let source: TransactionSource = "manual";
    const sourceCell = cell("source");
    if (sourceCell) {
      const matched = SOURCE_LOOKUP.get(normalize(sourceCell));
      if (matched) source = matched;
      else {
        preview.warnings.push({
          line,
          message: `Sumber "${sourceCell}" tidak dikenali, memakai Catat manual.`,
        });
      }
    }

    const timeCell = cell("time");
    const manualTime = normalizeTime(timeCell);
    const draft: ImportDraft = {
      line,
      date: parsed.date,
      time: manualTime ?? parsed.time ?? "00:00",
      merchant,
      note: cell("note") || undefined,
      category,
      categoryOrigin,
      amount: Math.round(amount),
      direction,
      source,
    };
    if (!manualTime && !parsed.time && timeCell) {
      preview.warnings.push({
        line,
        message: `Waktu "${timeCell}" tidak dikenali, dipakai 00:00.`,
      });
    }

    const key = duplicateKey(draft);
    if (knownKeys.has(key) || inFile.has(key)) {
      preview.duplicates.push(draft);
      return;
    }
    inFile.add(key);
    preview.drafts.push(draft);
  });

  preview.drafts.sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  return preview;
}
