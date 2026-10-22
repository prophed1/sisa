"use client";

import {
  EnvelopeSimple,
  PencilSimpleLine,
  Scan,
  Wallet,
} from "@phosphor-icons/react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatPercent, percent } from "@/lib/format";
import { useLedgerSummary } from "@/lib/ledger-store";

const ICONS = {
  manual: PencilSimpleLine,
  email: EnvelopeSimple,
  scan: Scan,
  system: Wallet,
};

export function SourcesPanel() {
  const summary = useLedgerSummary();
  const total = summary.count;

  return (
    <Panel className="flex flex-1 flex-col">
      <PanelHeader
        className="pb-3"
        title="Sumber transaksi"
        caption={`${total} catatan bulan ini`}
      />

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        {summary.sources.length === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-faint">
            Belum ada transaksi untuk dipetakan sumbernya.
          </p>
        ) : (
          <>
            <div
              className="flex h-[6px] gap-[3px] overflow-hidden rounded-full"
              role="img"
              aria-label="Komposisi sumber transaksi bulan ini"
            >
              {summary.sources.map((item) => (
                <span
                  key={item.source}
                  className="h-full rounded-full"
                  style={{
                    width: `${percent(item.count, total)}%`,
                    backgroundColor: item.color,
                    animation:
                      "grow-bar 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
                  }}
                />
              ))}
            </div>

            <ul className="mt-4 space-y-2.5">
              {summary.sources.map((item) => {
                const Icon = ICONS[item.source];
                return (
                  <li
                    key={item.source}
                    className="flex items-center gap-2.5 text-[11.5px]"
                  >
                    <Icon size={13} className="shrink-0 text-faint" />
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {item.label}
                    </span>
                    <span className="num text-[10.5px] text-faint">
                      {formatPercent(percent(item.count, total))}
                    </span>
                    <span className="num w-5 text-right text-[11px] font-medium">
                      {item.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="mt-auto pt-4 text-[10px] leading-relaxed text-faint">
          Catatan dari email bank dan scan struk masuk ke akun yang sama,
          lengkap dengan sumbernya.
        </p>
      </div>
    </Panel>
  );
}
