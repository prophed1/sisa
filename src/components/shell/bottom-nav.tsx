"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChartLineUp,
  List,
  Plus,
  Receipt,
  SquaresFour,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Navigasi ponsel: empat tujuan yang paling sering dibuka, satu tombol catat
 * di tengah, dan pintu ke laci menu untuk sisanya (scan, email, pengaturan).
 * Bilah ini menggantikan tombol menu di bilah atas — satu tempat untuk satu
 * maksud, dan semuanya bisa dijangkau ibu jari.
 */

const TABS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Dasbor", icon: SquaresFour },
  { href: "/transaksi", label: "Transaksi", icon: Receipt },
  { href: "/analisis", label: "Analisis", icon: ChartLineUp },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group flex flex-col items-center gap-1 pb-2 pt-2.5"
    >
      <span className="relative grid size-8 place-items-center">
        {active ? (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-0 rounded-[11px] border border-pine/25 bg-pine/12"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        ) : null}
        <Icon
          size={19}
          weight={active ? "fill" : "regular"}
          className={cn(
            "relative z-10 transition-colors",
            active ? "text-pine" : "text-faint group-hover:text-muted",
          )}
        />
      </span>
      <span
        className={cn(
          "text-[9.5px] font-medium leading-none",
          active ? "text-pine" : "text-faint",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const onCatat = pathname.startsWith("/catat");

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="relative rounded-[22px] border border-line bg-surface shadow-[var(--lift-shadow)]">
        <Link
          href="/catat"
          aria-label="Catat transaksi"
          aria-current={onCatat ? "page" : undefined}
          className={cn(
            "absolute left-1/2 -top-6 grid size-[52px] -translate-x-1/2 place-items-center rounded-full border bg-pine text-[#141024] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_30px_-14px_rgba(242,193,78,0.65)] transition-transform duration-150 active:scale-95",
            onCatat
              ? "border-white/45 ring-2 ring-pine/35 ring-offset-2 ring-offset-surface"
              : "border-[color-mix(in_srgb,var(--pine)_50%,transparent)]",
          )}
        >
          <Plus size={22} weight="bold" />
        </Link>

        <div className="grid grid-cols-5">
          {TABS.slice(0, 2).map((tab) => (
            <Tab
              key={tab.href}
              {...tab}
              active={isActive(pathname, tab.href)}
            />
          ))}

          <div className="flex flex-col items-center gap-1 pb-2 pt-2.5">
            <span aria-hidden className="size-8" />
            <span className="text-[9.5px] font-medium leading-none text-faint">
              Catat
            </span>
          </div>

          {TABS.slice(2).map((tab) => (
            <Tab
              key={tab.href}
              {...tab}
              active={isActive(pathname, tab.href)}
            />
          ))}

          <button
            type="button"
            onClick={onOpenMenu}
            className="group flex flex-col items-center gap-1 pb-2 pt-2.5"
          >
            <span className="relative grid size-8 place-items-center">
              <List
                size={19}
                className="relative z-10 text-faint transition-colors group-hover:text-muted"
              />
            </span>
            <span className="text-[9.5px] font-medium leading-none text-faint">
              Menu
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
