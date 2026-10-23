import type { CategoryKey } from "@/lib/types";

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  makanan: {
    label: "Makanan & minuman",
    shortLabel: "Makanan",
    color: "#8B6FF0",
    description: "Kopi, makan, pesan antar",
  },
  belanja: {
    label: "Belanja",
    shortLabel: "Belanja",
    color: "#3FB8A6",
    description: "Kebutuhan rumah & daring",
  },
  tagihan: {
    label: "Tagihan",
    shortLabel: "Tagihan",
    color: "#E06AA6",
    description: "Listrik, internet, sewa",
  },
  transportasi: {
    label: "Transportasi",
    shortLabel: "Transportasi",
    color: "#D9A244",
    description: "Ojek, BBM, parkir",
  },
  hiburan: {
    label: "Hiburan",
    shortLabel: "Hiburan",
    color: "#4F93E0",
    description: "Film, langganan, hobi",
  },
  kesehatan: {
    label: "Kesehatan",
    shortLabel: "Kesehatan",
    color: "#5FAE7F",
    description: "Obat & kunjungan",
  },
  lainnya: {
    label: "Lainnya",
    shortLabel: "Lainnya",
    color: "#8D83A8",
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
