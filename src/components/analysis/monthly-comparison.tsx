"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { monthlySeries } from "@/lib/analytics";
import { MONTH_SHORT } from "@/lib/finance";
import { formatCompactIDR, formatDelta, formatIDR } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MonthlyComparison({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const months = monthlySeries(transactions, 6);
  const max = Math.max(...months.map((month) => month.spending), 0);
  const maxIncome = Math.max(...months.map((month) => month.income), 0);
  const complete = months.filter((month) => !month.partial);
  const average = complete.length
    ? complete.reduce((total, month) => total + month.spending, 0) /
      complete.length
    : 0;
  const highest = complete.reduce<(typeof complete)[number] | null>(
    (best, month) => (!best || month.spending > best.spending ? month : best),
    null,
  );
  const running = months.filter((month) => month.partial);
  const completeSpending = complete.reduce(
    (total, month) => total + month.spending,
    0,
  );
  const completeIncome = complete.reduce(
    (total, month) => total + month.income,
    0,
  );

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Bulan ke bulan"
        caption={
          complete.length > 1
            ? `Rata-rata ${formatIDR(average)} per bulan penuh dari ${
                complete.length
              } bulan terakhir`
            : "Belum cukup bulan untuk dibandingkan"
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        <ul className="space-y-2.5">
          {months.map((month) => {
            const width = max ? (month.spending / max) * 100 : 0;
            const isHighest = highest?.key === month.key;
            return (
              <li
                key={month.key}
                className="grid grid-cols-[62px_1fr_auto] items-center gap-3"
              >
                <span
                  className={cn(
                    "text-[11px]",
                    month.partial ? "text-faint" : "text-muted",
                  )}
                >
                  {month.short}{" "}
                  <span className="num text-faint">
                    {String(month.year).slice(2)}
                  </span>
                </span>

                <span className="flex flex-col gap-[3px]">
                  <span className="relative block h-[11px] overflow-hidden rounded-[4px] bg-surface-2">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-[4px] transition-[width] duration-700",
                        month.partial
                          ? "bg-pine/35"
                          : isHighest
                            ? "bg-pine"
                            : "bg-pine/70",
                      )}
                      style={{
                        width: `${Math.max(width, month.spending ? 3 : 0)}%`,
                      }}
                    />
                    {month.partial ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 right-0 w-[6px] border-l border-dashed border-line-strong"
                      />
                    ) : null}
                  </span>
                  <span className="relative block h-[5px] overflow-hidden rounded-full bg-surface-2">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 rounded-full bg-sage transition-[width] duration-700"
                      style={{
                        width: `${
                          maxIncome ? (month.income / maxIncome) * 100 : 0
                        }%`,
                      }}
                    />
                  </span>
                </span>

                <span className="flex items-baseline justify-end gap-2">
                  <span className="num text-[11.5px]" title={`Pemasukan ${formatIDR(month.income)}`}>
                    {formatCompactIDR(month.spending)}
                  </span>
                  {month.delta === null ? (
                    <span className="num w-[46px] text-right text-[10px] text-faint">
                      —
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "num w-[46px] text-right text-[10px]",
                        month.delta > 0 ? "text-clay" : "text-pine",
                      )}
                      title={
                        month.comparedDays
                          ? `Dibanding 1–${month.comparedDays} ${
                              MONTH_SHORT[(month.month + 10) % 12]
                            } ${month.year}`
                          : `Dibanding ${month.label} sebelumnya`
                      }
                    >
                      {formatDelta(month.delta)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-[8px] w-[3px] rounded-sm bg-pine" />
            Pengeluaran
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-[4px] w-4 rounded-full bg-sage" />
            Pemasukan
          </span>
        </div>

        {complete.length ? (
          <dl className="mt-4 space-y-2 border-t border-line pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] text-muted">
                Pengeluaran {complete.length} bulan penuh
              </dt>
              <dd className="num text-[12px]">{formatIDR(completeSpending)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] text-muted">Pemasukan</dt>
              <dd className="num text-[12px]">{formatIDR(completeIncome)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] text-muted">Selisih</dt>
              <dd
                className={cn(
                  "num text-[12px] font-medium",
                  completeIncome - completeSpending >= 0
                    ? "text-pine"
                    : "text-clay",
                )}
              >
                {formatIDR(completeIncome - completeSpending)}
              </dd>
            </div>
          </dl>
        ) : null}

        <p className="mt-auto border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint">
          {running.length
            ? `${
                running[0].label
              } masih berjalan, jadi deltanya dihitung terhadap ${
                running[0].comparedDays
                  ? `1–${running[0].comparedDays} ${
                      MONTH_SHORT[(running[0].month + 10) % 12]
                    }`
                  : "bulan sebelumnya"
              }. `
            : ""}
          {highest
            ? `Bulan terboros sejauh ini ${highest.label} dengan ${formatIDR(
                highest.spending,
              )}.`
            : null}
        </p>
      </div>
    </Panel>
  );
}
