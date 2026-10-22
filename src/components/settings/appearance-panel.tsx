"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

// Tema hanya diketahui setelah hidrasi; snapshot server selalu "terang"
// supaya HTML pertama dan render klien cocok.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const OPTIONS = [
  {
    value: "light",
    label: "Terang",
    caption: "Kanvas hangat, kontras lembut",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Gelap",
    caption: "Untuk malam dan ruangan redup",
    icon: Moon,
  },
] as const;

export function AppearancePanel() {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme, setTheme } = useTheme();
  const active = hydrated ? resolvedTheme ?? "light" : "light";

  return (
    <Panel>
      <PanelHeader
        title="Tampilan"
        caption="Berlaku di seluruh halaman dan tersimpan di perangkat ini."
      />
      <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = active === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex flex-col gap-2 rounded-[13px] border px-3 py-3 text-left transition-colors duration-200",
                selected
                  ? "border-pine/60 bg-pine-soft"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  size={14}
                  weight={selected ? "fill" : "regular"}
                  className={selected ? "text-pine" : "text-faint"}
                />
                <span className="text-[12px] font-medium">{option.label}</span>
                {selected ? (
                  <span className="ml-auto size-[5px] rounded-full bg-pine" />
                ) : null}
              </span>
              <span className="text-[10px] leading-relaxed text-faint">
                {option.caption}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
