"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatCompactIDR, formatIDR, formatPercent, percent } from "@/lib/format";
import { useLedger, useLedgerSummary } from "@/lib/ledger-store";
import { cn } from "@/lib/utils";

const VIEW = 140;
const CENTER = VIEW / 2;
const RADIUS = 46;
const STROKE = 13;
const SIZE = 158;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2.4;

export function CategoryDonut() {
  const summary = useLedgerSummary();
  const { period } = useLedger();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const entries = summary.byCategory;
  const total = entries.reduce((sum, item) => sum + item.amount, 0);
  const active = entries.find((item) => item.category === activeKey);

  const lengths = entries.map(
    (item) => (percent(item.amount, total) / 100) * CIRCUMFERENCE,
  );
  const segments = entries.map((item, index) => ({
    ...item,
    share: percent(item.amount, total),
    offset: lengths
      .slice(0, index)
      .reduce((running, length) => running + length, 0),
    length: Math.max(lengths[index] - GAP, 0.8),
  }));

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Pengeluaran per kategori"
        caption={
          total > 0
            ? `Proporsi dari ${formatIDR(total)} · ${period.range}`
            : `Belum ada pengeluaran pada ${period.label}`
        }
      />

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-[12px] leading-relaxed text-muted">
            Donat akan terisi begitu ada pengeluaran yang dicatat pada{" "}
            {period.label}.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-5 pt-2 sm:px-6 sm:pb-6 md:flex-row md:items-center md:gap-3">
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            {/* Cahaya di balik donat: memberi kedalaman tanpa menambah gambar. */}
            <span
              aria-hidden
              className="glow-halo pointer-events-none absolute inset-[4%] rounded-full opacity-50"
            />
            <svg
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              className="relative size-full -rotate-90"
              role="img"
              aria-label="Grafik donat proporsi pengeluaran per kategori"
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth={STROKE}
              />
              {segments.map((segment) => {
                const isActive = activeKey === segment.category;
                const isMuted = activeKey !== null && !isActive;
                return (
                  <motion.circle
                    key={segment.category}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={CATEGORY_META[segment.category].color}
                    strokeWidth={isActive ? STROKE + 2 : STROKE}
                    strokeDasharray={`${segment.length} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-segment.offset}
                    strokeLinecap="butt"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { strokeDasharray: `0 ${CIRCUMFERENCE}`, opacity: 1 }
                    }
                    animate={{
                      strokeDasharray: `${segment.length} ${CIRCUMFERENCE}`,
                      opacity: isMuted ? 0.4 : 1,
                    }}
                    transition={{
                      duration: reduceMotion ? 0.2 : 0.8,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      transition: "stroke-width 200ms ease, opacity 200ms ease",
                      cursor: "pointer",
                    }}
                    onPointerEnter={() => setActiveKey(segment.category)}
                    onPointerLeave={() => setActiveKey(null)}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.13em] text-faint">
                  {active ? CATEGORY_META[active.category].shortLabel : "Total"}
                </p>
                <p className="num mt-1 text-[15px] font-medium leading-none tracking-[-0.02em]">
                  {formatCompactIDR(active ? active.amount : total)}
                </p>
                <p className="num mt-1 text-[9.5px] text-faint">
                  {active
                    ? formatPercent(percent(active.amount, total))
                    : period.isCurrent
                      ? "bulan ini"
                      : period.short}
                </p>
              </div>
            </div>
          </div>

          <ul className="w-full min-w-0 space-y-[1px] md:flex-1">
            {entries.map((item) => {
              const meta = CATEGORY_META[item.category];
              const share = percent(item.amount, total);
              const isActive = activeKey === item.category;

              return (
                <li key={item.category}>
                  <button
                    type="button"
                    onPointerEnter={() => setActiveKey(item.category)}
                    onPointerLeave={() => setActiveKey(null)}
                    onFocus={() => setActiveKey(item.category)}
                    onBlur={() => setActiveKey(null)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[7px] px-1.5 py-[5px] text-left transition-colors duration-150",
                      isActive ? "bg-surface-2" : "bg-transparent",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-[6px] shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
                      {meta.shortLabel}
                    </span>
                    <span className="num shrink-0 text-[10.5px] text-faint">
                      {formatPercent(share)}
                    </span>
                    <span className="sr-only">
                      {formatIDR(item.amount)} dari {item.count} transaksi
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
