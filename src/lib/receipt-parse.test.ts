import { describe, expect, it } from "vitest";
import { parseAmountText, parseReceiptText } from "@/lib/receipt-parse";

describe("parseAmountText", () => {
  it("membaca format ribuan Indonesia dan desimal", () => {
    expect(parseAmountText("1.250.000")).toBe(1_250_000);
    expect(parseAmountText("Rp 84.000")).toBe(84_000);
    expect(parseAmountText("50.000,00")).toBe(50_000);
    expect(parseAmountText("1,250,000.00")).toBe(1_250_000);
    expect(parseAmountText("1250000")).toBe(1_250_000);
  });

  it("mengembalikan null kalau tidak ada angka", () => {
    expect(parseAmountText("Rp -")).toBeNull();
    expect(parseAmountText("")).toBeNull();
  });
});

describe("parseReceiptText — struk", () => {
  it("memilih TOTAL, bukan tunai atau kembalian", () => {
    const draft = parseReceiptText(`
      INDOMARET
      Jl. Kemang Raya No. 12
      Tanggal 17/10/2026 19:20
      Susu 2 x 12.000      24.000
      Roti                 60.000
      TOTAL                84.000
      TUNAI               100.000
      KEMBALI              16.000
    `);

    expect(draft.amount).toBe(84_000);
    expect(draft.date).toBe("2026-10-17");
    expect(draft.time).toBe("19:20");
    expect(draft.merchant).toBe("INDOMARET");
    expect(draft.kind).toBe("struk");
    expect(draft.found).toEqual({ amount: true, date: true, merchant: true });
  });

  it("membaca grand total dan tanggal bernama bulan", () => {
    const draft = parseReceiptText(`
      TOKO ELEKTRONIK JAYA
      Tanggal: 17 Okt 2026
      Grand Total Rp 1.250.000
    `);

    expect(draft.amount).toBe(1_250_000);
    expect(draft.date).toBe("2026-10-17");
    expect(draft.merchant).toBe("TOKO ELEKTRONIK JAYA");
  });

  it("tidak menebak nominal dari teks tanpa angka uang", () => {
    const draft = parseReceiptText("Terima kasih telah berbelanja");
    expect(draft.amount).toBeNull();
    expect(draft.found.amount).toBe(false);
    expect(draft.date).toBeNull();
  });
});

describe("parseReceiptText — QRIS", () => {
  it("mengenali QRIS dan mengambil nominal dari label", () => {
    const draft = parseReceiptText(`
      QRIS
      Merchant: Warung Nasi Padang Sederhana
      NMID: ID1023456789
      Nominal: Rp50.000
      Scan untuk bayar
    `);

    expect(draft.kind).toBe("qris");
    expect(draft.amount).toBe(50_000);
    expect(draft.merchant).toBe("Warung Nasi Padang Sederhana");
    expect(draft.date).toBeNull();
  });

  it("tidak salah membaca NMID sebagai nominal", () => {
    const draft = parseReceiptText(`
      QRIS
      NMID: ID1023456789
      Total: Rp 27.500
    `);
    expect(draft.amount).toBe(27_500);
  });

  // Teks persis seperti hasil OCR tangkapan layar QRIS: nominal dan tahun
  // tanggal sama-sama empat digit, dan tahun muncul di baris setelah nominal.
  it("tidak memakai tahun sebagai nominal", () => {
    const draft = parseReceiptText(`
      QRIS

      GOPAY MERCHANT

      NMID : 1D1023456789012

      Merchant PAN : 9360000000000000001
      Total Bayar

      Rp 73.000

      19 Oktober 2026 09:08

      Pembayaran berhasil

      Scan untuk bayar
    `);

    expect(draft.kind).toBe("qris");
    expect(draft.amount).toBe(73_000);
    expect(draft.date).toBe("2026-10-19");
    expect(draft.time).toBe("09:08");
    expect(draft.merchant).toBe("GOPAY MERCHANT");
  });
});
