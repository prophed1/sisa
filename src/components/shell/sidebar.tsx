"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CaretRight } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand-mark";
import { useSessionUser } from "@/components/providers/session-provider";
import { NAV_GROUPS } from "@/components/shell/nav";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Sidebar({
  onNavigate,
  activeLayoutId = "sidebar-active",
}: {
  onNavigate?: () => void;
  /** Laci seluler memakai id sendiri supaya pil aktif tidak "terbang" ke
   *  sidebar desktop yang sedang disembunyikan. */
  activeLayoutId?: string;
}) {
  const pathname = usePathname();
  const user = useSessionUser();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-2xl px-1 py-1 transition-opacity hover:opacity-85"
        >
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold leading-none tracking-[-0.02em]">
              Sisa
            </span>
            <span className="mt-1.5 block text-[10px] leading-none text-faint">
              Pelacak pengeluaran
            </span>
          </span>
        </Link>
      </div>

      <nav
        aria-label="Navigasi utama"
        className="thin-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-4"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[9.5px] font-medium uppercase tracking-[0.15em] text-faint">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-[38px] items-center gap-2.5 rounded-full px-3 text-[12.5px] transition-colors duration-200",
                        active
                          ? "font-medium text-ink"
                          : "text-muted hover:bg-ink/[0.05] hover:text-ink",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId={activeLayoutId}
                          className="absolute inset-0 rounded-full border border-pine/30 bg-pine/12 shadow-[inset_0_1px_0_rgba(255,247,222,0.12),0_0_22px_-12px_var(--pine)]"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                      ) : null}
                      <Icon
                        size={16}
                        weight={active ? "fill" : "regular"}
                        className={cn(
                          "relative z-10 shrink-0 transition-colors",
                          active
                            ? "text-pine"
                            : "text-faint group-hover:text-muted",
                        )}
                      />
                      <span className="relative z-10 truncate">
                        {item.label}
                      </span>
                      {active ? (
                        <span className="relative z-10 ml-auto size-[5px] rounded-full bg-pine shadow-[0_0_8px_var(--pine)]" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-1 border-t border-ink/[0.07] px-3 py-3">
        <Link
          href="/pengaturan"
          onClick={onNavigate}
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1.5 py-1.5 transition-colors hover:bg-ink/[0.05]"
        >
          <span className="grid size-[32px] shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,rgba(242,193,78,0.95),rgba(76,127,208,0.85))] p-[1.5px]">
            <span className="grid size-full place-items-center rounded-full bg-surface text-[10.5px] font-semibold text-ink">
              {initials(user.name)}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium leading-tight">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-faint">
              {user.email}
            </span>
          </span>
          <CaretRight
            size={13}
            className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        <SignOutButton variant="icon" />
      </div>
    </div>
  );
}
