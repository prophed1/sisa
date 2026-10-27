"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Dialog yang menempel di jendela, bukan di halaman.
 *
 * Dulu panel ini dirender di tempat pemakaiannya, di dalam pembungkus halaman
 * yang memakai animasi `.reveal`. Animasi itu meninggalkan `transform` pada
 * elemennya, dan `transform` apa pun membuat elemen tersebut menjadi acuan
 * bagi keturunan `position: fixed`. Akibatnya `inset-0` mengikuti panjang
 * halaman (bukan tinggi layar): panel terpotong di atas, tombol simpan
 * tertutup bilah navigasi ponsel, dan halaman melompat ke tengah karena
 * fokus mencari panel di kotak setinggi seluruh dokumen.
 *
 * Portal ke `document.body` memutus rantai itu, jadi dialog selalu tepat
 * selayar. Di ponsel ia tampil sebagai lembar dari bawah: tinggi dibatasi,
 * isinya bisa digulir sendiri, dan baris aksi tetap bisa dijangkau.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Panel lebih lebar untuk isi bertabel, mis. pratinjau impor CSV. */
  wide?: boolean;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    // Mengunci gulir menghilangkan batang gulir, dan hilangnya batang gulir
    // membuat isi melebar lalu tata letaknya bergeser. Lebarnya diganti
    // dengan padding supaya halaman di belakang tidak bergerak sedikit pun.
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    // Posisi gulir saat dikunci. Saat batang gulir kembali, peramban bisa
    // memangkas offset gulir beberapa puluh piksel; angka ini yang
    // mengembalikannya ke tempat semula.
    const lockedScroll = window.scrollY;
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    // `preventScroll` penting: tanpa itu peramban menggulir halaman untuk
    // "menunjukkan" panel yang baru difokuskan — persis lompatan yang
    // dikeluhkan setelah menyunting transaksi.
    panelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      window.removeEventListener("keydown", onKeyDown);
      // Tanpa ini, menutup dialog setelah menyunting di dasar daftar
      // melempar halaman kembali ke tengah.
      if (Math.abs(window.scrollY - lockedScroll) > 1) {
        window.scrollTo({ top: lockedScroll, behavior: "instant" });
      }
    };
  }, [open, onClose]);

  // Di server tidak ada `document`. Dialog selalu dibuka lewat interaksi,
  // jadi markup pertama memang kosong dan tidak ada ketidakcocokan hidrasi.
  //
  // Tanpa `AnimatePresence`: ia tidak merender portal sebagai anaknya, dan
  // versi yang dibungkus dari dalam pernah meninggalkan lapisan transparan
  // yang menutupi seluruh layar. Dialog yang menutup seketika lebih baik
  // daripada lapisan hantu yang menelan klik.
  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[#040a18]/75 backdrop-blur-[6px]"
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        // Tween, bukan spring: spring yang tidak sempat maju meninggalkan
        // lembar 18 px terlalu rendah, cukup untuk memotong tombol simpan.
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)] outline-none",
          // Lembar ponsel menyentuh tepi bawah; ruang untuk gestur sistem.
          "pb-[env(safe-area-inset-bottom)]",
          "sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:pb-0",
          wide ? "sm:max-w-[620px]" : "sm:max-w-[540px]",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
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
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
