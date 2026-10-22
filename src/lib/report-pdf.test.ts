import { describe, expect, it } from "vitest";
import { buildReport } from "@/lib/report";
import { createReportPdf } from "@/lib/report-pdf";
import { CATEGORY_ORDER } from "@/lib/data/categories";
import type { Transaction } from "@/lib/types";

const meta = { userName: "Demo", generatedAt: "2026-10-20" };

function makeTransactions(count: number): Transaction[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `trx-${index}`,
    date: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
    time: "12:30",
    merchant: `Merchant ${index + 1} dengan nama panjang`,
    note: "Catatan contoh",
    category: CATEGORY_ORDER[index % CATEGORY_ORDER.length],
    amount: 15_000 + index * 500,
    direction: "expense" as const,
    source: "manual" as const,
  }));
}

function reportFor(count: number) {
  return buildReport(makeTransactions(count), {
    from: "2026-10-01",
    to: "2026-10-31",
  });
}

describe("createReportPdf", () => {
  it("menghasilkan berkas PDF yang sah", async () => {
    const doc = await createReportPdf(reportFor(6), meta);
    const bytes = new Uint8Array(doc.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2_000);
  });

  it("memuat laporan beberapa halaman tanpa halaman kosong", async () => {
    const small = await createReportPdf(reportFor(5), meta);
    const large = await createReportPdf(reportFor(120), meta);

    expect(small.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(large.getNumberOfPages()).toBeGreaterThan(small.getNumberOfPages());

    const bytes = new Uint8Array(large.output("arraybuffer"));
    // Setiap halaman jsPDF ditandai objek /Type /Page di dalam berkas.
    const text = new TextDecoder("latin1").decode(bytes);
    const pageMarks = text.match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pageMarks.length).toBe(large.getNumberOfPages());
  });

  it("tetap membuat satu halaman saat rentangnya kosong", async () => {
    const empty = buildReport([], { from: "2026-10-01", to: "2026-10-31" });
    const doc = await createReportPdf(empty, meta);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
