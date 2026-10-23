"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { NAV_GROUPS } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items.map((item) => ({ ...item, group: group.title })),
      ),
    [],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint} ${item.group}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div
            className="absolute inset-0 bg-[#05030a]/70 backdrop-blur-[6px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian cepat"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  results.length ? (index + 1) % results.length : 0,
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) =>
                  results.length
                    ? (index - 1 + results.length) % results.length
                    : 0,
                );
              }
              if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault();
                go(results[activeIndex].href);
              }
            }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)]"
          >
            <div className="flex h-[52px] items-center gap-2.5 border-b border-line px-4">
              <MagnifyingGlass size={16} className="shrink-0 text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Cari halaman atau aksi..."
                aria-label="Cari halaman atau aksi"
                className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint"
              />
              <kbd className="rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-faint">
                ESC
              </kbd>
            </div>

            <div className="thin-scroll max-h-[320px] overflow-y-auto p-2">
              {results.length ? (
                <ul role="listbox" aria-label="Hasil pencarian">
                  {results.map((item, index) => {
                    const Icon = item.icon;
                    const active = index === activeIndex;
                    return (
                      <li key={item.href} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => go(item.href)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                            active ? "bg-surface-2" : "bg-transparent",
                          )}
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line bg-surface text-muted">
                            <Icon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-faint">
                              {item.hint}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-faint">
                            {item.group}
                          </span>
                          <ArrowRight
                            size={13}
                            className={cn(
                              "shrink-0 text-faint transition-opacity",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-3 py-10 text-center">
                  <p className="text-[12.5px] font-medium">
                    Tidak ada yang cocok
                  </p>
                  <p className="mt-1 text-[11.5px] text-faint">
                    Coba kata lain seperti “scan” atau “analisis”.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10px] text-faint">
              <span>Navigasi cepat</span>
              <span className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[9px]">
                    ↑↓
                  </kbd>
                  pilih
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[9px]">
                    ↵
                  </kbd>
                  buka
                </span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
