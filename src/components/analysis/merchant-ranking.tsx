"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import type { RangeAnalysis } from "@/lib/analytics";
import { formatIDR, formatPercent } from "@/lib/format";

const TOP = 6;

export function MerchantRanking({ analysis }: { analysis: RangeAnalysis }) {
  const ranked = analysis.merchants;
  const visible = ranked.slice(0, TOP);
  const window = analysis.previousWindow;
  const fresh = window
    ? ranked.filter((entry) => entry.previousCount === 0 && entry.count >= 2)
    : [];
  const rest = ranked.slice(TOP);
  const restTotal = rest.reduce((total, entry) => total + entry.amount, 0);
  const restCount = rest.reduce((total, entry) => total + entry.count, 0);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Merchant paling boros"
        caption={
          ranked.length
            ? `${ranked.length} merchant berbeda pada ${analysis.label}${
                fresh.length
                  ? ` · ${fresh.length} di antaranya baru dibanding ${window?.label}`
                  : ""
              }`
            : `Belum ada merchant pada ${analysis.label}`
        }
        action={
          ranked.length ? (
            <span className="text-[10.5px] text-faint">
              {analysis.expenseCount} transaksi
            </span>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        {visible.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted">
            Peringkat merchant akan terisi begitu ada pengeluaran pada rentang
            ini.
          </p>
        ) : (
          <ol className="space-y-0">
            {visible.map((entry, index) => (
              <li
                key={entry.name}
                className="group border-b border-line/70 py-[9px] first:pt-0 last:border-b-0"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="num w-[18px] shrink-0 text-[10px] text-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.01em]">
                    {entry.name}
                  </span>
                  <span className="num shrink-0 text-[11.5px]">
                    {formatIDR(entry.amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-[28px]">
                  <span className="min-w-0 flex-1 truncate text-[10px] text-faint">
                    {entry.category ? (
                      <span className="inline-flex items-center gap-1">
                        <span
                          aria-hidden
                          className="size-[5px] rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_META[entry.category].color,
                          }}
                        />
                        {CATEGORY_META[entry.category].shortLabel}
                      </span>
                    ) : (
                      "Tanpa kategori"
                    )}
                    <span className="text-line-strong"> · </span>
                    {entry.count}×
                    {window &&
                    entry.previousCount === 0 &&
                    entry.count >= 2 ? (
                      <span className="ml-1.5 rounded-full bg-pine-soft px-1.5 py-px text-[9px] text-pine">
                        baru
                      </span>
                    ) : null}
                  </span>
                  <span className="num text-[10px] text-faint">
                    {formatPercent(entry.share)}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="mt-1.5 ml-[28px] block h-[2px] overflow-hidden rounded-full bg-surface-2"
                >
                  <span
                    className="block h-full rounded-full bg-pine/60 transition-[width] duration-700"
                    style={{ width: `${entry.share}%` }}
                  />
                </span>
              </li>
            ))}

            {rest.length ? (
              <li className="mt-2 flex items-baseline gap-2.5 rounded-[8px] bg-surface-2/70 px-2 py-1.5">
                <span className="w-[18px] shrink-0 text-[10px] text-faint">
                  +
                </span>
                <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted">
                  {rest.length} merchant lain · {restCount}×
                </span>
                <span className="num text-[10.5px] text-muted">
                  {formatIDR(restTotal)}
                </span>
              </li>
            ) : null}
          </ol>
        )}
      </div>
    </Panel>
  );
}
