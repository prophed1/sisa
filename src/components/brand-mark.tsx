import { cn } from "@/lib/utils";

/**
 * Tanda merek: potongan langit malam kecil — ultramarine, satu bintang krom,
 * dan huruf S yang digambar seperti satu tarikan kuas.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-[34px] place-items-center overflow-hidden rounded-[11px]",
        "bg-[linear-gradient(155deg,#2c4f96_0%,#18316b_46%,#0a1734_100%)]",
        "ring-1 ring-inset ring-[#f2c14e]/35",
        "shadow-[inset_0_1px_0_rgba(255,247,222,0.22),0_10px_24px_-14px_rgba(242,193,78,0.55)]",
        className,
      )}
    >
      {/* Semburat bintang di sudut kanan atas. */}
      <span className="pointer-events-none absolute -right-2 -top-3 size-7 rounded-full bg-[#f2c14e]/30 blur-[6px]" />
      <span className="pointer-events-none absolute right-[5px] top-[5px] size-[3px] rounded-full bg-[#fff6d8]" />
      <svg viewBox="0 0 24 24" fill="none" className="relative size-[20px]">
        <path
          d="M7.2 9.1c0-2.4 1.9-4.3 4.3-4.3h5.3"
          stroke="#fdf6df"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M16.8 14.9c0 2.4-1.9 4.3-4.3 4.3H7.2"
          stroke="#f7e3a4"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="16.7" cy="9.1" r="1.35" fill="#f2c14e" />
      </svg>
    </span>
  );
}
