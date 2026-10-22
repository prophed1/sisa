"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  UploadSimple,
} from "@phosphor-icons/react";
import { ImportCsvModal } from "@/components/settings/import-csv-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { buildLedgerCsv, csvFilename, downloadCsv } from "@/lib/csv";
import { SEED_TRANSACTIONS } from "@/lib/data/ledger-seed";
import { formatLongDate, isInPeriod } from "@/lib/finance";
import { restoreSeedLedger, useLedger } from "@/lib/ledger-store";

export function DataPanel() {
  const { transactions, period, today } = useLedger();
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [imported, setImported] = useState<{
    count: number;
    fileName: string;
  } | null>(null);

  const dates = transactions.map((tx) => tx.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const expenses = transactions.filter((tx) => tx.direction === "expense");
  const income = transactions.filter((tx) => tx.direction === "income");
  const inPeriod = transactions.filter((tx) =>
    isInPeriod(tx.date, period),
  ).length;

  const handleExport = () => {
    const filename = csvFilename(today);
    downloadCsv(filename, buildLedgerCsv(transactions));
    setExported(filename);
    setImported(null);
  };

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Data & cadangan"
        caption={
          transactions.length
            ? `${transactions.length} catatan · ${
                first ? formatLongDate(first) : ""
              }${last && last !== first ? ` – ${formatLongDate(last)}` : ""}`
            : "Belum ada catatan yang bisa diekspor."
        }
        action={
          <span className="num text-[10.5px] text-faint">
            {inPeriod} di {period.short}
          </span>
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
              Pengeluaran
            </dt>
            <dd className="num mt-1 text-[13px] font-medium">{expenses.length}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
              Pemasukan
            </dt>
            <dd className="num mt-1 text-[13px] font-medium">{income.length}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            size="sm"
            variant="primary"
            disabled={transactions.length === 0}
            onClick={handleExport}
          >
            <DownloadSimple size={14} />
            Unduh CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>
            <UploadSimple size={14} />
            Impor CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            <ArrowCounterClockwise size={14} />
            Data contoh
          </Button>
        </div>

        <p className="mt-2.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
          {imported ? (
            <>
              <CheckCircle size={12} weight="fill" className="mt-px shrink-0 text-pine" />
              <span>
                {imported.count} catatan ditambahkan dari{" "}
                <span className="text-muted">{imported.fileName}</span>. Angka di
                dasbor dan analisis sudah memakai catatan baru itu.
              </span>
            </>
          ) : exported ? (
            <>
              <CheckCircle size={12} weight="fill" className="mt-px shrink-0 text-pine" />
              <span>
                Tersimpan sebagai <span className="text-muted">{exported}</span>:
                tanggal, waktu, merchant, catatan, kategori, jenis, sumber, nominal.
              </span>
            </>
          ) : (
            <span>
              CSV delapan kolom berisi{" "}
              <span className="text-muted">seluruh catatan, semua tanggal</span> —
              bukan hanya bulan yang sedang dibuka. Untuk rentang tertentu (mis.
              20 Sep – 5 Okt) atau berkas PDF, buka{" "}
              <Link
                href="/laporan"
                className="inline-flex items-center gap-0.5 font-medium text-pine hover:underline"
              >
                Laporan
                <ArrowRight size={10} />
              </Link>
              .
            </span>
          )}
        </p>
      </div>

      <ImportCsvModal
        open={importing}
        onClose={() => setImporting(false)}
        transactions={transactions}
        onImported={(count, fileName) => {
          setExported(null);
          setImported({ count, fileName });
        }}
      />

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Kembalikan data contoh?"
        description={`Seluruh catatan yang sekarang diganti oleh ${SEED_TRANSACTIONS.length} transaksi contoh Juli–Oktober 2026. Anggaran tidak ikut berubah — unduh CSV dulu kalau perlu salinan.`}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                restoreSeedLedger();
                setExported(null);
                setConfirming(false);
              }}
            >
              Kembalikan
            </Button>
          </>
        }
      />
    </Panel>
  );
}
