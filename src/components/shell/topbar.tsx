"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleNotch,
  CloudSlash,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { CommandPalette } from "@/components/shell/command-palette";
import { PAGE_TITLES } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { useLedger } from "@/lib/ledger-store";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Sisa";
  const { status, error } = useLedger();
  const [palette, setPalette] = useState({ open: false, session: 0 });

  const openPalette = () =>
    setPalette((current) => ({ open: true, session: current.session + 1 }));
  const closePalette = () =>
    setPalette((current) => ({ ...current, open: false }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((current) =>
          current.open
            ? { ...current, open: false }
            : { open: true, session: current.session + 1 },
        );
      }
      if (event.key === "Escape") {
        setPalette((current) =>
          current.open ? { ...current, open: false } : current,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="glass sticky top-0 z-30 border-b border-ink/[0.06]">
        <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="hidden text-faint md:inline">Ruang kerja</span>
            <span className="hidden text-line-strong md:inline">/</span>
            <span className="truncate font-medium">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              className="hidden h-9 w-[208px] items-center gap-2 rounded-full border border-line bg-ink/[0.04] px-3.5 text-left text-[12px] text-faint transition-colors hover:bg-ink/[0.07] hover:text-muted sm:flex lg:w-[236px]"
            >
              <MagnifyingGlass size={15} className="shrink-0" />
              <span className="truncate">Cari halaman...</span>
              <kbd className="ml-auto shrink-0 rounded-full border border-line bg-ink/[0.05] px-2 py-0.5 font-mono text-[9px] tracking-wide">
                ⌘K
              </kbd>
            </button>

            <ThemeToggle />

            <span
              aria-hidden
              className="mx-1 hidden h-5 w-px bg-line sm:block"
            />

            {status !== "idle" ? (
              <span
                role="status"
                title={error}
                className={cn(
                  "hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] sm:flex",
                  status === "error"
                    ? "bg-clay/15 text-clay"
                    : "bg-ink/[0.04] text-faint",
                )}
              >
                {status === "saving" ? (
                  <>
                    <CircleNotch size={13} className="animate-spin" />
                    Menyimpan
                  </>
                ) : (
                  <>
                    <CloudSlash size={13} />
                    Tidak tersimpan
                  </>
                )}
              </span>
            ) : null}

            {/* Di ponsel tombol catat sudah ada di bilah bawah; menampilkan
                keduanya hanya membuat dua ajakan yang sama. */}
            <span className="hidden sm:block">
              <Link
                href="/catat"
                className={buttonStyles({
                  variant: "primary",
                  className: "h-9 px-3.5",
                })}
              >
                <Plus size={14} weight="bold" />
                <span>Catat</span>
              </Link>
            </span>
          </div>
        </div>
      </header>

      <CommandPalette
        key={palette.session}
        open={palette.open}
        onClose={closePalette}
      />
    </>
  );
}
