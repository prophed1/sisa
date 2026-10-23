"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  CheckCircle,
  DownloadSimple,
  FilePdf,
  Info,
  WarningCircle,
} from "@phosphor-icons/react";
import { useSessionUser } from "@/components/providers/session-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import { buildLedgerCsv, downloadCsv } from "@/lib/csv";
import { formatLongDate } from "@/lib/finance";
import { formatIDR, formatNumber, formatPercent } from "@/lib/format";
import { useLedger } from "@/lib/ledger-store";
import { downloadReportPdf } from "@/lib/report-pdf";
import {
  buildReport,
  daysInRange,
  isIsoDate,
  normalizeRange,
  rangeFilename,
  rangePresets,
} from "@/lib/report";
import { cn } from "@/lib/utils";

const dateInputClass =
  "h-9 rounded-[10px] border border-line bg-surface px-2.5 text-[12px] outline-none transition-colors focus:border-line-strong [color-scheme:light] dark:[color-scheme:dark]";

/** Baris tabel yang dirender di layar; PDF selalu memuat seluruh rentang. */
const PREVIEW_ROWS = 40;

export function ReportWorkspace() {
  const { transactions, today } = useLedger();
  const user = useSessionUser();

  const presets = useMemo(() => rangePresets(today), [today]);
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const valid = isIsoDate(from) && isIsoDate(to);
  const report = useMemo(
    () =>
      valid
        ? buildReport(transactions, { from, to })
        : buildReport(transactions, normalizeRange(from, to)),
    [transactions, from, to, valid],
  );

  const activePreset = presets.find(
    (preset) => preset.from === report.range.from && preset.to === report.range.to,
  );

  const days = daysInRange(report.range);
  const preview = showAll ? report.rows : report.rows.slice(0, PREVIEW_ROWS);

  const applyPreset = (preset: { from: string; to: string }) => {
    setFrom(preset.from);
    setTo(preset.to);
    setShowAll(false);
    setSaved(null);
    setProblem(null);
  };

  const handlePdf = async () => {
    if (!report.rows.length) return;
    setProblem(null);
    setBusy("pdf");
    try {
      await downloadReportPdf(report, {
        userName: user.name || user.email,
        generatedAt: today,
      });
      setSaved(`${rangeFilename(report.range)}.pdf`);
    } catch (error) {
      console.error("[laporan] gagal membuat PDF:", error);
      setProblem("PDF gagal dibuat. Coba lagi, atau unduh CSV untuk rentang ini.");
    } finally {
      setBusy(null);
    }
  };

  const handleCsv = () => {
    if (!report.rows.length) return;
    const name = `${rangeFilename(report.range)}.csv`;
    downloadCsv(name, buildLedgerCsv(report.rows));
    setSaved(name);
  };

  return (
    <div className="reveal mx-auto max-w-[1180px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Laporan
          </div>
          <h1 className="mt-2.5 text-[27px] display leading-[1.1] sm:text-[34px]">
            Rentang tanggal apa pun
          </h1>
          <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-relaxed text-muted">
            Pilih tanggal mulai dan akhir — tidak harus awal atau akhir bulan,
            tidak harus bulan berjalan. Angkanya dihitung dari{" "}
            {transactions.length} catatan di akunmu, lalu bisa diunduh sebagai PDF
            atau CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!report.rows.length}
            onClick={handleCsv}
          >
            <DownloadSimple size={14} />
            Unduh CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!report.rows.length || busy === "pdf"}
            onClick={handlePdf}
          >
            <FilePdf size={14} />
            {busy === "pdf" ? "Menyusun PDF" : "Unduh PDF"}
          </Button>
        </div>
      </header>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((preset) => {
              const active = activePreset?.key === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-[11.5px] font-medium transition-colors duration-200",
                    active
                      ? "border-pine/50 bg-pine-soft text-ink"
                      : "border-line bg-surface text-muted hover:bg-surface-2",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setSaved(null);
                setProblem(null);
              }}
              aria-label="Tanggal mulai"
              className={dateInputClass}
            />
            <span className="text-[11px] text-faint">sampai</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setSaved(null);
                setProblem(null);
              }}
              aria-label="Tanggal akhir"
              className={dateInputClass}
            />
            {activePreset ? null : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => applyPreset(presets[0])}
              >
                <ArrowCounterClockwise size={13} />
                Bulan ini
              </Button>
            )}
          </div>
        </div>

        {report.bounds ? (
          <p className="mt-2.5 text-[10.5px] text-faint">
            Catatan yang tersimpan: {formatLongDate(report.bounds.from)} –{" "}
            {formatLongDate(report.bounds.to)}. Rentang lain tetap bisa dipilih,
            tetapi hasilnya kosong kalau belum ada catatan di tanggal itu.
          </p>
        ) : null}

        {report.reversed ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-[10px] border border-line bg-surface-2/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
            <WarningCircle size={13} className="mt-px shrink-0 text-clay" />
            Tanggal mulai lebih baru dari tanggal akhir, jadi rentangnya dibalik:
            {` `}
            {formatLongDate(report.range.from)} – {formatLongDate(report.range.to)}.
          </p>
        ) : null}
      </Panel>

      <dl className="grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-line">
        {[
          { label: "Pengeluaran", value: formatIDR(report.expense) },
          { label: "Pemasukan", value: formatIDR(report.income) },
          {
            label: "Selisih",
            value: `${report.net < 0 ? "-" : ""}${formatIDR(Math.abs(report.net))}`,
          },
          {
            label: "Catatan",
            value: `${formatNumber(report.count)} · ${days} hari`,
          },
        ].map((item, index) => (
          <div key={item.label} className={cn("px-1 sm:px-4", index === 0 && "sm:pl-0")}>
            <dt className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint">
              {item.label}
            </dt>
            <dd className="num mt-1.5 truncate text-[13.5px] font-medium">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {saved ? (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <CheckCircle size={13} weight="fill" className="mt-px shrink-0 text-pine" />
          <span>
            Tersimpan sebagai <span className="text-muted">{saved}</span>.
          </span>
        </p>
      ) : null}

      {problem ? (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-clay">
          <WarningCircle size={13} className="mt-px shrink-0" />
          {problem}
        </p>
      ) : null}

      {report.rows.length === 0 ? (
        <Panel className="px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
            <FilePdf size={20} />
          </span>
          <h2 className="mt-4 text-[15px] font-medium tracking-[-0.01em]">
            Tidak ada catatan pada rentang ini
          </h2>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-muted">
            {transactions.length
              ? "Coba geser tanggalnya, atau pilih pintasan di atas."
              : "Akun ini belum punya catatan. Tambahkan lewat Catat manual, scan struk, atau email bank."}
          </p>
          <Link href="/catat" className={buttonStyles({ variant: "secondary" }) +
            " mt-5"}>
            Catat transaksi
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
              <div>
                <h2 className="text-[13.5px] font-medium tracking-[-0.01em]">
                  Rincian transaksi
                </h2>
                <p className="mt-0.5 text-[11px] text-faint">
                  {formatLongDate(report.range.from)} –{" "}
                  {formatLongDate(report.range.to)} · {formatNumber(report.count)}{" "}
                  catatan
                </p>
              </div>
              <span className="num text-[10.5px] text-faint">
                rata-rata {formatIDR(Math.round(report.dailyAverage))}/hari
              </span>
            </div>

            <div className="hidden grid-cols-[86px_minmax(0,1fr)_120px_110px] gap-3 border-b border-line bg-surface-2/40 px-5 py-2 text-[9.5px] font-medium uppercase tracking-[0.11em] text-faint md:grid">
              <span>Tanggal</span>
              <span>Transaksi</span>
              <span>Kategori</span>
              <span className="text-right">Nominal</span>
            </div>

            <ul>
              {preview.map((tx) => {
                const isIncome = tx.direction === "income";
                return (
                  <li
                    key={tx.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0 md:grid-cols-[86px_minmax(0,1fr)_120px_110px] md:px-5"
                  >
                    <span className="hidden text-[11px] text-faint md:block">
                      {formatLongDate(tx.date)}
                      <span className="num mt-0.5 block text-[10px]">{tx.time}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium">
                        {tx.merchant}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-faint">
                        {formatLongDate(tx.date)} · {tx.time}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </span>
                    </span>
                    <span className="hidden truncate text-[11.5px] text-muted md:block">
                      {tx.category
                        ? CATEGORY_META[tx.category].label
                        : isIncome
                          ? "Pemasukan"
                          : "Tanpa kategori"}
                    </span>
                    <span
                      className={cn(
                        "num text-right text-[12.5px] font-medium",
                        isIncome && "text-pine",
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatIDR(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {report.rows.length > preview.length ? (
              <div className="border-t border-line px-4 py-3 md:px-5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
                  Tampilkan {report.rows.length - preview.length} catatan lagi
                </Button>
              </div>
            ) : null}

            <p className="flex items-start gap-1.5 border-t border-line px-4 py-3 text-[10px] leading-relaxed text-faint md:px-5">
              <Info size={12} className="mt-px shrink-0" />
              PDF memuat seluruh {formatNumber(report.count)} catatan pada rentang
              ini, bukan hanya yang tampil di layar.
            </p>
          </Panel>

          <div className="space-y-5">
            <Panel className="p-4 sm:p-5">
              <h2 className="text-[13.5px] font-medium tracking-[-0.01em]">
                Per kategori
              </h2>
              <p className="mt-0.5 text-[11px] text-faint">
                {report.byCategory.length} kategori terpakai
              </p>
              <ul className="mt-3 space-y-2.5">
                {report.byCategory.map((row) => (
                  <li key={row.category ?? "tanpa-kategori"}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11.5px]">{row.label}</span>
                      <span className="num shrink-0 text-[11px] text-muted">
                        {formatIDR(row.amount)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(row.share, 1.5)}%`,
                            backgroundColor: row.category
                              ? CATEGORY_META[row.category].color
                              : "#A08C7C",
                          }}
                        />
                      </span>
                      <span className="num w-[34px] shrink-0 text-right text-[10px] text-faint">
                        {formatPercent(row.share)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-4 sm:p-5">
              <h2 className="text-[13.5px] font-medium tracking-[-0.01em]">Sumber</h2>
              <ul className="mt-3 space-y-2">
                {report.bySource.map((row) => (
                  <li
                    key={row.source}
                    className="flex items-baseline justify-between gap-2 text-[11.5px]"
                  >
                    <span className="truncate text-muted">
                      {row.label}
                      <span className="text-faint"> · {row.count}</span>
                    </span>
                    <span className="num shrink-0">{formatIDR(row.amount)}</span>
                  </li>
                ))}
              </ul>
              {report.biggest ? (
                <p className="mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint">
                  Terbesar: {report.biggest.merchant} ·{" "}
                  {formatIDR(report.biggest.amount)} ·{" "}
                  {formatLongDate(report.biggest.date)}
                </p>
              ) : null}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
