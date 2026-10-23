import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "icon" | "smIcon";

/* Tombol nonaktif turun ke permukaan netral, bukan versi pudar dari warna
 * aksen — teks putih di atas biru 45% tidak terbaca. */
const idle = "disabled:bg-surface-2 disabled:text-faint disabled:shadow-none";

const variants: Record<Variant, string> = {
  primary: `bg-pine text-[#FFF7EF] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-14px_rgba(242,193,78,0.55)] hover:bg-pine-hover dark:text-[#141024] ${idle}`,
  secondary: `border border-line bg-surface/80 text-ink shadow-[var(--shadow-panel)] backdrop-blur-md hover:bg-surface-2 ${idle}`,
  ghost: "text-muted hover:bg-ink/[0.06] hover:text-ink disabled:text-faint",
  quiet: "bg-surface-2 text-ink hover:bg-surface-3 disabled:text-faint",
  danger: `bg-clay text-[#FFF6E8] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_24px_-16px_rgba(236,129,104,0.7)] hover:brightness-[1.06] dark:text-[#2a0d15] ${idle}`,
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-full px-3.5 text-[12px]",
  md: "h-9 gap-2 rounded-full px-4 text-[13px]",
  icon: "size-9 rounded-full",
  smIcon: "size-8 rounded-full",
};

export const buttonStyles = ({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) =>
  cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,color,border-color,transform,opacity] duration-200 ease-out active:scale-[0.985] disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
