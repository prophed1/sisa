"use client";

import { Sparkle } from "@phosphor-icons/react";
import { type RangeAnalysis, buildInsights } from "@/lib/analytics";

export function InsightsPanel({ analysis }: { analysis: RangeAnalysis }) {
  const insights = buildInsights(analysis);

  if (insights.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-2 px-5 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-pine">
            <Sparkle size={11} weight="fill" />
            Yang menonjol
          </div>
          <h2 className="mt-2 max-w-[46ch] text-[15px] font-medium leading-snug tracking-[-0.02em]">
            Tiga hal yang paling menentukan bentuk pengeluaranmu.
          </h2>
        </div>
        <p className="shrink-0 text-[10.5px] text-faint">{analysis.label}</p>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-3">
        {insights.map((insight, index) => (
          <article key={insight.label} className="bg-surface px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-baseline gap-2">
              <span className="num text-[10px] text-pine">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint">
                {insight.label}
              </span>
            </div>
            <h3 className="mt-2 text-[12.5px] font-medium leading-snug tracking-[-0.01em]">
              {insight.title}
            </h3>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">
              {insight.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
