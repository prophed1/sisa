const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Rp 8.427.500 — full rupiah, no decimals. */
export function formatIDR(value: number): string {
  return idr.format(value).replace(/\u00a0/g, " ");
}

/** 8.427.500 — grouped number without the currency prefix. */
export function formatNumber(value: number): string {
  return plain.format(value);
}

/** Rp 8,4 jt / Rp 684 rb — compact, for chart axes and tight rows. */
export function formatCompactIDR(value: number): string {
  if (value === 0) return "Rp 0";
  if (value >= 1_000_000_000) {
    return `Rp ${trim(value / 1_000_000_000)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${trim(value / 1_000_000)} jt`;
  }
  if (value >= 1_000) {
    return `Rp ${trim(value / 1_000)} rb`;
  }
  return `Rp ${plain.format(value)}`;
}

function trim(value: number): string {
  return value
    .toFixed(value >= 10 ? 0 : 1)
    .replace(".", ",")
    .replace(/,0$/, "");
}

/** +12,4% / −4,1% */
export function formatDelta(value: number): string {
  const formatted = Math.abs(value).toFixed(1).replace(".", ",");
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}%`;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
