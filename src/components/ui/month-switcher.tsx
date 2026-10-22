"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLedger } from "@/lib/ledger-store";
import {
  earliestMonthKey,
  latestMonthKey,
  monthKeyOf,
  monthShortLabel,
  shiftMonthKey,
} from "@/lib/period";
import { cn } from "@/lib/utils";

const buttonClass =
  "grid size-[25px] place-items-center rounded-full text-faint transition-colors duration-150 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

/**
 * Pemilih bulan untuk dasbor dan pengaturan. Batasnya data yang ada: tidak
 * masuk ke bulan sebelum catatan pertama, dan hanya satu bulan ke depan —
 * cukup untuk menyiapkan anggaran bulan berikutnya.
 */
export function MonthSwitcher({ className }: { className?: string }) {
  const { month, setMonth, today, transactions, period } = useLedger();

  const min = earliestMonthKey(transactions, today);
  const max = latestMonthKey(today);
  const current = monthKeyOf(today);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        role="group"
        aria-label="Pilih bulan"
        className="inline-flex h-[26px] items-center rounded-full border border-line bg-surface p-0.5"
      >
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          disabled={month <= min}
          onClick={() => setMonth(shiftMonthKey(month, -1))}
          className={buttonClass}
        >
          <CaretLeft size={12} weight="bold" />
        </button>
        <span
          aria-live="polite"
          className="min-w-[78px] px-1 text-center text-[10.5px] font-medium tracking-[0.01em] text-muted"
        >
          {monthShortLabel(month)}
        </span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          disabled={month >= max}
          onClick={() => setMonth(shiftMonthKey(month, 1))}
          className={buttonClass}
        >
          <CaretRight size={12} weight="bold" />
        </button>
      </div>

      {period.isCurrent ? null : (
        <button
          type="button"
          onClick={() => setMonth(current)}
          className="h-[26px] rounded-full border border-line bg-transparent px-2.5 text-[10.5px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Bulan ini
        </button>
      )}
    </div>
  );
}
