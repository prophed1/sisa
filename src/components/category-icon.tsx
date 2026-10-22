"use client";

import {
  Bus,
  DotsThree,
  EnvelopeSimple,
  FilmSlate,
  FirstAid,
  ForkKnife,
  PencilSimpleLine,
  Receipt,
  Scan,
  ShoppingBag,
  Wallet,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { CategoryKey, TransactionSource } from "@/lib/types";

const categoryIcons = {
  makanan: ForkKnife,
  transportasi: Bus,
  belanja: ShoppingBag,
  tagihan: Receipt,
  hiburan: FilmSlate,
  kesehatan: FirstAid,
  lainnya: DotsThree,
} satisfies Record<CategoryKey, Icon>;

export function CategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: CategoryKey;
  size?: number;
  className?: string;
}) {
  const Component = categoryIcons[category] ?? DotsThree;
  return <Component size={size} weight="regular" className={className} />;
}

const sourceMeta = {
  manual: { label: "Manual", icon: PencilSimpleLine },
  email: { label: "Email BSI", icon: EnvelopeSimple },
  scan: { label: "Struk", icon: Scan },
  system: { label: "Sistem", icon: Wallet },
} satisfies Record<TransactionSource, { label: string; icon: Icon }>;

export function SourceIcon({
  source,
  size = 12,
  className,
}: {
  source: TransactionSource;
  size?: number;
  className?: string;
}) {
  const meta = sourceMeta[source];
  const Component = meta.icon;
  return <Component size={size} weight="regular" className={className} />;
}

export function sourceLabel(source: TransactionSource) {
  return sourceMeta[source].label;
}
