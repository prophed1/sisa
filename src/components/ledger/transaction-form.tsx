"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import {
  AmountField,
  CategoryField,
  DateField,
  TextField,
  parseAmount,
} from "@/components/ledger/fields";
import { Button } from "@/components/ui/button";
import { suggestCategory } from "@/lib/categorize";
import { CATEGORY_META } from "@/lib/data/categories";
import { useLedger } from "@/lib/ledger-store";
import type {
  CategoryKey,
  Transaction,
  TransactionDirection,
  TransactionDraft,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const ENTRY_FORM_ID = "entry-form";

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

export function TransactionForm({
  mode = "create",
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  mode?: "create" | "edit";
  initial?: Transaction;
  onSubmit: (draft: TransactionDraft) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [direction, setDirection] = useState<TransactionDirection>(
    initial?.direction ?? "expense",
  );
  const [amount, setAmount] = useState(
    initial ? initial.amount.toLocaleString("id-ID") : "",
  );
  const { transactions, today } = useLedger();
  const [date, setDate] = useState(initial?.date ?? today);
  const [category, setCategory] = useState<CategoryKey | null>(
    initial?.category ?? null,
  );
  const [description, setDescription] = useState(initial?.merchant ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const isIncome = direction === "income";

  // Tebakan muncul selama kategori belum dipilih, dan datang lagi saat
  // deskripsinya berubah menjadi merchant lain.
  const merchantKey = description.trim().toLowerCase();
  const guess = useMemo(() => {
    if (isIncome || category || dismissedFor === merchantKey) return null;
    return suggestCategory(description, transactions);
  }, [category, description, dismissedFor, isIncome, merchantKey, transactions]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = parseAmount(amount);
    const nextErrors: Record<string, string> = {};

    if (value <= 0) nextErrors.amount = "Masukkan nominal lebih dari Rp 0.";
    if (!isIncome && !category) nextErrors.category = "Pilih satu kategori.";
    if (!description.trim())
      nextErrors.description = "Tulis deskripsi singkat transaksi.";
    if (!date) {
      nextErrors.date = "Pilih tanggal transaksi.";
    } else {
      const year = Number(date.slice(0, 4));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || year < 2000 || year > 2100) {
        nextErrors.date = "Tanggal di luar rentang yang masuk akal.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      date,
      time: initial?.time ?? currentTime(),
      merchant: description.trim(),
      note: note.trim() || undefined,
      category: isIncome ? null : category,
      amount: value,
      direction,
      source: initial?.source ?? "manual",
    });
  };

  return (
    <form id={ENTRY_FORM_ID} onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted">
          Jenis transaksi
        </span>
        <div
          role="group"
          aria-label="Jenis transaksi"
          className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]"
        >
          {(
            [
              { value: "expense", label: "Pengeluaran", icon: ArrowUpRight },
              { value: "income", label: "Pemasukan", icon: ArrowDownLeft },
            ] as const
          ).map((option) => {
            const active = direction === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDirection(option.value);
                  setErrors({});
                }}
                className={cn(
                  "relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-medium transition-colors duration-200",
                  active ? "text-ink" : "text-faint hover:text-muted",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="entry-direction"
                    className="absolute inset-0 rounded-[9px] border border-line bg-surface shadow-[var(--shadow-panel)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon size={13} className="relative z-10" />
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AmountField
        value={amount}
        onChange={setAmount}
        error={errors.amount}
        invalid={Boolean(errors.amount)}
        autoFocus={mode === "create"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField
          value={date}
          onChange={setDate}
          error={errors.date}
          invalid={Boolean(errors.date)}
          helper="Boleh tanggal bulan lalu atau bulan mendatang."
        />
        <TextField
          label="Deskripsi"
          value={description}
          onChange={setDescription}
          placeholder="Contoh: Toko Kopi Tuku"
          error={errors.description}
          invalid={Boolean(errors.description)}
          maxLength={60}
          helper="Nama merchant atau keperluannya."
        />
      </div>

      {isIncome ? (
        <div className="rounded-[12px] border border-line bg-surface-2/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
          Pemasukan tidak memakai kategori pengeluaran. Nilainya masuk ke
          ringkasan pemasukan dan sisa saldo bulan ini.
        </div>
      ) : (
        <>
          <CategoryField
            value={category}
            onChange={setCategory}
            error={errors.category}
          />
          {guess ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-[12px] border border-pine/40 bg-pine-soft px-3.5 py-2.5">
              <Sparkle size={13} className="shrink-0 text-pine" />
              <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-ink">
                {guess.origin === "history"
                  ? "Mirip catatan sebelumnya: "
                  : "Dari nama merchant: "}
                <span className="font-medium">
                  {CATEGORY_META[guess.category].label}
                </span>
                {guess.origin === "history" && guess.support > 1
                  ? ` (${guess.support}× sebelumnya)`
                  : ""}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCategory(guess.category);
                    setErrors((prev) => ({ ...prev, category: "" }));
                  }}
                >
                  Pakai
                </Button>
                <Button
                  size="smIcon"
                  variant="ghost"
                  aria-label="Abaikan tebakan kategori"
                  onClick={() => setDismissedFor(merchantKey)}
                >
                  <X size={13} />
                </Button>
              </span>
            </div>
          ) : null}
        </>
      )}

      <TextField
        label="Catatan tambahan"
        optional
        value={note}
        onChange={setNote}
        placeholder="Contoh: kopi pagi bareng tim"
        maxLength={80}
        helper="Membantu saat mencari transaksi nanti."
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button type="submit" variant="primary">
          {submitLabel ?? (mode === "edit" ? "Simpan perubahan" : "Simpan transaksi")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
        <span className="ml-auto hidden text-[10.5px] text-faint sm:block">
          Tersimpan di akunmu
        </span>
      </div>
    </form>
  );
}
