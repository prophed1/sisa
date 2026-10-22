import { describe, expect, it } from "vitest";
import { parseAmountCell, parseDateCell, parseLedgerCsv } from "@/lib/csv-import";
import type { Transaction } from "@/lib/types";

const known: Transaction[] = [
  {
    id: "x1",
    date: "2026-10-01",
    time: "09:05",
    merchant: "Sewa kos bulanan",
    category: "tagihan",
    amount: 1_250_000,
    direction: "expense",
    source: "manual",
  },
];

describe("parseAmountCell", () => {
  it("membaca pemisah ribuan titik dan koma", () => {
    expect(parseAmountCell("Rp 1.234.567")).toBe(1_234_567);
    expect(parseAmountCell("412,500")).toBe(412_500);
    expect(parseAmountCell("48000")).toBe(48_000);
  });

  it("membedakan ribuan dari desimal", () => {
    expect(parseAmountCell("1,234,567.00")).toBe(1_234_567);
    expect(parseAmountCell("1.250,50")).toBe(1250.5);
    expect(parseAmountCell("1.2")).toBe(1.2);
  });

  it("membaca nominal negatif", () => {
    expect(parseAmountCell("-48.000")).toBe(-48_000);
    expect(parseAmountCell("(1250)")).toBe(-1250);
    expect(parseAmountCell("minus 5.000")).toBe(-5000);
  });

  it("mengembalikan null untuk sel kosong atau bukan angka", () => {
    expect(parseAmountCell("")).toBeNull();
    expect(parseAmountCell("nihil")).toBeNull();
    expect(parseAmountCell("Rp")).toBeNull();
  });
});

describe("parseDateCell", () => {
  it("membaca ISO dengan dan tanpa waktu", () => {
    expect(parseDateCell("2026-10-17")).toEqual({
      date: "2026-10-17",
      time: null,
    });
    expect(parseDateCell("2026-10-17T08:15")).toEqual({
      date: "2026-10-17",
      time: "08:15",
    });
  });

  it("membaca urutan hari-bulan-tahun sebagai kebiasaan berkas Indonesia", () => {
    expect(parseDateCell("17/10/2026")?.date).toBe("2026-10-17");
    expect(parseDateCell("3-10-2026")?.date).toBe("2026-10-03");
    expect(parseDateCell("3.10.2026")?.date).toBe("2026-10-03");
  });

  it("membalik urutan saat bagian pertama jelas bulan", () => {
    expect(parseDateCell("10/17/2026")?.date).toBe("2026-10-17");
  });

  it("membaca nama bulan Indonesia dan Inggris", () => {
    expect(parseDateCell("17 Okt 2026")?.date).toBe("2026-10-17");
    expect(parseDateCell("1 Juli 2026")?.date).toBe("2026-07-01");
    expect(parseDateCell("Oct 17, 2026")?.date).toBe("2026-10-17");
    expect(parseDateCell("17-Oct-2026")?.date).toBe("2026-10-17");
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(parseDateCell("31/02/2026")).toBeNull();
    expect(parseDateCell("kemarin")).toBeNull();
    expect(parseDateCell("")).toBeNull();
  });
});

describe("parseLedgerCsv — berkas hasil ekspor sendiri", () => {
  const csv = `Tanggal,Waktu,Merchant,Catatan,Kategori,Jenis,Sumber,Nominal
2026-10-01,09:05,Sewa kos bulanan,Kamar 3B,Tagihan,Pengeluaran,Catat manual,1250000
2026-10-05,12:30,"Warung, Tekko",Nasi campur,Makanan & minuman,Pengeluaran,Catat manual,108000
2026-10-16,14:20,Gaji bulanan,Payroll,Lainnya,Pemasukan,Otomatis,12500000`;

  it("memisahkan baris siap impor dari duplikat", () => {
    const preview = parseLedgerCsv(csv, known);
    expect(preview.drafts).toHaveLength(2);
    expect(preview.duplicates).toHaveLength(1);
    expect(preview.issues).toHaveLength(0);
  });

  it("menjaga isi sel berkutip dan arah pemasukan", () => {
    const preview = parseLedgerCsv(csv, known);
    expect(preview.drafts[0].merchant).toBe("Warung, Tekko");
    expect(preview.drafts[1].direction).toBe("income");
    expect(preview.drafts[1].amount).toBe(12_500_000);
  });

  it("mencocokkan kategori dan sumber lewat namanya", () => {
    const preview = parseLedgerCsv(csv, known);
    expect(preview.drafts[0].category).toBe("makanan");
    expect(preview.drafts[1].source).toBe("system");
  });
});

describe("parseLedgerCsv — mutasi bank", () => {
  const csv = `Tanggal;Keterangan;Kategori;Debit;Kredit
17/10/2026;Transfer ke Budi;Lainnya;250.000;
16/10/2026;Gaji Oktober;Lainnya;;12.500.000
15/10/2026;Listrik PLN;Tagihan;Rp 412.500;
kemarin;Tanggal rusak;Tagihan;100.000;`;

  it("mendeteksi pemisah titik koma", () => {
    expect(parseLedgerCsv(csv, []).delimiter).toBe(";");
  });

  it("memakai kolom debit dan kredit sebagai arah transaksi", () => {
    const preview = parseLedgerCsv(csv, []);
    const byMerchant = (label: string) =>
      preview.drafts.find((draft) => draft.merchant.includes(label));
    expect(byMerchant("Budi")?.direction).toBe("expense");
    expect(byMerchant("Gaji")?.direction).toBe("income");
    expect(byMerchant("Gaji")?.amount).toBe(12_500_000);
    expect(byMerchant("Listrik")?.amount).toBe(412_500);
  });

  it("menyusun draf secara kronologis dan melewati baris cacat", () => {
    const preview = parseLedgerCsv(csv, []);
    expect(preview.drafts.map((draft) => draft.date)).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
    expect(preview.issues).toEqual([
      { line: 5, message: 'Tanggal tidak dikenali: "kemarin".' },
    ]);
  });
});

describe("parseLedgerCsv — berkas minim dan cacat", () => {
  it("menerima kolom Inggris dengan pemisah tab", () => {
    const preview = parseLedgerCsv(
      "date\tmerchant\tamount\n2026-09-30\tKopi\t-32000\n2026-09-29\tParkir\t15000\n",
      [],
    );
    expect(preview.delimiter).toBe("\t");
    expect(preview.drafts.map((draft) => draft.date)).toEqual([
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(preview.drafts.every((draft) => draft.direction === "expense")).toBe(
      true,
    );
  });

  it("melaporkan kolom wajib yang hilang tanpa mengimpor apa pun", () => {
    const preview = parseLedgerCsv("foo,bar\n1,2\n", []);
    expect(preview.drafts).toHaveLength(0);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].message).toContain("tanggal");
  });

  it("membuang duplikat di dalam berkas yang sama", () => {
    const preview = parseLedgerCsv(
      "Tanggal,Merchant,Nominal\n2026-10-02,Kopi,20000\n2026-10-02,Kopi,20000\n",
      [],
    );
    expect(preview.drafts).toHaveLength(1);
    expect(preview.duplicates).toHaveLength(1);
  });

  it("mengganti kategori asing dengan tebakan dan mencatatnya", () => {
    const preview = parseLedgerCsv(
      "Tanggal,Merchant,Kategori,Sumber,Nominal\n2026-10-03,Parkir Bandara,Parkir,Bank,45000\n",
      [],
    );
    expect(preview.drafts).toHaveLength(1);
    expect(preview.drafts[0].category).toBe("transportasi");
    expect(preview.drafts[0].categoryOrigin).toBe("keyword");
    expect(preview.guessed).toBe(1);
    expect(preview.drafts[0].source).toBe("manual");
    expect(preview.warnings).toHaveLength(2);
    expect(preview.warnings[0].message).toContain("ditebak menjadi");
  });

  it("menebak kategori dari riwayat merchant saat kolomnya kosong", () => {
    const preview = parseLedgerCsv(
      "Tanggal,Merchant,Nominal\n2026-10-04,Warung Tekko,108000\n2026-10-05,Zyxwvu,9000\n",
      [
        {
          id: "y1",
          date: "2026-09-10",
          time: "12:00",
          merchant: "Warung Tekko",
          category: "makanan",
          amount: 108_000,
          direction: "expense",
          source: "manual",
        },
      ],
    );
    const guessed = preview.drafts.find((draft) => draft.merchant === "Warung Tekko");
    const unknown = preview.drafts.find((draft) => draft.merchant === "Zyxwvu");
    expect(guessed?.category).toBe("makanan");
    expect(guessed?.categoryOrigin).toBe("history");
    expect(unknown?.category).toBeNull();
    expect(preview.guessed).toBe(1);
    expect(preview.warnings).toHaveLength(0);
  });

  it("menolak berkas kosong dengan satu pesan", () => {
    const preview = parseLedgerCsv("   ", []);
    expect(preview.drafts).toHaveLength(0);
    expect(preview.issues[0].message).toBe("Berkas kosong.");
  });
});
