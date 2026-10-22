"use client";

import { useRef, useState } from "react";
import {
  DownloadSimple,
  FileCsv,
  Info,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  LEDGER_COLUMNS,
  buildImportTemplateCsv,
  downloadCsv,
  importTemplateFilename,
} from "@/lib/csv";
import {
  DELIMITER_LABEL,
  parseLedgerCsv,
  type ImportNote,
  type ImportPreview,
} from "@/lib/csv-import";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatIDR } from "@/lib/format";
import { importTransactions } from "@/lib/ledger-store";
import type { Transaction, TransactionDraft } from "@/lib/types";

/** Lebih dari ini hampir pasti bukan berkas catatan pribadi. */
const MAX_BYTES = 4 * 1024 * 1024;
const PREVIEW_ROWS = 5;
const NOTE_ROWS = 4;

function toDraft(draft: TransactionDraft): TransactionDraft {
  return {
    date: draft.date,
    time: draft.time,
    merchant: draft.merchant,
    note: draft.note,
    category: draft.category,
    amount: draft.amount,
    direction: draft.direction,
    source: draft.source,
  };
}

function Notes({
  tone,
  title,
  notes,
}: {
  tone: "issue" | "warning";
  title: string;
  notes: ImportNote[];
}) {
  if (!notes.length) return null;
  const shown = notes.slice(0, NOTE_ROWS);
  return (
    <div className="mt-3">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-faint">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {shown.map((note, index) => (
          <li
            key={`${note.line}-${index}`}
            className="flex items-start gap-2 text-[11px] leading-relaxed"
          >
            <span className="num mt-px shrink-0 text-faint">baris {note.line}</span>
            <span className={tone === "issue" ? "text-clay" : "text-muted"}>
              {note.message}
            </span>
          </li>
        ))}
      </ul>
      {notes.length > shown.length ? (
        <p className="mt-1 text-[10.5px] text-faint">
          {notes.length - shown.length} catatan lain disembunyikan.
        </p>
      ) : null}
    </div>
  );
}

export function ImportCsvModal({
  open,
  onClose,
  transactions,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImported: (count: number, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const reset = () => {
    setFileName(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setError(null);
    setPreview(null);
    setFileName(file.name);
    if (file.size > MAX_BYTES) {
      setError("Berkas lebih dari 4 MB. Pecah dulu, lalu impor satu per satu.");
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      setPreview(parseLedgerCsv(text, transactions));
    } catch {
      setError("Berkas tidak bisa dibaca. Pastikan formatnya CSV, bukan XLSX.");
    } finally {
      setReading(false);
    }
  };

  const confirm = () => {
    if (!preview?.drafts.length) return;
    const count = importTransactions(preview.drafts.map(toDraft));
    onImported(count, fileName ?? "berkas CSV");
    reset();
    onClose();
  };

  const ready = preview?.drafts.length ?? 0;
  const duplicates = preview?.duplicates.length ?? 0;
  const problems = preview?.issues.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Impor catatan dari CSV"
      description="Kolom dicocokkan lewat namanya, jadi hasil ekspor aplikasi ini maupun mutasi bank bisa langsung masuk."
      className="max-w-[620px]"
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Batal
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={ready === 0}
            onClick={confirm}
          >
            <FileCsv size={14} />
            Impor {ready} catatan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          id="import-csv-input"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <label
          htmlFor="import-csv-input"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <FileCsv size={14} />
          Pilih berkas CSV
        </label>
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
          {reading
            ? "Membaca berkas..."
            : fileName
              ? fileName
              : "Belum ada berkas dipilih."}
        </span>
        <button
          type="button"
          onClick={() =>
            downloadCsv(importTemplateFilename, buildImportTemplateCsv())
          }
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-ink"
        >
          <DownloadSimple size={12} />
          Unduh templat
        </button>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
        <Info size={12} className="mt-px shrink-0" />
        <span>
          Kolom yang dikenali: {LEDGER_COLUMNS.join(", ")}. Tanggal
          boleh <span className="text-muted">2026-10-17</span>,{" "}
          <span className="text-muted">17/10/2026</span>, atau{" "}
          <span className="text-muted">17 Okt 2026</span>; nominal boleh berisi
          &quot;Rp&quot; dan pemisah ribuan. Pemisah kolom koma, titik koma,
          maupun tab semuanya terbaca.
        </span>
      </p>

      {error ? (
        <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-line bg-clay-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-clay">
          <WarningCircle size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      {preview ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
            <div className="bg-surface px-3 py-2.5">
              <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
                Siap diimpor
              </dt>
              <dd className="num mt-1 text-[13px] font-medium text-pine">
                {ready}
              </dd>
            </div>
            <div className="bg-surface px-3 py-2.5">
              <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
                Duplikat
              </dt>
              <dd className="num mt-1 text-[13px] font-medium">{duplicates}</dd>
            </div>
            <div className="bg-surface px-3 py-2.5">
              <dt className="text-[9.5px] uppercase tracking-[0.1em] text-faint">
                Bermasalah
              </dt>
              <dd className="num mt-1 text-[13px] font-medium">
                {problems}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
            {preview.total} baris data · pemisah{" "}
            {DELIMITER_LABEL[preview.delimiter] ?? preview.delimiter} ·{" "}
            {preview.columns.length} kolom. Duplikat adalah baris dengan tanggal,
            nominal, jenis, dan merchant yang sudah ada di ledger.
            {preview.guessed
              ? ` ${preview.guessed} kategori ditebak dari nama merchant.`
              : ""}
          </p>

          {preview.drafts.length ? (
            <ul className="thin-scroll mt-3 max-h-[192px] divide-y divide-line/70 overflow-y-auto rounded-[12px] border border-line">
              {preview.drafts.slice(0, PREVIEW_ROWS).map((draft) => (
                <li
                  key={`${draft.line}-${draft.merchant}`}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <span className="num w-[64px] shrink-0 text-[11px] text-muted">
                    {draft.date.slice(8)}/
                    {draft.date.slice(5, 7)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {draft.merchant}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-faint">
                    {draft.category
                      ? CATEGORY_META[draft.category].shortLabel
                      : "Tanpa kategori"}
                  </span>
                  {draft.categoryOrigin ? (
                    <span
                      className="shrink-0 rounded-full border border-line px-1.5 py-px text-[9px] uppercase tracking-[0.08em] text-faint"
                      title="Kategori ditebak dari riwayat atau nama merchant"
                    >
                      tebakan
                    </span>
                  ) : null}
                  <span
                    className={
                      draft.direction === "income"
                        ? "num w-[96px] shrink-0 text-right text-[11.5px] text-pine"
                        : "num w-[96px] shrink-0 text-right text-[11.5px]"
                    }
                  >
                    {draft.direction === "income" ? "+" : "−"}
                    {formatIDR(draft.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {preview.drafts.length > PREVIEW_ROWS ? (
            <p className="mt-1.5 text-[10.5px] text-faint">
              Menampilkan {PREVIEW_ROWS} baris pertama dari {preview.drafts.length}.
            </p>
          ) : null}

          <Notes tone="issue" title="Baris dilewati" notes={preview.issues} />
          <Notes
            tone="warning"
            title="Bagian yang disesuaikan"
            notes={preview.warnings}
          />
        </>
      ) : null}
    </Modal>
  );
}
