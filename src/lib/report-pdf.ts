"use client";

import { CATEGORY_META } from "@/lib/data/categories";
import { SOURCE_META } from "@/lib/data/ledger-seed";
import { formatLongDate } from "@/lib/finance";
import { formatIDR, formatNumber } from "@/lib/format";
import { bucketByMonth, rangeFilename, type Report } from "@/lib/report";

/**
 * Laporan PDF A4. Digambar langsung dengan koordinat milimeter supaya hasilnya
 * sama di semua peramban — bukan tangkapan layar dan bukan CSS cetak yang
 * bergantung pada pengaturan margin pengguna.
 *
 * Huruf baku jsPDF (Helvetica) hanya mendukung WinAnsi, jadi teks di sini
 * memakai karakter ASCII: tanda minus "-" bukan "−", dan pemisah " - " bukan
 * "—". Simbol di luar itu akan tampil sebagai kotak.
 */

const PAGE = { width: 210, height: 297, margin: 16 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
/** Batas bawah isi: kaki halaman digambar di 283 mm. */
const BODY_BOTTOM = PAGE.height - 22;
/** Awal isi halaman berikutnya, tepat di bawah pita judul. */
const BODY_TOP = 34;

/* Warna berkas cetak mengikuti palet aplikasi: French Blue, Midnight Violet,
 * kertas Seashell. */
const PINE = "#3E4B8E";
const INK = "#34102C";
const MUTED = "#6B4A60";
const LINE = "#E9D8C6";
const SOFT = "#FBF1E5";

export interface ReportPdfMeta {
  userName: string;
  /** Tanggal pembuatan, "YYYY-MM-DD". */
  generatedAt: string;
}

function rangeText(report: Report) {
  const { from, to } = report.range;
  return from === to
    ? formatLongDate(from)
    : `${formatLongDate(from)} - ${formatLongDate(to)}`;
}

/**
 * Pindah halaman sebelum menggambar sesuatu yang butuh `needed` mm. Tanpa ini
 * judul bagian bisa tertinggal sendiri di dasar halaman sementara tabelnya
 * mulai di halaman berikutnya.
 */
function ensureSpace(doc: import("jspdf").jsPDF, y: number, needed: number) {
  if (y + needed <= BODY_BOTTOM) return y;
  doc.addPage();
  return BODY_TOP;
}

function sectionTitle(doc: import("jspdf").jsPDF, text: string, y: number) {
  doc.setFillColor(PINE);
  doc.circle(PAGE.margin + 1.1, y - 1.1, 1.1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text(text, PAGE.margin + 4.5, y);
  return y + 4;
}

function drawHeader(doc: import("jspdf").jsPDF, meta: ReportPdfMeta) {
  doc.setFillColor(PINE);
  doc.rect(0, 0, PAGE.width, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor("#ffffff");
  doc.text("Sisa", PAGE.margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor("#F6E0B6");
  doc.text("Laporan pengeluaran", PAGE.margin, 18);

  doc.setFontSize(8.5);
  doc.text(`Dibuat ${formatLongDate(meta.generatedAt)}`, PAGE.width - PAGE.margin, 18, {
    align: "right",
  });
  doc.setFontSize(9);
  doc.setTextColor("#ffffff");
  doc.text(meta.userName, PAGE.width - PAGE.margin, 12, { align: "right" });
}

function drawSummary(doc: import("jspdf").jsPDF, report: Report, top: number) {
  const gap = 3;
  const boxWidth = (CONTENT_WIDTH - gap * 3) / 4;
  const cells = [
    { label: "PENGELUARAN", value: formatIDR(report.expense) },
    { label: "PEMASUKAN", value: formatIDR(report.income) },
    { label: "SELISIH", value: formatIDR(report.net) },
    { label: "CATATAN", value: `${formatNumber(report.count)} transaksi` },
  ];

  cells.forEach((cell, index) => {
    const x = PAGE.margin + index * (boxWidth + gap);
    doc.setDrawColor(LINE);
    doc.setFillColor(SOFT);
    doc.roundedRect(x, top, boxWidth, 17, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(MUTED);
    doc.text(cell.label, x + 3, top + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(INK);
    doc.text(cell.value, x + 3, top + 12);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    `${rangeText(report)}  ·  ${report.days} hari  ·  rata-rata ${formatIDR(
      Math.round(report.dailyAverage),
    )} per hari`,
    PAGE.margin,
    top + 24,
  );

  return top + 34;
}

export async function createReportPdf(report: Report, meta: ReportPdfMeta) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  drawHeader(doc, meta);
  let cursor = drawSummary(doc, report, BODY_TOP);

  if (report.byCategory.length) {
    cursor = sectionTitle(
      doc,
      "Pengeluaran per kategori",
      ensureSpace(doc, cursor, 40),
    );
    autoTable(doc, {
      startY: cursor,
      margin: { left: PAGE.margin, right: PAGE.margin },
      head: [["Kategori", "Catatan", "Porsi", "Jumlah"]],
      body: report.byCategory.map((row) => [
        row.label,
        String(row.count),
        `${row.share.toFixed(1).replace(".", ",")}%`,
        formatIDR(row.amount),
      ]),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.8, textColor: INK },
      headStyles: {
        fillColor: SOFT,
        textColor: MUTED,
        fontSize: 7,
        fontStyle: "bold",
        lineColor: LINE,
        lineWidth: 0.1,
      },
      bodyStyles: { lineColor: LINE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: "#FFFBF5" },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 26, halign: "right" },
        2: { cellWidth: 26, halign: "right" },
        3: { cellWidth: "auto", halign: "right" },
      },
    });
    cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;
  }

  const months = bucketByMonth(report.rows);
  if (months.length > 1) {
    cursor = sectionTitle(
      doc,
      "Per bulan dalam rentang",
      ensureSpace(doc, cursor, 40),
    );
    autoTable(doc, {
      startY: cursor,
      margin: { left: PAGE.margin, right: PAGE.margin },
      head: [["Bulan", "Catatan", "Pengeluaran", "Pemasukan"]],
      body: months.map((month) => [
        month.label,
        String(month.count),
        formatIDR(month.expense),
        formatIDR(month.income),
      ]),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.8, textColor: INK },
      headStyles: {
        fillColor: SOFT,
        textColor: MUTED,
        fontSize: 7,
        fontStyle: "bold",
        lineColor: LINE,
        lineWidth: 0.1,
      },
      bodyStyles: { lineColor: LINE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: "#FFFBF5" },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;
  }

  cursor = sectionTitle(
    doc,
    `Rincian transaksi (${formatNumber(report.count)} catatan)`,
    ensureSpace(doc, cursor, 36),
  );

  if (report.rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text("Tidak ada catatan pada rentang ini.", PAGE.margin, cursor + 2);
  } else {
    autoTable(doc, {
      startY: cursor,
      margin: { left: PAGE.margin, right: PAGE.margin, bottom: 20 },
      head: [["Tanggal", "Jam", "Transaksi", "Kategori", "Sumber", "Nominal"]],
      body: report.rows.map((tx) => [
        formatLongDate(tx.date),
        tx.time,
        tx.note ? `${tx.merchant}\n${tx.note}` : tx.merchant,
        tx.category
          ? CATEGORY_META[tx.category].label
          : tx.direction === "income"
            ? "Pemasukan"
            : "Tanpa kategori",
        SOURCE_META[tx.source].label,
        `${tx.direction === "income" ? "+" : "-"}${formatIDR(tx.amount)}`,
      ]),
      styles: {
        font: "helvetica",
        fontSize: 7.6,
        cellPadding: 1.6,
        textColor: INK,
        valign: "middle",
      },
      headStyles: {
        fillColor: SOFT,
        textColor: MUTED,
        fontSize: 7,
        fontStyle: "bold",
        lineColor: LINE,
        lineWidth: 0.1,
      },
      bodyStyles: { lineColor: LINE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: "#FFFBF5" },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 12 },
        2: { cellWidth: 62 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: "auto", halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          doc.setTextColor(data.cell.raw?.toString().startsWith("+") ? PINE : INK);
        }
      },
    });
  }

  // Kaki halaman digambar setelah semua tabel selesai supaya jumlah halaman
  // sudah final dan nomornya tidak salah.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(LINE);
    doc.line(PAGE.margin, PAGE.height - 14, PAGE.width - PAGE.margin, PAGE.height - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    doc.text("Sisa - pelacak pengeluaran", PAGE.margin, PAGE.height - 9);
    doc.text(`Halaman ${page} dari ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 9, {
      align: "right",
    });
  }

  return doc;
}

export async function downloadReportPdf(report: Report, meta: ReportPdfMeta) {
  const doc = await createReportPdf(report, meta);
  doc.save(`${rangeFilename(report.range)}.pdf`);
}
