"use client";

import { useState } from "react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { WEEKDAY_SHORT, type RangeAnalysis } from "@/lib/analytics";
import { formatDayLabel } from "@/lib/finance";
import { formatCompactIDR, formatDelta, formatIDR } from "@/lib/format";
import { cn, clamp } from "@/lib/utils";

const VIEW_W = 800;
const VIEW_H = 200;
const CHART_H = 188;

function niceMax(value: number) {
  if (!value) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  return step * magnitude;
}

export function DailyBars({ analysis }: { analysis: RangeAnalysis }) {
  const [active, setActive] = useState<number | null>(null);
  const points = analysis.series;
  const count = points.length;

  const max = niceMax(
    Math.max(
      ...points.map((point) => Math.max(point.amount, point.previous)),
      0,
    ),
  );

  const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
    top: (1 - fraction) * 100,
    label: formatCompactIDR(max * fraction),
  }));

  const lineFor = (key: "amount" | "previous") =>
    points
      .map((point, index) => {
        const x = ((index + 0.5) / Math.max(count, 1)) * VIEW_W;
        const y = VIEW_H - (point[key] / max) * VIEW_H;
        return `${x},${y}`;
      })
      .join(" ");

  const labelIndices =
    count <= 7
      ? points.map((_, index) => index)
      : [
          0,
          Math.round((count - 1) * 0.25),
          Math.round((count - 1) * 0.5),
          Math.round((count - 1) * 0.75),
          count - 1,
        ].filter((value, index, list) => list.indexOf(value) === index);

  const activePoint = active === null ? null : points[active];
  const activeRatio = activePoint ? activePoint.amount / max : 0;
  const tooltipLeft = active === null ? 0 : ((active + 0.5) / Math.max(count, 1)) * 100;
  const above = activeRatio < 0.72;

  if (analysis.spending === 0) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader
          title="Belanja harian"
          caption={`${analysis.label} · ${analysis.days} hari`}
        />
        <div className="flex flex-1 items-center px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-[12px] leading-relaxed text-muted">
            Grafik harian muncul setelah ada pengeluaran pada rentang ini.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Belanja harian"
        caption={`${analysis.label} · ${analysis.days} hari, ${analysis.activeDays} di antaranya ada pengeluaran`}
        action={
          analysis.comparisonTotal ? (
            <span
              className={cn(
                "num inline-flex h-[24px] items-center rounded-full px-2 text-[10.5px]",
                analysis.delta > 0
                  ? "bg-clay-soft text-clay"
                  : "bg-pine-soft text-pine",
              )}
            >
              {formatDelta(analysis.delta)} vs bulan lalu
            </span>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
        <div className="flex gap-2">
          <div
            className="relative w-[44px] shrink-0"
            style={{ height: CHART_H }}
            aria-hidden
          >
            {ticks.map((tick) => (
              <span
                key={tick.top}
                className="num absolute right-0 -translate-y-1/2 whitespace-nowrap text-[9.5px] leading-none text-faint"
                style={{ top: `${tick.top}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="relative"
              style={{ height: CHART_H }}
              onPointerLeave={() => setActive(null)}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {ticks.map((tick) => (
                  <span
                    key={tick.top}
                    className="absolute inset-x-0 h-px bg-line"
                    style={{ top: `${tick.top}%` }}
                  />
                ))}
              </div>

              <svg
                aria-hidden
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              >
                <polyline
                  points={lineFor("previous")}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  x2={VIEW_W}
                  y1={VIEW_H - (analysis.dailyAverage / max) * VIEW_H}
                  y2={VIEW_H - (analysis.dailyAverage / max) * VIEW_H}
                  stroke="var(--sand)"
                  strokeWidth="1"
                  strokeDasharray="1 4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <div className="absolute inset-0 flex items-stretch gap-[2px]">
                {points.map((point, index) => {
                  const height = Math.max((point.amount / max) * 100, 1.5);
                  const isActive = active === index;
                  return (
                    <div
                      key={point.iso}
                      className="group relative flex h-full flex-1 items-end justify-center"
                      onPointerEnter={() => setActive(index)}
                    >
                      {isActive ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-line-strong"
                        />
                      ) : null}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute bottom-0 left-1/2 w-[54%] max-w-[22px] -translate-x-1/2 rounded-t-[3px] transition-[height,background-color] duration-300",
                          point.amount
                            ? isActive
                              ? "bg-pine"
                              : "bg-pine/80 group-hover:bg-pine"
                            : "h-[2px] rounded-full bg-line-strong",
                        )}
                        style={
                          point.amount ? { height: `${height}%` } : undefined
                        }
                      />
                      <button
                        type="button"
                        aria-label={`${formatDayLabel(point.iso)}: ${formatIDR(
                          point.amount,
                        )}`}
                        onFocus={() => setActive(index)}
                        onBlur={() => setActive(null)}
                        className="absolute bottom-0 left-1/2 w-[54%] max-w-[22px] -translate-x-1/2 rounded-[4px]"
                        style={{
                          height: point.amount
                            ? `max(${height}%, 22px)`
                            : "22px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {activePoint && active !== null ? (
                <div
                  className="pointer-events-none absolute z-20 w-[164px] -translate-x-1/2 rounded-[10px] border border-line bg-surface/95 p-2.5 shadow-[var(--lift-shadow)] backdrop-blur-md"
                  style={{
                    left: `${clamp(tooltipLeft, 14, 86)}%`,
                    ...(above
                      ? { bottom: `calc(${activeRatio * 100}% + 10px)` }
                      : { top: `calc(${(1 - activeRatio) * 100}% + 10px)` }),
                  }}
                >
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint">
                    {WEEKDAY_SHORT[activePoint.weekday]},{" "}
                    {formatDayLabel(activePoint.iso)}
                  </p>
                  <p className="num mt-1 text-[12.5px] font-medium">
                    {formatIDR(activePoint.amount)}
                  </p>
                  <p className="num mt-0.5 text-[10px] text-faint">
                    Bulan lalu: {formatIDR(activePoint.previous)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative mt-2 h-4">
              {labelIndices.map((index) => (
                <span
                  key={index}
                  className="num absolute top-0 -translate-x-1/2 whitespace-nowrap text-[9.5px] text-faint"
                  style={{
                    left: `${((index + 0.5) / Math.max(count, 1)) * 100}%`,
                  }}
                >
                  {points[index]?.day}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-[3px] rounded-sm bg-pine" />
            Harian
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-px w-4 border-t border-dashed border-line-strong"
            />
            Periode sama bulan lalu
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-px w-4 border-t border-dotted"
              style={{ borderColor: "var(--sand)" }}
            />
            Rata-rata {formatCompactIDR(analysis.dailyAverage)}/hari
          </span>
        </div>
      </div>
    </Panel>
  );
}
