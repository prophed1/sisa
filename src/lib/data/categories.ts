import type { CategoryKey } from "@/lib/types";

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  makanan: {
    label: "Makanan & minuman",
    shortLabel: "Makanan",
    color: "#46539B",
    description: "Kopi, makan, pesan antar",
  },
  belanja: {
    label: "Belanja",
    shortLabel: "Belanja",
    color: "#7C99AD",
    description: "Kebutuhan rumah & daring",
  },
  tagihan: {
    label: "Tagihan",
    shortLabel: "Tagihan",
    color: "#7A3F6B",
    description: "Listrik, internet, sewa",
  },
  transportasi: {
    label: "Transportasi",
    shortLabel: "Transportasi",
    color: "#C9A45E",
    description: "Ojek, BBM, parkir",
  },
  hiburan: {
    label: "Hiburan",
    shortLabel: "Hiburan",
    color: "#9A5E7E",
    description: "Film, langganan, hobi",
  },
  kesehatan: {
    label: "Kesehatan",
    shortLabel: "Kesehatan",
    color: "#8FA8B8",
    description: "Obat & kunjungan",
  },
  lainnya: {
    label: "Lainnya",
    shortLabel: "Lainnya",
    color: "#A08C7C",
    description: "Biaya tak terduga",
  },
};

export const CATEGORY_ORDER: CategoryKey[] = [
  "makanan",
  "belanja",
  "tagihan",
  "transportasi",
  "hiburan",
  "kesehatan",
  "lainnya",
];
