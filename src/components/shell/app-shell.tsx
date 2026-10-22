"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-canvas lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-[100dvh] flex-col lg:pl-[264px]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1420px] flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-50 bg-[#0C0A18]/55 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi"
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-canvas shadow-[0_0_60px_rgba(20,18,12,0.2)] lg:hidden"
              initial={reduceMotion ? { opacity: 0 } : { x: "-102%" }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "-102%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Tutup menu"
                className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-[9px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={15} />
              </button>
              <Sidebar
                onNavigate={() => setMenuOpen(false)}
                activeLayoutId="sidebar-active-mobile"
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
