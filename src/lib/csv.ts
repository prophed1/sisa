import { CATEGORY_META } from "@/lib/data/categories";
import { SOURCE_META } from "@/lib/data/ledger-seed";
import type { Transaction } from "@/lib/types";

/** Kolom ekspor; acuan format yang sama untuk impor. */
export const LEDGER_COLUMNS = [
  "Tanggal",
  "Waktu",
  "Merchant",
  "Catatan",
  "Kategori",
  "Jenis",
  "Sumber",
  "Nominal",
];

/** Bungkus sel hanya kalau perlu, sesuai RFC 4180. */
function cell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV kronologis (lama → baru) dengan BOM supaya Excel membaca UTF-8.
 * Nominal ditulis sebagai bilangan bulat tanpa pemisah ribuan agar bisa
 * langsung dijumlahkan di spreadsheet.
 */
export function buildLedgerCsv(transactions: Transaction[]) {
  const rows = [...transactions]
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    )
    .map((tx) => [
      tx.date,
      tx.time,
      tx.merchant,
      tx.note ?? "",
      tx.category ? CATEGORY_META[tx.category].label : "",
      tx.direction === "income" ? "Pemasukan" : "Pengeluaran",
      SOURCE_META[tx.source].label,
      tx.amount,
    ]);

  const lines = [LEDGER_COLUMNS, ...rows].map((row) => row.map(cell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Templat dua baris contoh supaya susunan kolom impor langsung jelas. */
export function buildImportTemplateCsv() {
  const rows: (string | number)[][] = [
    [
      "2026-10-18",
      "08:15",
      "Toko Kopi Tuku",
      "Kopi susu",
      "Makanan & minuman",
      "Pengeluaran",
      "Catat manual",
      48000,
    ],
    [
      "2026-10-19",
      "09:00",
      "Gaji bulanan",
      "",
      "Lainnya",
      "Pemasukan",
      "Catat manual",
      12500000,
    ],
  ];
  const lines = [LEDGER_COLUMNS, ...rows].map((row) => row.map(cell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvFilename(today: string) {
  return `sisa-catatan-${today}.csv`;
}

export const importTemplateFilename = "sisa-templat-impor.csv";
