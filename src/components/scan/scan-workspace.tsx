"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle,
  CircleNotch,
  ImageSquare,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { TransactionForm } from "@/components/ledger/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { addTransaction, useLedger } from "@/lib/ledger-store";
import { readImageText, type OcrProgress } from "@/lib/ocr-client";
import { monthKeyOf } from "@/lib/period";
import { parseReceiptText, type ReceiptDraft } from "@/lib/receipt-parse";
import { formatIDR } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Phase = "idle" | "reading" | "ready" | "error";

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

function draftToTransaction(
  draft: ReceiptDraft,
  today: string,
  text: string,
): Transaction {
  return {
    id: "scan-draft",
    date: draft.date ?? today,
    time: draft.time ?? currentTime(),
    merchant: draft.merchant ?? "Struk",
    note: text.split("\n").slice(0, 3).join(" · ").slice(0, 160),
    category: null,
    amount: draft.amount ?? 0,
    direction: "expense",
    source: "scan",
  };
}

export function ScanWorkspace() {
  const { today, setMonth } = useLedger();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<OcrProgress>({
    progress: 0,
    label: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [rawText, setRawText] = useState("");
  const [saved, setSaved] = useState<Transaction | null>(null);
  const [dragging, setDragging] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URL dibuat saat berkas dipilih dan dilepas lagi saat diganti,
  // supaya tidak ada URL menggantung selama halaman terbuka.
  const showPreview = useCallback((next: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    const url = next ? URL.createObjectURL(next) : null;
    previewUrl.current = url;
    setPreview(url);
  }, []);

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const accept = useCallback(
    (next: File | null) => {
      if (!next) return;
      if (!next.type.startsWith("image/")) {
        setError("Berkasnya bukan gambar. Pilih foto atau tangkapan layar.");
        setPhase("error");
        return;
      }
      setFile(next);
      showPreview(next);
      setDraft(null);
      setRawText("");
      setSaved(null);
      setError(null);
      setPhase("idle");
      setProgress({ progress: 0, label: "" });
    },
    [showPreview],
  );

  const read = async () => {
    if (!file || phase === "reading") return;
    setPhase("reading");
    setError(null);
    setProgress({ progress: 0, label: "Menyiapkan mesin OCR" });

    try {
      const text = await readImageText(file, setProgress);
      setRawText(text);
      const parsed = parseReceiptText(text);
      if (!parsed.amount && !parsed.date && !parsed.merchant) {
        setDraft(null);
        setError(
          "Tidak ada angka atau nama toko yang terbaca. Coba foto yang lebih jelas, atau isi form manual.",
        );
        setPhase("error");
        return;
      }
      setDraft(parsed);
      setFormKey((value) => value + 1);
      setPhase("ready");
    } catch (cause) {
      setDraft(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Gambar tidak bisa dibaca. Coba lagi atau isi form manual.",
      );
      setPhase("error");
    }
  };

  const initial = draft ? draftToTransaction(draft, today, rawText) : undefined;

  return (
    <div className="reveal mx-auto max-w-[1120px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Scan struk & QRIS
          </div>
          <h1 className="mt-2.5 max-w-[26ch] text-[23px] font-medium leading-tight tracking-[-0.03em] sm:text-[27px]">
            Foto struk, form terisi sendiri.
          </h1>
          <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-relaxed text-muted">
            Nominal, tanggal, dan nama toko dibaca di perangkat ini — gambarnya
            tidak diunggah ke mana pun. Periksa hasilnya sebelum menyimpan.
          </p>
        </div>
        <SaveStatusBadge className="h-[26px] px-2.5" />
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.05fr]">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-medium tracking-[-0.01em]">
                Gambar struk
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                Foto langsung, unggah dari galeri, atau tangkapan layar QRIS.
              </p>
            </div>
            {draft?.kind === "qris" ? (
              <Badge tone="pine" className="shrink-0">
                QRIS
              </Badge>
            ) : null}
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Pilih gambar struk"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              accept(event.dataTransfer.files?.[0] ?? null);
            }}
            className={[
              "mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed px-5 py-8 text-center transition-colors",
              dragging
                ? "border-pine bg-pine-soft"
                : "border-line bg-canvas hover:border-line-strong",
            ].join(" ")}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Pratinjau struk yang dipilih"
                className="max-h-[240px] w-auto rounded-[10px] border border-line object-contain"
              />
            ) : (
              <>
                <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-faint">
                  <ImageSquare size={20} />
                </span>
                <p className="text-[12px] text-muted">
                  Letakkan gambar di sini, atau{" "}
                  <span className="font-medium text-ink">pilih berkas</span>
                </p>
                <p className="text-[10.5px] text-faint">
                  JPG, PNG, atau WEBP · maksimal 10 MB
                </p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0] ?? null)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={read}
              disabled={!file || phase === "reading"}
            >
              {phase === "reading" ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Membaca…
                </>
              ) : (
                <>
                  <Camera size={14} />
                  {draft ? "Baca ulang" : "Baca struk"}
                </>
              )}
            </Button>
            {file ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  showPreview(null);
                  setDraft(null);
                  setRawText("");
                  setError(null);
                  setPhase("idle");
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Ganti gambar
              </Button>
            ) : null}
            <Link
              href="/catat"
              className="ml-auto text-[10.5px] text-faint underline-offset-2 hover:text-ink hover:underline"
            >
              Isi manual saja
            </Link>
          </div>

          {phase === "reading" ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10.5px] text-faint">
                <span>{progress.label || "Memproses"}</span>
                <span className="num">{Math.round(progress.progress * 100)}%</span>
              </div>
              <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-pine transition-[width] duration-300"
                  style={{ width: `${Math.max(progress.progress * 100, 4)}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-[11px] border border-line bg-clay-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-clay"
            >
              <WarningCircle size={14} className="mt-px shrink-0" />
              {error}
            </p>
          ) : null}

          {draft ? (
            <div className="mt-4 rounded-[13px] border border-line bg-surface-2/50 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                <Sparkle size={11} className="text-pine" />
                Yang terbaca
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[11.5px]">
                <div>
                  <dt className="text-[9.5px] uppercase tracking-[0.08em] text-faint">
                    Nominal
                  </dt>
                  <dd className="num mt-0.5 font-medium">
                    {draft.amount ? formatIDR(draft.amount) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] uppercase tracking-[0.08em] text-faint">
                    Tanggal
                  </dt>
                  <dd className="num mt-0.5 font-medium">
                    {draft.date ?? "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[9.5px] uppercase tracking-[0.08em] text-faint">
                    Merchant
                  </dt>
                  <dd className="mt-0.5 truncate font-medium">
                    {draft.merchant ?? "—"}
                  </dd>
                </div>
              </dl>
              {rawText ? (
                <details className="mt-2 border-t border-line pt-2">
                  <summary className="cursor-pointer text-[10px] text-faint hover:text-muted">
                    Lihat teks mentah
                  </summary>
                  <pre className="thin-scroll mt-2 max-h-[150px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted">
                    {rawText}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5 sm:p-6">
          {saved ? (
            <div className="rise space-y-5">
              <div className="flex items-start gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pine-soft text-pine">
                  <CheckCircle size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-medium tracking-[-0.01em]">
                    Transaksi tersimpan
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    {saved.merchant} · {saved.date} · {saved.time}
                  </p>
                </div>
              </div>

              <p className="num text-[26px] font-medium tracking-[-0.03em]">
                −{formatIDR(saved.amount)}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSaved(null);
                    setFile(null);
                    showPreview(null);
                    setDraft(null);
                    setRawText("");
                    setPhase("idle");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  <Camera size={14} />
                  Scan lagi
                </Button>
                <Link
                  href="/"
                  className={buttonStyles({ variant: "primary" })}
                >
                  Lihat dasbor
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <div key={formKey}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-medium tracking-[-0.01em]">
                    {draft ? "Periksa lalu simpan" : "Form transaksi"}
                  </h2>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                    {draft
                      ? "Nilai dari gambar bisa salah; betulkan yang perlu sebelum disimpan."
                      : "Pilih gambar untuk mengisi form otomatis, atau isi sendiri di sini."}
                  </p>
                </div>
                {draft ? <Badge tone="outline">Dari struk</Badge> : null}
              </div>

              <TransactionForm
                key={formKey}
                mode="create"
                initial={initial}
                submitLabel="Simpan hasil scan"
                onSubmit={(value) => {
                  const transaction = addTransaction(value);
                  setMonth(monthKeyOf(transaction.date));
                  setSaved(transaction);
                }}
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
