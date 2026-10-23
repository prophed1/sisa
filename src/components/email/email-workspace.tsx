"use client";

import { useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  CopySimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import { formatLongDate } from "@/lib/finance";
import { formatIDR } from "@/lib/format";
import { useLedger } from "@/lib/ledger-store";
import type { CategoryKey, EmailDraft } from "@/lib/types";

interface InboxInfo {
  address: string | null;
  /** Selalu ada; dipakai pengirim webhook yang tidak punya alamat penerusan. */
  token: string;
  webhookConfigured: boolean;
}


const textareaClass =
  "min-h-[170px] w-full resize-y rounded-[12px] border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed outline-none transition-colors placeholder:text-faint/70 focus:border-line-strong";

const inputClass =
  "h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[12.5px] outline-none transition-colors placeholder:text-faint/70 focus:border-line-strong";

/** Satu halaman daftar draf; sama dengan batas di repository. */
const PAGE = 50;
/** Batas atas yang diterima API, supaya satu permintaan tidak terlalu berat. */
const MAX_PAGE = 200;

const RANGES = [
  { label: "3 bulan", days: 90 },
  { label: "6 bulan", days: 180 },
  { label: "12 bulan", days: 365 },
  { label: "24 bulan", days: 730 },
];

export function EmailWorkspace({
  initialDrafts,
  initialTotal,
  initialInbox,
}: {
  initialDrafts: EmailDraft[];
  initialTotal: number;
  initialInbox: InboxInfo;
}) {
  const { refresh } = useLedger();
  const [drafts, setDrafts] = useState<EmailDraft[]>(initialDrafts);
  const [total, setTotal] = useState(initialTotal);
  const [bulkDone, setBulkDone] = useState<number | null>(null);
  const [range, setRange] = useState(RANGES[2].days);
  const [queryCopied, setQueryCopied] = useState(false);
  const [inbox] = useState<InboxInfo>(initialInbox);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  // Kategori pilihan per draf. Kosong berarti biarkan server menebaknya.
  const [picked, setPicked] = useState<Record<string, CategoryKey | "">>({});

  const post = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/email/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as
      | {
          error?: string;
          reason?: string;
          duplicate?: boolean;
          draft?: EmailDraft | null;
          transaction?: unknown;
          existing?: { merchant?: string; date?: string } | null;
          confirmed?: number;
          skipped?: number;
          remaining?: number;
        }
      | null;
    return { response, data };
  };

  /** Ambil ulang halaman pertama; dipakai setelah impor dan saat memuat lagi. */
  const loadPage = async (limit: number) => {
    const response = await fetch(`/api/email/drafts?limit=${limit}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as { drafts: EmailDraft[]; total: number };
  };

  const readPasted = async () => {
    if (!body.trim() || busy) return;
    setBusy("paste");
    setError(null);
    setNotice(null);
    try {
      const { response, data } = await post({
        action: "paste",
        text: body,
        subject: subject.trim() || undefined,
      });
      if (!response.ok) {
        setError(data?.error ?? "Email ini tidak bisa dibaca.");
        return;
      }
      setBody("");
      setSubject("");
      if (data?.draft) {
        const created = data.draft;
        setDrafts((current) =>
          current.some((item) => item.id === created.id)
            ? current
            : [created, ...current],
        );
        setTotal((current) => current + 1);
      }
      setNotice(
        data?.duplicate
          ? data.reason ??
            "Email ini sudah pernah dibaca; drafnya tidak digandakan."
          : "Draf ditambahkan. Periksa nilainya sebelum disimpan.",
      );
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (draft: EmailDraft) => {
    if (busy) return;
    setBusy(draft.id);
    setError(null);
    setNotice(null);
    const category = picked[draft.id] || undefined;
    try {
      const { response, data } = await post({
        action: "confirm",
        id: draft.id,
        ...(category ? { category } : {}),
      });
      if (!response.ok) {
        setError("Draf ini tidak bisa disimpan. Muat ulang lalu coba lagi.");
        return;
      }
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setTotal((current) => Math.max(current - 1, 0));

      if (data?.duplicate) {
        const existing = data.existing;
        setNotice(
          existing?.merchant
            ? `${existing.merchant} sebesar ${formatIDR(
                draft.amount,
              )} sudah tercatat di catatan, jadi tidak digandakan.`
            : "Mutasi ini sudah tercatat, jadi tidak digandakan.",
        );
        await refresh();
        return;
      }
      setNotice(
        `${draft.merchant} sebesar ${formatIDR(draft.amount)} tersimpan sebagai transaksi${
          category ? ` (${CATEGORY_META[category].shortLabel})` : ""
        }.`,
      );
      await refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (draft: EmailDraft) => {
    if (busy) return;
    setBusy(draft.id);
    setError(null);
    setNotice(null);
    try {
      const { response } = await post({ action: "dismiss", id: draft.id });
      if (!response.ok) {
        setError("Draf ini tidak bisa diabaikan. Coba lagi.");
        return;
      }
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setTotal((current) => Math.max(current - 1, 0));
      setNotice("Draf diabaikan. Tidak ada yang masuk ke catatan.");
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Simpan semua draf yang menunggu, termasuk hasil impor riwayat. Server
   * memproses beberapa draf per permintaan, jadi klien mengulang sampai sisa
   * nol sambil menampilkan kemajuan.
   */
  const confirmAll = async () => {
    if (busy || total === 0) return;
    setBusy("bulk");
    setError(null);
    setNotice(null);
    setBulkDone(0);

    const target = total;
    let confirmed = 0;
    let skipped = 0;
    let remaining = target;
    let failed = false;

    try {
      while (remaining > 0) {
        const { response, data } = await post({ action: "confirm-all" });
        if (!response.ok) {
          setError("Sebagian draf belum bisa disimpan. Coba lagi.");
          failed = true;
          break;
        }

        const processed = (data?.confirmed ?? 0) + (data?.skipped ?? 0);
        confirmed += data?.confirmed ?? 0;
        skipped += data?.skipped ?? 0;
        remaining = data?.remaining ?? 0;
        setBulkDone(target - remaining);

        // Server yang tidak memajukan apa pun tidak boleh membuat putaran
        // ini berjalan tanpa henti.
        if (processed === 0) break;
      }
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      failed = true;
    }

    try {
      const page = await loadPage(
        Math.min(Math.max(drafts.length, PAGE), MAX_PAGE),
      ).catch(() => null);
      if (page) {
        setDrafts(page.drafts);
        setTotal(page.total);
      }
      if (confirmed > 0 || skipped > 0) await refresh();
    } finally {
      setBulkDone(null);
      setBusy(null);
    }

    if (!failed && (confirmed > 0 || skipped > 0)) {
      setNotice(
        `${confirmed} draf tersimpan sebagai transaksi${
          skipped > 0
            ? `, ${skipped} dilewati karena mutasinya sudah tercatat`
            : ""
        }.`,
      );
    }
  };

  /** Draf lama bisa lebih dari satu halaman; muat sisanya tanpa pindah layar. */
  const loadMore = async () => {
    if (busy) return;
    setBusy("more");
    setError(null);
    try {
      const page = await loadPage(
        Math.min(drafts.length + PAGE, MAX_PAGE),
      );
      if (!page) {
        setError("Draf lain tidak bisa dimuat. Coba lagi.");
        return;
      }
      setDrafts(page.drafts);
      setTotal(page.total);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const copyQuery = async () => {
    try {
      await navigator.clipboard.writeText(historyQuery);
      setQueryCopied(true);
      window.setTimeout(() => setQueryCopied(false), 2000);
    } catch {
      setError("Baris pencarian tidak bisa disalin otomatis; salin manual.");
    }
  };

  const copyAddress = async () => {
    if (!inbox?.address) return;
    try {
      await navigator.clipboard.writeText(inbox.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Alamat tidak bisa disalin otomatis; salin manual dari kotak di atas.");
    }
  };

  const historyQuery = `from:bankbsi.co.id -label:sisa-terkirim newer_than:${range}d`;

  const copyToken = async () => {
    if (!inbox?.token) return;
    try {
      await navigator.clipboard.writeText(inbox.token);
      setTokenCopied(true);
      window.setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      setError("Token tidak bisa disalin otomatis; salin manual dari kotak di atas.");
    }
  };

  return (
    <div className="reveal mx-auto max-w-[1120px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Email bank
          </div>
          <h1 className="mt-2.5 max-w-[30ch] text-[27px] display leading-[1.1] sm:text-[34px]">
            Mutasi BSI masuk tanpa disalin.
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-[12.5px] leading-relaxed text-muted">
            Email notifikasi dibaca menjadi draf. Tidak ada yang masuk ke catatan
            sebelum kamu menekan simpan — jadi email promosi atau nominal yang
            salah baca tidak mengotori ledger.
          </p>
        </div>
        <SaveStatusBadge className="h-[26px] px-2.5" />
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <Panel>
            <PanelHeader
              title="Tempel email bank"
              caption="Bisa dipakai sekarang, tanpa menyiapkan penerusan email."
              action={<Badge tone="outline">Manual</Badge>}
            />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <label className="flex flex-col gap-2">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-muted">
                  Subjek <span className="normal-case tracking-normal text-faint">opsional</span>
                </span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Notifikasi Transaksi BSI"
                  className={inputClass}
                  maxLength={200}
                />
              </label>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-muted">
                  Isi email
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={"Tempel seluruh isi email di sini...\n\nNominal, tanggal, dan nama merchant akan dicari otomatis."}
                  className={textareaClass}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={readPasted}
                  disabled={!body.trim() || busy !== null}
                >
                  {busy === "paste" ? (
                    <>
                      <CircleNotch size={14} className="animate-spin" />
                      Membaca…
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt size={14} />
                      Baca email
                    </>
                  )}
                </Button>
                <span className="text-[10px] text-faint">
                  Tidak ada email yang dikirim keluar.
                </span>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-[11px] border border-line bg-clay-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-clay"
                >
                  <WarningCircle size={14} className="mt-px shrink-0" />
                  {error}
                </p>
              ) : null}

              {notice ? (
                <p className="mt-3 flex items-start gap-2 rounded-[11px] border border-line bg-pine-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">
                  <CheckCircle size={14} className="mt-px shrink-0 text-pine" />
                  {notice}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Menunggu konfirmasi"
              caption="Draf dari email yang sudah dibaca, belum menjadi transaksi."
              actionInline
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={total ? "sand" : "outline"}>{total}</Badge>
                  {total > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={confirmAll}
                      disabled={busy !== null}
                    >
                      {busy === "bulk" ? (
                        <>
                          <CircleNotch size={12} className="animate-spin" />
                          <span className="num">
                            {bulkDone ?? 0}/{total}
                          </span>
                        </>
                      ) : (
                        "Simpan semua"
                      )}
                    </Button>
                  ) : null}
                </div>
              }
            />

            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {drafts.length === 0 ? (
                <div className="rounded-[13px] border border-dashed border-line bg-canvas px-4 py-5">
                  <p className="text-[12px] leading-relaxed text-muted">
                    Belum ada email yang menunggu. Tempel isi email di atas, atau
                    teruskan email bank ke alamat penerusan di samping.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {drafts.map((draft) => {
                    const income = draft.direction === "income";
                    return (
                      <li key={draft.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <span
                            className={[
                              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-[9px] border",
                              income
                                ? "border-pine/30 bg-pine-soft text-pine"
                                : "border-line bg-surface-2 text-muted",
                            ].join(" ")}
                          >
                            <EnvelopeSimple size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                              {draft.merchant}
                            </p>
                            <p className="num mt-0.5 text-[10.5px] text-faint">
                              {formatLongDate(draft.date)} · {draft.time} ·{" "}
                              {income ? "Pemasukan" : "Pengeluaran"}
                            </p>
                            {draft.subject ? (
                              <p className="mt-0.5 truncate text-[10px] text-faint/80">
                                {draft.subject}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={[
                              "num shrink-0 text-[12.5px] font-medium",
                              income ? "text-pine" : "text-ink",
                            ].join(" ")}
                          >
                            {income ? "+" : "−"}
                            {formatIDR(draft.amount)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-11">
                          <label className="flex items-center">
                            <span className="sr-only">
                              Kategori untuk {draft.merchant}
                            </span>
                            <select
                              value={picked[draft.id] ?? ""}
                              disabled={busy !== null}
                              onChange={(event) => {
                                const value = event.target.value as
                                  | CategoryKey
                                  | "";
                                setPicked((current) => ({
                                  ...current,
                                  [draft.id]: value,
                                }));
                              }}
                              className="h-7 rounded-[8px] border border-line bg-surface px-2 text-[11px] text-muted outline-none transition-colors focus:border-line-strong disabled:opacity-60"
                            >
                              <option value="">Kategori otomatis</option>
                              {CATEGORY_ORDER.map((key) => (
                                <option key={key} value={key}>
                                  {CATEGORY_META[key].shortLabel}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busy !== null}
                            onClick={() => confirm(draft)}
                          >
                            {busy === draft.id ? (
                              <>
                                <CircleNotch size={12} className="animate-spin" />
                                Menyimpan
                              </>
                            ) : (
                              "Simpan"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy !== null}
                            onClick={() => dismiss(draft)}
                          >
                            Abaikan
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {drafts.length < total ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="num text-[10.5px] text-faint">
                    {drafts.length} dari {total} draf
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadMore}
                    disabled={busy !== null}
                  >
                    {busy === "more" ? (
                      <>
                        <CircleNotch size={12} className="animate-spin" />
                        Memuat
                      </>
                    ) : (
                      `Muat ${Math.min(PAGE, total - drafts.length)} lagi`
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-5 xl:col-span-5">
          <Panel className="flex flex-col">
            <PanelHeader
              title="Alamat penerusan"
              caption="Satu alamat khusus untuk akun ini."
            />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {inbox?.address ? (
                <>
                  <p className="text-[11.5px] leading-relaxed text-muted">
                    Teruskan email notifikasi BSI ke alamat ini. Setiap email yang
                    masuk langsung menjadi draf di halaman ini.
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-[11px] border border-line bg-canvas px-3 py-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted">
                      {inbox.address}
                    </code>
                    <Button
                      size="smIcon"
                      variant="ghost"
                      aria-label="Salin alamat penerusan"
                      onClick={copyAddress}
                    >
                      <CopySimple size={13} />
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-faint">
                    {copied
                      ? "Alamat tersalin."
                      : "Alamat ini hanya menerima email; tidak bisa dipakai membalas."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11.5px] leading-relaxed text-muted">
                    Alamat khusus belum aktif karena{" "}
                    <code className="font-mono text-[10.5px] text-ink">
                      EMAIL_INBOUND_DOMAIN
                    </code>{" "}
                    belum diisi. Skrip Gmail tetap bisa mengirim langsung memakai
                    token ini.
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-[11px] border border-line bg-canvas px-3 py-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted">
                      {inbox?.token ?? "—"}
                    </code>
                    <Button
                      size="smIcon"
                      variant="ghost"
                      aria-label="Salin token penerusan"
                      onClick={copyToken}
                    >
                      <CopySimple size={13} />
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-faint">
                    {tokenCopied
                      ? "Token tersalin."
                      : "Token ini dipakai skrip penerusan; panduannya ada di docs/penerusan-gmail.md."}
                  </p>
                </>
              )}

              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-[10px] text-faint hover:text-muted">
                  Detail untuk penyedia penerusan email
                </summary>
                <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-faint">
                  <p>
                    Webhook:{" "}
                    <code className="font-mono text-muted">
                      POST /api/email/inbound
                    </code>
                  </p>
                  <p>
                    Header wajib:{" "}
                    <code className="font-mono text-muted">
                      x-inbound-secret
                    </code>{" "}
                    — nilainya sama dengan{" "}
                    <code className="font-mono text-muted">
                      EMAIL_INBOUND_SECRET
                    </code>
                    .
                  </p>
                  <p>
                    Menerima JSON atau form dengan kolom{" "}
                    <code className="font-mono text-muted">to</code>,{" "}
                    <code className="font-mono text-muted">from</code>,{" "}
                    <code className="font-mono text-muted">subject</code>, dan{" "}
                    <code className="font-mono text-muted">text</code>.
                  </p>
                </div>
              </details>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Impor riwayat"
              caption="Menyusul mutasi lama, bukan hanya yang masuk setelah akun dibuat."
            />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-muted">
                  Rentang email
                </span>
                <select
                  value={range}
                  onChange={(event) => setRange(Number(event.target.value))}
                  className="h-8 rounded-[8px] border border-line bg-surface px-2 text-[11px] text-muted outline-none transition-colors focus:border-line-strong"
                >
                  {RANGES.map((option) => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Ganti baris{" "}
                <code className="font-mono text-[10.5px] text-ink">PENCARIAN</code>{" "}
                di skrip Apps Script dengan baris di bawah, lalu jalankan{" "}
                <code className="font-mono text-[10.5px] text-ink">
                  forwardBankEmails
                </code>
                {" "}berulang.
              </p>

              <div className="mt-2.5 flex items-start gap-2 rounded-[11px] border border-line bg-canvas px-3 py-2">
                <code className="min-w-0 flex-1 break-all font-mono text-[10px] leading-relaxed text-muted">
                  {historyQuery}
                </code>
                <Button
                  size="smIcon"
                  variant="ghost"
                  aria-label="Salin baris pencarian"
                  onClick={copyQuery}
                >
                  <CopySimple size={13} />
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
                {queryCopied
                  ? "Baris pencarian tersalin."
                  : "Satu putaran membaca 20 utas; ulangi sampai log berbunyi utas ditemukan: 0."}
              </p>

              <ol className="mt-3 space-y-2 border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted">
                <li className="flex items-start gap-2">
                  <span className="num mt-[1px] w-3 shrink-0 font-mono text-[9.5px] text-faint">
                    1
                  </span>
                  Jalankan skrip sekali. Email yang mutasinya sudah ada di catatan
                  dilewati otomatis, termasuk yang dulu kamu input manual.
                </li>
                <li className="flex items-start gap-2">
                  <span className="num mt-[1px] w-3 shrink-0 font-mono text-[9.5px] text-faint">
                    2
                  </span>
                  Periksa beberapa draf teratas sebelum menyimpan banyak sekaligus.
                </li>
                <li className="flex items-start gap-2">
                  <span className="num mt-[1px] w-3 shrink-0 font-mono text-[9.5px] text-faint">
                    3
                  </span>
                  Tekan Simpan semua di panel Menunggu konfirmasi; sisanya bisa
                  dimuat lagi dengan tombol Muat.
                </li>
              </ol>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Cara kerjanya"
              caption="Tiga langkah, dan dua di antaranya bisa kamu periksa."
            />
            <ol className="space-y-3 px-5 pb-5 text-[11.5px] leading-relaxed text-muted sm:px-6 sm:pb-6">
              {[
                "Email notifikasi bank masuk ke alamat penerusan, atau kamu tempel isinya sendiri.",
                "Nominal, tanggal, arah, dan merchant dibaca dari isi email lalu disimpan sebagai draf.",
                "Kamu menekan Simpan; baru setelah itu catatan muncul di dasbor dan analisis.",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="num mt-[1px] grid size-5 shrink-0 place-items-center rounded-full border border-line bg-canvas font-mono text-[9.5px] text-faint">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
