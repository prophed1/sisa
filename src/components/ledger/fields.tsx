"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/data/categories";
import type { CategoryKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FieldShell({
  label,
  helper,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: string;
  helper?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.11em] text-muted"
      >
        {label}
        {optional ? (
          <span className="text-[10px] normal-case tracking-normal text-faint">
            opsional
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] leading-relaxed text-clay">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[11px] leading-relaxed text-faint">{helper}</p>
      ) : null}
    </div>
  );
}

/** Ubah "1.240.000" jadi 1240000. */
export function parseAmount(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Ubah 1240000 jadi "1.240.000" untuk ditampilkan di input. */
export function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AmountField({
  value,
  onChange,
  error,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const amount = parseAmount(value);

  return (
    <FieldShell
      label="Nominal"
      htmlFor={id}
      error={error}
      helper="Masukkan angka saja, titik ribuan ditambahkan otomatis."
    >
      <div
        className={cn(
          "flex h-[52px] items-center gap-2.5 rounded-[12px] border bg-surface px-3.5 transition-colors",
          invalid
            ? "border-clay/70 focus-within:border-clay"
            : "border-line focus-within:border-line-strong",
        )}
      >
        <span className="num shrink-0 text-[15px] font-medium text-faint">
          Rp
        </span>
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(formatAmountInput(event.target.value))}
          placeholder="0"
          className="num h-full min-w-0 flex-1 bg-transparent text-[21px] font-medium tracking-[-0.02em] outline-none placeholder:text-faint/60"
        />
        <span className="num shrink-0 text-[10.5px] text-faint">
          {amount > 0 ? "ok" : "wajib"}
        </span>
      </div>
    </FieldShell>
  );
}

export function CategoryField({
  value,
  onChange,
  error,
}: {
  value: CategoryKey | null;
  onChange: (category: CategoryKey) => void;
  error?: string;
}) {
  return (
    <FieldShell
      label="Kategori"
      error={error}
      helper="Kategori menentukan tampilan donat dan anggaran."
    >
      <div
        role="radiogroup"
        aria-label="Kategori pengeluaran"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {CATEGORY_ORDER.map((category) => {
          const meta = CATEGORY_META[category];
          const selected = value === category;
          return (
            <label
              key={category}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[11px] border px-2.5 py-2 transition-colors duration-200",
                selected
                  ? "border-pine/60 bg-pine-soft text-ink"
                  : "border-line bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="kategori"
                value={category}
                checked={selected}
                onChange={() => onChange(category)}
                className="sr-only"
              />
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-[8px] border",
                  selected
                    ? "border-pine/40 bg-surface text-pine"
                    : "border-line bg-canvas text-faint",
                )}
              >
                <CategoryIcon category={category} size={14} />
              </span>
              <span className="min-w-0 truncate text-[11.5px] font-medium">
                {meta.shortLabel}
              </span>
              {selected ? (
                <span className="ml-auto size-[5px] shrink-0 rounded-full bg-pine" />
              ) : null}
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function DateField({
  value,
  onChange,
  error,
  helper,
  min,
  max,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
}) {
  const id = useId();

  return (
    <FieldShell label="Tanggal" htmlFor={id} error={error} helper={helper}>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-[10px] border bg-surface px-3 text-[13px] outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]",
          invalid ? "border-clay/70" : "border-line focus:border-line-strong",
        )}
      />
    </FieldShell>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  optional,
  maxLength,
  invalid,
  id: providedId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  maxLength?: number;
  invalid?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      error={error}
      helper={helper}
      optional={optional}
    >
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-[10px] border bg-surface px-3 text-[13px] outline-none transition-colors placeholder:text-faint/80",
          invalid ? "border-clay/70" : "border-line focus:border-line-strong",
        )}
      />
    </FieldShell>
  );
}
