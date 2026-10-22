"use client";

import type { ChangeEvent } from "react";
import { cn } from "@/lib/utils";

export interface RangePreset {
  key: string;
  label: string;
  from: string;
  to: string;
}

export function RangeFilter({
  from,
  to,
  min,
  max,
  presets,
  activeKey,
  onSelect,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  min: string;
  max: string;
  presets: RangePreset[];
  activeKey: string | null;
  onSelect: (from: string, to: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const handle = (setter: (value: string) => void) => (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    if (value) setter(value);
  };

  const inputClass =
    "h-8 w-[128px] rounded-[8px] border border-line bg-surface px-2 text-[11.5px] text-ink [color-scheme:light] transition-colors hover:border-line-strong focus:border-pine dark:[color-scheme:dark]";

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow-panel)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-3.5">
      <div
        role="group"
        aria-label="Rentang cepat"
        className="inline-flex rounded-[9px] border border-line bg-surface-2 p-[2px]"
      >
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={activeKey === preset.key}
            onClick={() => onSelect(preset.from, preset.to)}
            className={cn(
              "h-[27px] rounded-[7px] px-2.5 text-[11px] font-medium transition-colors duration-200",
              activeKey === preset.key
                ? "bg-surface text-ink shadow-[var(--shadow-panel)]"
                : "text-faint hover:text-muted",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10.5px] text-faint">
          Dari
          <input
            type="date"
            value={from}
            min={min}
            max={to}
            onChange={handle(onFrom)}
            className={inputClass}
          />
        </label>
        <span aria-hidden className="text-[10.5px] text-faint">
          –
        </span>
        <label className="flex items-center gap-1.5 text-[10.5px] text-faint">
          Sampai
          <input
            type="date"
            value={to}
            min={from}
            max={max}
            onChange={handle(onTo)}
            className={inputClass}
          />
        </label>
      </div>

      <span className="text-[10.5px] text-faint sm:ml-auto">
        {activeKey === null ? "Rentang kustom" : "Rentang cepat"}
      </span>
    </div>
  );
}
