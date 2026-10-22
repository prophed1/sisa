"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import type { RangeAnalysis } from "@/lib/analytics";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDelta, formatIDR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CategoryBreakdown({ analysis }: { analysis: RangeAnalysis }) {
  const categories = analysis.categories;
  const top = categories[0] ?? null;
  const window = analysis.previousWindow;
  const mover = categories.reduce<RangeAnalysis["categories"][number] | null>(
    (best, entry) =>
      entry.delta === null || Math.abs(entry.delta) < 1
        ? best
        : !best ||
            best.delta === null ||
            Math.abs(entry.delta) > Math.abs(best.delta)
          ? entry
          : best,
    null,
  );

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Ke mana uang pergi"
        caption={
          analysis.spending
            ? `Dari ${formatIDR(analysis.spending)} pengeluaran`
            : `Belum ada pengeluaran pada ${analysis.label}`
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        {categories.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted">
            Rincian kategori akan muncul setelah pengeluaran pertama pada
            rentang ini.
          </p>
        ) : (
          <ul className="space-y-[11px]">
            {categories.map((entry) => {
              const meta = CATEGORY_META[entry.category];
              return (
                <li key={entry.category}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-muted">
                      <span
                        aria-hidden
                        className="size-[6px] shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="truncate">{meta.shortLabel}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {entry.delta !== null && window ? (
                        <span
                          className={cn(
                            "num text-[10px]",
                            entry.delta > 0 ? "text-clay" : "text-pine",
                          )}
                          title={`Dibanding ${window.label}: ${formatIDR(
                            entry.previous,
                          )}`}
                        >
                          {formatDelta(entry.delta)}
                        </span>
                      ) : null}
                      <span className="num text-[11.5px] text-ink">
                        {formatIDR(entry.amount)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2.5 pl-[14px]">
                    <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${Math.max(entry.share, 1.5)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </span>
                    <span className="num w-[34px] text-right text-[9.5px] text-faint">
                      {formatPercent(entry.share)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {top ? (
          <div className="mt-auto border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint">
            <p>
              <span className="text-muted">
                {CATEGORY_META[top.category].shortLabel}
              </span>{" "}
              menyerap {formatPercent(top.share)} dari periode ini — rata-rata{" "}
              {formatIDR(top.average)} per transaksi.
            </p>
            {mover && window ? (
              <p className="mt-1">
                <span className="text-muted">
                  {CATEGORY_META[mover.category].shortLabel}
                </span>{" "}
                {mover.delta && mover.delta > 0 ? "naik" : "turun"}{" "}
                {formatDelta(mover.delta ?? 0).replace(/^[+−]/, "")} dibanding{" "}
                {window.label}, dari {formatIDR(mover.previous)} menjadi{" "}
                {formatIDR(mover.amount)}.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
