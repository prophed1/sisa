import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "icon" | "smIcon";

/* Tombol nonaktif turun ke permukaan netral, bukan versi pudar dari warna
 * aksen — teks putih di atas biru 45% tidak terbaca. */
const idle = "disabled:bg-surface-2 disabled:text-faint disabled:shadow-none";

const variants: Record<Variant, string> = {
  primary: `bg-pine text-[#FFF7EF] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(4,6,16,0.35)] hover:bg-pine-hover dark:text-[#0f1420] ${idle}`,
  secondary: `border border-line bg-surface text-ink shadow-[var(--shadow-panel)] hover:bg-surface-2 ${idle}`,
  ghost: "text-muted hover:bg-surface-2 hover:text-ink disabled:text-faint",
  quiet: "bg-surface-2 text-ink hover:bg-surface-3 disabled:text-faint",
  danger: `bg-clay text-[#FFF7EF] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(4,6,16,0.3)] hover:brightness-[1.06] dark:text-[#0f1420] ${idle}`,
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-[9px] px-3 text-[12px]",
  md: "h-9 gap-2 rounded-[10px] px-3.5 text-[13px]",
  icon: "size-9 rounded-[10px]",
  smIcon: "size-8 rounded-[9px]",
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
