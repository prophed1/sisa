"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatDayLabel } from "@/lib/finance";
import { formatCompactIDR, formatIDR, formatPercent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";
import { MONTH_SHORT } from "@/lib/period";
import { clamp, cn } from "@/lib/utils";

type Mode = "harian" | "kumulatif";

const VIEW_W = 800;
const VIEW_H = 200;

function cumulative(values: number[]) {
  let running = 0;
  return values.map((value) => (running += value));
}

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

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, 0, VIEW_H);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, 0, VIEW_H);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export function TrendChart() {
  const summary = useLedgerSummary();
  const { period } = useLedger();
  const previousShort = MONTH_SHORT[period.previousMonthIndex - 1];
  const [mode, setMode] = useState<Mode>("harian");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const days = summary.daily;

  const series = useMemo(() => {
    const current = days.map((point) => point.current);
    const previous = days.map((point) => point.previous);
    return mode === "harian"
      ? { current, previous }
      : { current: cumulative(current), previous: cumulative(previous) };
  }, [days, mode]);

  const max = useMemo(
    () => niceMax(Math.max(...series.current, ...series.previous, 0)),
    [series],
  );

  const toPoints = (values: number[]) => {
    const span = Math.max(values.length - 1, 1);
    return values.map((value, index) => ({
      x: (index / span) * VIEW_W,
      y: VIEW_H - (value / max) * VIEW_H,
    }));
  };

  const currentPoints = toPoints(series.current);
  const previousPoints = toPoints(series.previous);
  const currentLine = smoothPath(currentPoints);
  const previousLine = smoothPath(previousPoints);
  const currentArea = `${currentLine} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
    label: formatCompactIDR(max * fraction),
    top: (1 - fraction) * 100,
  }));

  const tickIndices = useMemo(() => {
    const last = days.length - 1;
    if (last <= 0) return [0];
    const raw = [
      0,
      Math.round(last * 0.25),
      Math.round(last * 0.55),
      Math.round(last * 0.8),
      last,
    ];
    return [...new Set(raw)].sort((a, b) => a - b);
  }, [days.length]);

  const active = activeIndex === null ? null : days[activeIndex];
  const activeCurrent = activeIndex === null ? 0 : series.current[activeIndex];
  const activePrevious =
    activeIndex === null ? 0 : series.previous[activeIndex];
  const activePoint =
    activeIndex === null ? null : (currentPoints[activeIndex] ?? null);

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        className="pb-3"
        title="Tren pengeluaran"
        caption={`${period.range} dibanding ${summary.comparisonLabel} bulan sebelumnya`}
        action={
          <div
            role="group"
            aria-label="Mode grafik"
            className="inline-flex rounded-[9px] border border-line bg-surface-2 p-[2px]"
          >
            {(
              [
                { value: "harian", label: "Harian" },
                { value: "kumulatif", label: "Kumulatif" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={mode === option.value}
                onClick={() => {
                  setMode(option.value);
                  setActiveIndex(null);
                }}
                className={cn(
                  "h-[26px] rounded-[7px] px-2.5 text-[11px] font-medium transition-colors duration-200",
                  mode === option.value
                    ? "bg-surface text-ink shadow-[var(--shadow-panel)]"
                    : "text-faint hover:text-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex items-center gap-4 px-5 pb-1 text-[10.5px] text-muted sm:px-6">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-pine" />
          {period.month} {period.year}
        </span>
        <span className="flex items-center gap-1.5 text-faint">
          <span
            aria-hidden
            className="h-px w-4 border-t border-dashed border-line-strong"
          />
          {previousShort} {period.previousYear}
        </span>
        <span className="ml-auto hidden text-faint sm:inline">
          {mode === "harian" ? "Belanja per hari" : "Akumulasi belanja"}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="flex gap-2">
          <div className="relative w-[46px] shrink-0" style={{ height: 188 }} aria-hidden>
            {yTicks.map((tick) => (
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
              className="relative h-[188px] cursor-crosshair"
              onPointerMove={(event) => {
                if (days.length < 2) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = clamp(
                  (event.clientX - rect.left) / rect.width,
                  0,
                  1,
                );
                setActiveIndex(Math.round(ratio * (days.length - 1)));
              }}
              onPointerLeave={() => setActiveIndex(null)}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {yTicks.map((tick) => (
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
                className="absolute inset-0 h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pine)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--pine)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <motion.path
                  key={`previous-${mode}`}
                  d={previousLine}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />

                <motion.path
                  key={`area-${mode}`}
                  d={currentArea}
                  fill="url(#trend-area-fill)"
                  initial={{ opacity: reduceMotion ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                />

                <motion.path
                  key={`current-${mode}`}
                  d={currentLine}
                  fill="none"
                  stroke="var(--pine)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={reduceMotion ? { opacity: 0 } : { pathLength: 0 }}
                  animate={reduceMotion ? { opacity: 1 } : { pathLength: 1 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>

              {activePoint ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-0 h-full w-px bg-line-strong/80"
                  style={{ left: `${(activePoint.x / VIEW_W) * 100}%` }}
                />
              ) : null}

              {activePoint ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-pine shadow-[0_0_0_1px_var(--pine)]"
                  style={{
                    left: `${(activePoint.x / VIEW_W) * 100}%`,
                    top: `${(activePoint.y / VIEW_H) * 100}%`,
                  }}
                />
              ) : null}

              {active && activePoint ? (
                <div
                  className="pointer-events-none absolute z-20 w-[152px] -translate-x-1/2 -translate-y-full rounded-[10px] border border-line bg-surface/95 p-2.5 shadow-[var(--lift-shadow)] backdrop-blur-md"
                  style={{
                    left: `${clamp((activePoint.x / VIEW_W) * 100, 22, 78)}%`,
                    top: `calc(${(activePoint.y / VIEW_H) * 100}% - 12px)`,
                  }}
                >
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint">
                    {active.day} {period.short}
                  </p>
                  <p className="num mt-1 text-[12.5px] font-medium">
                    {formatIDR(activeCurrent)}
                  </p>
                  <p className="num mt-0.5 text-[10px] text-faint">
                    {previousShort}: {formatIDR(activePrevious)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative mt-2 h-4">
              {tickIndices.map((index) => {
                const isFirst = index === 0;
                const isLast = index === days.length - 1;
                return (
                  <span
                    key={index}
                    className="num absolute top-0 whitespace-nowrap text-[9.5px] text-faint"
                    style={{
                      left: `${(index / Math.max(days.length - 1, 1)) * 100}%`,
                      transform: isFirst
                        ? "translateX(0)"
                        : isLast
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {formatDayLabel(dayIso(days[index].day, period.year, period.monthIndex))}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3.5 text-[10.5px] leading-relaxed text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>
            Rata-rata{" "}
            <span className="num text-muted">
              {formatIDR(summary.dailyAverage)}
            </span>{" "}
            per hari pada periode ini.
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "size-[5px] rounded-full",
                summary.overBudget ? "bg-clay" : "bg-pine",
              )}
            />
            Proyeksi akhir bulan{" "}
            <span
              className={cn(
                "num",
                summary.overBudget ? "text-clay" : "text-muted",
              )}
            >
              {formatIDR(summary.projected)}
            </span>
            <span className="hidden sm:inline">
              (
              {formatPercent(
                Math.abs((summary.projected / summary.budgetTotal - 1) * 100),
              )}{" "}
              {summary.overBudget ? "di atas" : "di bawah"} anggaran)
            </span>
          </span>
        </div>
      </div>
    </Panel>
  );
}

function dayIso(day: number, year: number, monthIndex: number) {
  return `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}
