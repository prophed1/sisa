import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[34px] place-items-center rounded-[10px] bg-[#33122C] ring-1 ring-inset ring-white/12",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[20px]">
        <path
          d="M7.2 9.1c0-2.4 1.9-4.3 4.3-4.3h5.3"
          stroke="#FFF4EB"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M16.8 14.9c0 2.4-1.9 4.3-4.3 4.3H7.2"
          stroke="#A6BCC9"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="16.7" cy="9.1" r="1.35" fill="#F6E0B6" />
      </svg>
    </span>
  );
}
