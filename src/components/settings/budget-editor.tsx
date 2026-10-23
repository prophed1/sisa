"use client";

import {
  ArrowCounterClockwise,
  CopySimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { formatAmountInput, parseAmount } from "@/components/ledger/fields";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import { formatIDR, formatPercent, percent } from "@/lib/format";
import {
  copyBudgetFrom,
  resetBudget,
  setBudgetLimit,
  setBudgetTotal,
  useLedger,
  useLedgerSummary,
} from "@/lib/ledger-store";
import { monthLongName } from "@/lib/period";
import { cn } from "@/lib/utils";

/* `w-0` + `flex-1`: lebar bawaan input (20 karakter) tidak boleh menjadi
 * lebar minimum kartu, atau halaman melebar di ponsel. */
const inputClass =
  "num h-9 w-0 min-w-0 flex-1 rounded-[9px] border border-line bg-surface px-2.5 text-[12.5px] outline-none transition-colors placeholder:font-sans placeholder:text-[11.5px] placeholder:text-faint/80 focus:border-line-strong";

export function BudgetEditor() {
  const { budget, budgets, month, period } = useLedger();
  const summary = useLedgerSummary();
  const previousBudget = budgets[period.previousKey];
  const hasBudget = budgets[month] !== undefined;

  const allocated = CATEGORY_ORDER.reduce(
    (total, category) => total + (budget.limits[category] ?? 0),
    0,
  );
  const unallocated = budget.total - allocated;
  const spending = new Map(
    summary.byCategory.map((entry) => [entry.category, entry.amount]),
  );
  const remaining = summary.budgetLeft;
  const noBudget = budget.total === 0;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Anggaran bulanan"
        caption={`Angka ini hanya berlaku untuk ${period.label}. Bulan lain punya anggarannya sendiri.`}
        actionInline
        action={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {!hasBudget && previousBudget ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyBudgetFrom(period.previousKey)}
                title={`Salin total dan batas kategori dari ${monthLongName(period.previousKey)}`}
              >
                <CopySimple size={13} />
                Salin {monthLongName(period.previousKey)}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={resetBudget}
              title="Kembalikan anggaran bulan ini ke nilai awal"
            >
              <ArrowCounterClockwise size={14} />
              Anggaran awal
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="rounded-[14px] border border-line bg-canvas px-4 py-3.5">
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-muted">
              Total anggaran {period.month} {period.year}
            </span>
            <span className="flex items-center gap-2">
              <span className="num shrink-0 text-[15px] font-medium text-faint">
                Rp
              </span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={budget.total ? formatAmountInput(String(budget.total)) : ""}
                onChange={(event) =>
                  setBudgetTotal(parseAmount(event.target.value))
                }
                placeholder="0"
                className="num h-9 w-0 min-w-0 flex-1 border-b border-line-strong bg-transparent text-[21px] font-medium tracking-[-0.02em] outline-none placeholder:text-faint/60 focus:border-pine"
              />
            </span>
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[10.5px] text-faint">
            <span>
              Terpakai{" "}
              <span className="num text-muted">
                {formatIDR(summary.spending)}
              </span>{" "}
              ({formatPercent(percent(summary.spending, budget.total))})
            </span>
            <span>
              {remaining >= 0 ? "Sisa" : "Lewat"}{" "}
              <span
                className={cn("num", remaining >= 0 ? "text-muted" : "text-clay")}
              >
                {formatIDR(Math.abs(remaining))}
              </span>
            </span>
          </div>
        </div>

        {noBudget ? (
          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-clay">
            <WarningCircle size={12} weight="fill" className="mt-px shrink-0" />
            Total anggaran masih nol, jadi persentase dan proyeksi belum berarti.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3.5">
          <p className="text-[11.5px] text-muted">
            Alokasi kategori{" "}
            <span className="num text-ink">{formatIDR(allocated)}</span>
          </p>
          <p
            className={cn(
              "num text-[10.5px]",
              unallocated < 0 ? "text-clay" : "text-faint",
            )}
          >
            {unallocated < 0
              ? `Lebih ${formatIDR(Math.abs(unallocated))} dari total`
              : `Belum dialokasikan ${formatIDR(unallocated)}`}
          </p>
        </div>

        <ul className="mt-2 divide-y divide-line/70">
          {CATEGORY_ORDER.map((category) => {
            const meta = CATEGORY_META[category];
            const limit = budget.limits[category];
            const used = spending.get(category) ?? 0;
            const ratio = limit ? percent(used, limit) : 0;
            const over = Boolean(limit && used > limit);

            return (
              <li
                key={category}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[12px] font-medium">
                    <span
                      aria-hidden
                      className="size-[6px] shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate">{meta.shortLabel}</span>
                    {over ? (
                      <WarningCircle
                        size={11}
                        weight="fill"
                        className="shrink-0 text-clay"
                        aria-label="Melewati batas"
                      />
                    ) : null}
                  </p>
                  <p className="num mt-0.5 pl-[14px] text-[10px] text-faint">
                    terpakai {formatIDR(used)}
                    {limit ? ` · ${formatPercent(ratio)} dari batas` : ""}
                  </p>
                </div>

                <label className="flex items-center gap-2 sm:w-[186px] sm:shrink-0">
                  <span className="num shrink-0 text-[10.5px] text-faint">Rp</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Batas anggaran ${meta.label}`}
                    value={limit ? formatAmountInput(String(limit)) : ""}
                    onChange={(event) => {
                      const amount = parseAmount(event.target.value);
                      setBudgetLimit(category, amount > 0 ? amount : null);
                    }}
                    placeholder="Tanpa batas"
                    className={inputClass}
                  />
                </label>
              </li>
            );
          })}
        </ul>

        <p className="mt-auto border-t border-line pt-3 text-[10px] leading-relaxed text-faint">
          Kosongkan kolom batas untuk menghapusnya. Anggaran tersimpan otomatis
          ke akunmu, terpisah untuk setiap bulan.
        </p>
      </div>
    </Panel>
  );
}
