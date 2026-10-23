"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { CategoryIcon } from "@/components/category-icon";
import { NAV_GROUPS } from "@/components/shell/nav";
import { CATEGORY_META } from "@/lib/data/categories";
import { formatDayLabel } from "@/lib/finance";
import { formatIDR } from "@/lib/format";
import { useLedger } from "@/lib/ledger-store";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PageResult {
  kind: "page";
  id: string;
  href: string;
  label: string;
  hint: string;
  group: string;
  icon: Icon;
}

interface TransactionResult {
  kind: "transaction";
  id: string;
  transaction: Transaction;
}

type Result = PageResult | TransactionResult;

/** Transaksi yang ditampilkan sekaligus; sisanya terlalu banyak untuk dipilih
 *  dengan panah, dan pencarian di halaman Transaksi sudah menampung semuanya. */
const MAX_TRANSACTIONS = 6;
/** Saat mencari teks, halaman yang cocok dibatasi supaya hasil transaksi ikut
 *  terlihat tanpa menggulir. */
const MAX_PAGES_WHILE_SEARCHING = 4;

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { transactions } = useLedger();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo<PageResult[]>(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          kind: "page" as const,
          id: item.href,
          group: group.title,
        })),
      ),
    [],
  );

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    const amountNeedle = needle.replace(/[^0-9]/g, "");

    const matchedPages = needle
      ? pages.filter((page) =>
          `${page.label} ${page.hint} ${page.group}`
            .toLowerCase()
            .includes(needle),
        )
      : pages;

    if (!needle) return matchedPages;

    const matchedTransactions = transactions
      .filter((transaction) => {
        const category = transaction.category
          ? CATEGORY_META[transaction.category].label
          : transaction.direction === "income"
            ? "pemasukan"
            : "tanpa kategori";
        const haystack =
          `${transaction.merchant} ${transaction.note ?? ""} ${category}`.toLowerCase();
        if (haystack.includes(needle)) return true;
        // Nominal juga bisa dicari: "45000" atau "45.000".
        return amountNeedle.length >= 3
          ? String(transaction.amount).includes(amountNeedle)
          : false;
      })
      .slice(0, MAX_TRANSACTIONS)
      .map<TransactionResult>((transaction) => ({
        kind: "transaction",
        id: transaction.id,
        transaction,
      }));

    return [
      ...matchedPages.slice(0, MAX_PAGES_WHILE_SEARCHING),
      ...matchedTransactions,
    ];
  }, [pages, query, transactions]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Pilihan yang digeser panah tetap terlihat di dalam daftar.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const select = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    if (result.kind === "page") {
      router.push(result.href);
      return;
    }
    // Halaman Transaksi menyaring lewat kata kunci yang sama, jadi hasilnya
    // langsung terlihat di sana.
    router.push(
      `/transaksi?cari=${encodeURIComponent(result.transaction.merchant)}`,
    );
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh] sm:pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div
            className="absolute inset-0 bg-[#040a18]/75 backdrop-blur-[6px]"
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
              if (event.key === "Enter") {
                event.preventDefault();
                select(results[activeIndex]);
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
                placeholder="Cari transaksi, halaman, atau aksi..."
                aria-label="Cari transaksi, halaman, atau aksi"
                className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint"
              />
              <kbd className="rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-faint">
                ESC
              </kbd>
            </div>

            <div
              ref={listRef}
              className="thin-scroll max-h-[340px] overflow-y-auto p-2"
            >
              {results.length ? (
                <ul role="listbox" aria-label="Hasil pencarian">
                  {results.map((result, index) => {
                    const active = index === activeIndex;
                    const previous = results[index - 1];
                    const startsTransactions =
                      result.kind === "transaction" &&
                      previous?.kind !== "transaction";

                    return (
                      <Fragment key={result.id}>
                        {startsTransactions ? (
                          <li
                            role="presentation"
                            className="px-2.5 pb-1 pt-2.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-faint"
                          >
                            Transaksi
                          </li>
                        ) : null}

                        {result.kind === "page" ? (
                          <li role="option" aria-selected={active}>
                            <button
                              type="button"
                              data-active={active}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => select(result)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                                active ? "bg-surface-2" : "bg-transparent",
                              )}
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line bg-surface text-muted">
                                <result.icon size={14} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium">
                                  {result.label}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-faint">
                                  {result.hint}
                                </span>
                              </span>
                              <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-faint">
                                {result.group}
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
                        ) : (
                          <li role="option" aria-selected={active}>
                            <button
                              type="button"
                              data-active={active}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => select(result)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                                active ? "bg-surface-2" : "bg-transparent",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-7 shrink-0 place-items-center rounded-[8px] border border-line",
                                  result.transaction.direction === "income"
                                    ? "bg-pine-soft text-pine"
                                    : "bg-canvas text-muted",
                                )}
                              >
                                {result.transaction.category ? (
                                  <CategoryIcon
                                    category={result.transaction.category}
                                    size={14}
                                  />
                                ) : (
                                  <span className="num text-[11px]">+</span>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium">
                                  {result.transaction.merchant}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-faint">
                                  {formatDayLabel(result.transaction.date)}
                                  {result.transaction.category
                                    ? ` · ${CATEGORY_META[result.transaction.category].label}`
                                    : ""}
                                  {result.transaction.note
                                    ? ` · ${result.transaction.note}`
                                    : ""}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "num shrink-0 text-[12px] font-medium",
                                  result.transaction.direction === "income" &&
                                    "text-pine",
                                )}
                              >
                                {result.transaction.direction === "income"
                                  ? "+"
                                  : "−"}
                                {formatIDR(result.transaction.amount)}
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
                        )}
                      </Fragment>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-3 py-10 text-center">
                  <p className="text-[12.5px] font-medium">
                    Tidak ada yang cocok
                  </p>
                  <p className="mt-1 text-[11.5px] text-faint">
                    Coba nama merchant, nominal, atau kata lain seperti “scan”.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10px] text-faint">
              <span>Halaman dan transaksi</span>
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
