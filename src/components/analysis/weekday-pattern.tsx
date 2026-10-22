"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { WEEKDAY_SHORT, type RangeAnalysis } from "@/lib/analytics";
import { formatCompactIDR, formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeekdayPattern({ analysis }: { analysis: RangeAnalysis }) {
  const stats = analysis.weekdays;
  const max = Math.max(...stats.map((day) => day.average), 0);
  const ranked = [...stats]
    .filter((day) => day.occurrences > 0)
    .sort((a, b) => b.average - a.average);
  const highest = ranked[0] ?? null;
  const lowest = ranked[ranked.length - 1] ?? null;
  const empty = analysis.spending === 0;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Pola hari"
        caption="Rata-rata belanja per hari dalam seminggu"
      />

      {empty ? (
        <div className="flex flex-1 items-center px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-[12px] leading-relaxed text-muted">
            Pola mingguan muncul setelah ada pengeluaran yang tercatat pada
            rentang ini.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
          <ul className="space-y-[7px]">
            {stats.map((day) => {
              const isHighest = highest?.index === day.index;
              const width = max ? (day.average / max) * 100 : 0;
              return (
                <li
                  key={day.index}
                  className="group grid grid-cols-[26px_1fr_auto] items-center gap-2"
                  title={`${formatIDR(day.amount)} dari ${day.count} transaksi pada ${day.occurrences} hari ${day.full}`}
                >
                  <span
                    className={cn(
                      "text-[10.5px]",
                      isHighest ? "font-medium text-ink" : "text-faint",
                    )}
                  >
                    {WEEKDAY_SHORT[day.index]}
                  </span>
                  <span className="relative h-[7px] overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700",
                        isHighest ? "bg-pine" : "bg-pine/55",
                      )}
                      style={{ width: `${Math.max(width, day.average ? 2 : 0)}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "num w-[58px] text-right text-[10.5px]",
                      isHighest ? "text-ink" : "text-muted",
                    )}
                  >
                    {day.average ? formatCompactIDR(day.average) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-auto border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint">
            {highest && lowest && highest.index !== lowest.index ? (
              <>
                <span className="text-muted">{highest.full}</span> paling mahal
                dengan rata-rata {formatIDR(highest.average)} per hari;{" "}
                <span className="text-muted">{lowest.full}</span> paling hemat,{" "}
                {formatIDR(lowest.average)}.
              </>
            ) : (
              <>Rentang terlalu pendek untuk membandingkan hari.</>
            )}
          </p>
        </div>
      )}
    </Panel>
  );
}
