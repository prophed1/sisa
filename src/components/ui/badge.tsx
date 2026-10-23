import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "pine" | "clay" | "sand" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-muted",
  pine: "bg-pine/15 text-pine ring-1 ring-inset ring-pine/25",
  clay: "bg-clay/15 text-clay ring-1 ring-inset ring-clay/25",
  sand: "bg-sand/15 text-sand-ink ring-1 ring-inset ring-sand/25",
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
