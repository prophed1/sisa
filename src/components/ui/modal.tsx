"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div
            aria-hidden
            onClick={onClose}
            className="absolute inset-0 bg-[#05030a]/70 backdrop-blur-[6px]"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "relative w-full max-w-[540px] rounded-[24px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)] outline-none",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium tracking-[-0.01em]">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="grid size-8 shrink-0 place-items-center rounded-[9px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            {children ? (
              <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
            ) : null}

            {footer ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
