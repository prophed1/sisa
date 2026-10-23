import { cn } from "@/lib/utils";

/**
 * Tanda merek: kotak kaca kecil dengan cahaya violet di kiri atas dan satu
 * titik rose. Sama seperti orb di dasbor, semuanya gradien CSS.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-[34px] place-items-center overflow-hidden rounded-[11px]",
        "bg-[linear-gradient(150deg,#8e6ae8_0%,#5a3fa6_46%,#2a1a4a_100%)]",
        "ring-1 ring-inset ring-white/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_-14px_rgba(138,104,232,0.9)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute -left-3 -top-4 size-8 rounded-full bg-white/25 blur-[8px]" />
      <svg viewBox="0 0 24 24" fill="none" className="relative size-[20px]">
        <path
          d="M7.2 9.1c0-2.4 1.9-4.3 4.3-4.3h5.3"
          stroke="#FAF7FF"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M16.8 14.9c0 2.4-1.9 4.3-4.3 4.3H7.2"
          stroke="#E9DEFF"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="16.7" cy="9.1" r="1.35" fill="#F8B6D2" />
      </svg>
    </span>
  );
}
