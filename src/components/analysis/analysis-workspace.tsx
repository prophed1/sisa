"use client";

import { useMemo, useState } from "react";
import { CalendarBlank, ArrowCounterClockwise } from "@phosphor-icons/react";
import { SaveStatusBadge } from "@/components/ui/save-status";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  analyzeRange,
  firstDayOfMonth,
  previousMonthBounds,
  rangeLabel,
  shiftDay,
} from "@/lib/analytics";
import { formatIDR } from "@/lib/format";
import { useLedger } from "@/lib/ledger-store";
import { monthKeyOf } from "@/lib/period";
import { CategoryBreakdown } from "@/components/analysis/category-breakdown";
import { DailyBars } from "@/components/analysis/daily-bars";
import { InsightsPanel } from "@/components/analysis/insights-panel";
import { MerchantRanking } from "@/components/analysis/merchant-ranking";
import { MonthlyComparison } from "@/components/analysis/monthly-comparison";
import { RecurringPanel } from "@/components/analysis/recurring-panel";
import { RangeFilter } from "@/components/analysis/range-filter";
import { StatsStrip } from "@/components/analysis/stats-strip";
import { WeekdayPattern } from "@/components/analysis/weekday-pattern";

interface Range {
  from: string;
  to: string;
}

const HOME_KEY = "bulan";

export function AnalysisWorkspace() {
  const { transactions, today } = useLedger();

  const bounds = useMemo(() => {
    const dates = transactions.map((tx) => tx.date).sort();
    return {
      min: dates[0] ?? today,
      max: dates[dates.length - 1] ?? today,
      count: dates.length,
    };
  }, [transactions, today]);

  // Kalau catatan terakhir bukan dari bulan berjalan, preset ini menunjuk
  // bulan terakhir yang ada datanya — namanya jangan menyesatkan.
  const homeLabel =
    monthKeyOf(bounds.max) === monthKeyOf(today)
      ? "Bulan ini"
      : "Bulan terakhir";

  const presets = useMemo(
    () => [
      { key: "7", label: "7 hari", from: shiftDay(bounds.max, -6), to: bounds.max },
      { key: "14", label: "14 hari", from: shiftDay(bounds.max, -13), to: bounds.max },
      {
        key: HOME_KEY,
        label: homeLabel,
        from: firstDayOfMonth(bounds.max),
        to: bounds.max,
      },
      {
        key: "lalu",
        label: "Bulan lalu",
        ...previousMonthBounds(bounds.max),
      },
    ].map((preset) => ({
      ...preset,
      from: preset.from < bounds.min ? bounds.min : preset.from,
    })),
    [bounds, homeLabel],
  );

  const home = presets.find((preset) => preset.key === HOME_KEY) ?? presets[2];

  const [range, setRange] = useState<Range | null>(null);
  const active = range ?? { from: home.from, to: home.to };

  const activeKey =
    presets.find(
      (preset) => preset.from === active.from && preset.to === active.to,
    )?.key ?? null;

  const analysis = useMemo(
    () => analyzeRange(transactions, active.from, active.to),
    [transactions, active.from, active.to],
  );

  const setFrom = (value: string) => {
    if (value > active.to) {
      setRange({ from: value, to: value });
      return;
    }
    setRange({ from: value < bounds.min ? bounds.min : value, to: active.to });
  };

  const setTo = (value: string) => {
    if (value < active.from) {
      setRange({ from: value, to: value });
      return;
    }
    setRange({ from: active.from, to: value > bounds.max ? bounds.max : value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Analisis
          </div>
          <h1 className="mt-2.5 max-w-[24ch] text-[23px] font-medium leading-tight tracking-[-0.03em] sm:text-[27px]">
            Pola belanja, bukan sekadar angka.
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
            {analysis.expenseCount > 0
              ? `${formatIDR(
                  analysis.spending,
                )} dalam ${analysis.days} hari, dihitung dari ${
                  analysis.expenseCount
                } transaksi pada ${analysis.label}.`
              : `Belum ada pengeluaran pada ${analysis.label}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveStatusBadge className="h-[26px] px-2.5" />
          <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[10.5px] text-muted">
            <CalendarBlank size={12} />
            {rangeLabel(bounds.min, bounds.max)}
          </span>
        </div>
      </div>

      <RangeFilter
        from={active.from}
        to={active.to}
        min={bounds.min}
        max={bounds.max}
        presets={presets}
        activeKey={activeKey}
        onSelect={(from, to) => setRange({ from, to })}
        onFrom={setFrom}
        onTo={setTo}
      />

      <StatsStrip analysis={analysis} />

      {analysis.expenseCount === 0 ? (
        <Panel className="flex flex-col gap-2 bg-pine-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[12px] leading-relaxed text-muted">
            Tidak ada pengeluaran pada {analysis.label}. Coba rentang lain atau
            kembali ke bulan berjalan.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="self-start sm:self-auto"
            onClick={() => setRange(null)}
          >
            <ArrowCounterClockwise size={14} />
            Kembali ke bulan ini
          </Button>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DailyBars analysis={analysis} />
        </div>
        <div className="xl:col-span-4">
          <WeekdayPattern analysis={analysis} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <MerchantRanking analysis={analysis} />
        </div>
        <div className="xl:col-span-5">
          <CategoryBreakdown analysis={analysis} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-7">
          <MonthlyComparison transactions={transactions} />
        </div>
        <div className="xl:col-span-5">
          <RecurringPanel transactions={transactions} />
        </div>
      </div>

      <InsightsPanel analysis={analysis} />
    </div>
  );
}
