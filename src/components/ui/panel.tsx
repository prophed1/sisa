import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "paper rounded-[24px] border border-line",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  caption,
  action,
  className,
  actionInline,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  className?: string;
  /** Aksi yang lebar boleh turun ke baris sendiri saat ruangnya sempit. */
  actionInline?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6",
        actionInline && "flex-wrap",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium tracking-[-0.02em]">{title}</h2>
        {caption ? (
          <p className="mt-1 text-[12px] leading-relaxed text-faint">{caption}</p>
        ) : null}
      </div>
      {action ? (
        <div className={cn("shrink-0", actionInline && "ml-auto")}>{action}</div>
      ) : null}
    </div>
  );
}
