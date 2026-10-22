"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative grid size-9 place-items-center rounded-[10px] border border-line bg-surface text-muted shadow-[var(--shadow-panel)] transition-colors duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.96]",
        className,
      )}
    >
      <span className="grid size-4 place-items-center">
        <Sun
          size={16}
          aria-hidden
          className="col-start-1 row-start-1 transition-transform duration-300 ease-out dark:rotate-90 dark:scale-0 motion-reduce:transition-none"
        />
        <Moon
          size={16}
          aria-hidden
          className="col-start-1 row-start-1 -rotate-90 scale-0 transition-transform duration-300 ease-out dark:rotate-0 dark:scale-100 motion-reduce:transition-none"
        />
      </span>
    </button>
  );
}
