import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "pine" | "clay" | "sand" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  pine: "bg-pine-soft text-pine",
  clay: "bg-clay-soft text-clay",
  sand: "bg-sand-soft text-sand-ink",
  outline: "border border-line bg-transparent text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[10.5px] font-medium tracking-[0.01em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
