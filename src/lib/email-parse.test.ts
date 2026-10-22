import { describe, expect, it } from "vitest";
import { parseBankEmail, stripHtml } from "@/lib/email-parse";

const debitEmail = `
Yth. Nasabah,
Pemberitahuan Transaksi
Transaksi Debit
Tanggal: 17/10/2026 14:32:05
Nominal: Rp150.000,00
Merchant: TOKOPEDIA
Saldo: Rp 2.500.000
Jangan membalas email ini.
`;

// Format yang benar-benar dikirim BSI: label "Tanggal Transaksi" dan
// "Jenis Transaksi" berada tepat di atas baris "Merchant", jadi keduanya bisa
// terbaca sebagai merchant kalau penandanya tidak dipasang di awal baris.
const bsiEmail = `
Yth. Nasabah,

Transaksi Kartu Debit BSI Anda telah berhasil.

Tanggal Transaksi: 18-10-2026 14:32:10
Jenis Transaksi  : TRANSAKSI DEBIT
Nominal          : Rp 73.000,00
Merchant         : TOKO BAHAGIA
Lokasi           : Jakarta

Saldo Anda saat ini Rp 5.240.100,00

Terima kasih.
PT Bank Syariah Indonesia
`;

// Bentuk asli notifikasi "QRIS Payment" dari mobile@bankbsi.co.id. Baris
// "Jumlah" dan "Jumlah Total" sama besar; "Tips" dan nomor struk harus diabaikan.
const qrisEmail = `*QRIS Payment*

Status: BERHASIL
No. Transaksi: FT26292PP4ZC
Referensi: 498006648974
Tanggal Transaksi: 2026-10-19 20:14:55
Nama Acquire: Gopay
Merchant PAN: 9360091438339620800
Terminal ID Acquiring: A01
Merchant: nasgor ibra, LWKWR
Alamat: MALANG, 65144, ID
Jumlah: Rp 12.000
Tips: Rp 0
Jumlah Total: Rp 12.000
Tanggal email: 2026-10-20 00:01:00
`;

// Bentuk asli "Transfer BI Fast (Ke Bank Lain)": nominal ditulis gaya Inggris
// (40,000) dan nama penerima ada di barisnya sendiri.
const biFastEmail = `*Transfer BI Fast *

Status: BERHASIL
Nomor Transaksi: FT262910TLHR
Tanggal/Jam: 18 Oct 2026 16:25:28
Pengirim: ABDUL HALIM AMRAN
Dari Rekening: XXXXXX3448
Ke Rekening / Proxy: 901116351872
Bank Penerima: Bank Seabank Indonesia
Penerima: ABDULHALIMAMRAN
Jumlah: Rp 40,000
`;

const creditEmail = `
Pemberitahuan Transaksi
Transaksi Kredit
Tanggal: 16 Okt 2026
Nominal: Rp 12.500.000
Keterangan: GAJI BULANAN
`;

describe("parseBankEmail", () => {
  it("membaca transaksi debit tanpa tertukar dengan saldo", () => {
    const { draft } = parseBankEmail({
      subject: "Notifikasi Transaksi BSI",
      text: debitEmail,
    });

    expect(draft).not.toBeNull();
    expect(draft?.amount).toBe(150_000);
    expect(draft?.date).toBe("2026-10-17");
    expect(draft?.time).toBe("14:32");
    expect(draft?.direction).toBe("expense");
    expect(draft?.merchant).toBe("TOKOPEDIA");
  });

  it("menandai transaksi kredit sebagai pemasukan", () => {
    const { draft } = parseBankEmail({
      subject: "Mutasi masuk",
      text: creditEmail,
    });

    expect(draft?.amount).toBe(12_500_000);
    expect(draft?.direction).toBe("income");
    expect(draft?.date).toBe("2026-10-16");
    expect(draft?.merchant).toBe("GAJI BULANAN");
  });

  it("tidak tertukar antara baris Tanggal/Jenis Transaksi dan nama merchant", () => {
    const { draft } = parseBankEmail({
      subject: "Notifikasi Transaksi BSI",
      text: bsiEmail,
    });

    expect(draft?.merchant).toBe("TOKO BAHAGIA");
    expect(draft?.amount).toBe(73_000);
    expect(draft?.date).toBe("2026-10-18");
    expect(draft?.time).toBe("14:32");
    expect(draft?.direction).toBe("expense");
  });

  it("membaca notifikasi QRIS asli BSI tanpa tertukar tips atau nomor struk", () => {
    const { draft } = parseBankEmail({ subject: "QRIS Payment", text: qrisEmail });

    expect(draft?.merchant).toBe("nasgor ibra, LWKWR");
    expect(draft?.amount).toBe(12_000);
    expect(draft?.date).toBe("2026-10-19");
    expect(draft?.time).toBe("20:14");
    expect(draft?.direction).toBe("expense");
  });

  it("memakai tanggal isi email, bukan tanggal email yang ditempel di akhir", () => {
    const { draft } = parseBankEmail({ subject: "QRIS Payment", text: qrisEmail });
    // Transaksi 19 Okt 20:14, email baru diteruskan 20 Okt 00:01.
    expect(draft?.date).toBe("2026-10-19");
  });

  it("membaca transfer BI Fast memakai nama penerima, bukan nama bank tujuan", () => {
    const { draft } = parseBankEmail({
      subject: "Transfer BI Fast (Ke Bank Lain)",
      text: biFastEmail,
    });

    expect(draft?.merchant).toBe("ABDULHALIMAMRAN");
    expect(draft?.amount).toBe(40_000);
    expect(draft?.date).toBe("2026-10-18");
    expect(draft?.time).toBe("16:25");
    expect(draft?.direction).toBe("expense");
  });

  it("tidak memakai nama bank pada subjek transfer sebagai merchant", () => {
    const { draft } = parseBankEmail({
      subject: "Transfer BI Fast (Ke Bank Lain)",
      text: "Status: BERHASIL\nTanggal/Jam: 18 Oct 2026 16:25:28\nJumlah: Rp 40.000",
    });
    expect(draft?.merchant).toBe("Mutasi bank");
  });

  it("memakai label Transaksi sebagai jalan terakhir", () => {
    const { draft } = parseBankEmail({
      subject: "",
      text: "Transaksi: KOPI KENANGAN\nTanggal: 04/11/2026\nNominal: Rp 42.500",
    });
    expect(draft?.merchant).toBe("KOPI KENANGAN");
  });

  it("membaca email berbentuk HTML", () => {
    const html = `
      <html><body>
        <p>Transaksi Debit</p>
        <p>Tanggal: 03/11/2026 09:15</p>
        <p>Nominal: IDR 75.000,00</p>
        <p>Description: WARUNG KOPI</p>
      </body></html>
    `;
    const { draft } = parseBankEmail({ subject: "BSI", text: html });

    expect(stripHtml(html)).not.toContain("<p>");
    expect(draft?.amount).toBe(75_000);
    expect(draft?.date).toBe("2026-11-03");
    expect(draft?.merchant).toBe("WARUNG KOPI");
  });

  it("menolak email tanpa nominal dengan alasan yang jelas", () => {
    const result = parseBankEmail({
      subject: "Promo",
      text: "Nikmati promo menarik bulan ini.",
    });
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/nominal/i);
  });

  it("menolak email tanpa tanggal", () => {
    const result = parseBankEmail({
      subject: "Transaksi",
      text: "Transaksi Debit\nNominal: Rp 50.000",
    });
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/tanggal/i);
  });

  it("jatuh ke nama netral kalau merchant tidak tertulis", () => {
    const { draft } = parseBankEmail({
      subject: "",
      text: "Transaksi Debit\nTanggal: 17/10/2026\nNominal: Rp 50.000",
    });
    expect(draft?.merchant).toBe("Mutasi bank");
  });
});
