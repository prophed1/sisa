import type { CategoryKey } from "@/lib/types";

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  makanan: {
    label: "Makanan & minuman",
    shortLabel: "Makanan",
    color: "#F0B84C",
    description: "Kopi, makan, pesan antar",
  },
  belanja: {
    label: "Belanja",
    shortLabel: "Belanja",
    color: "#5C9BE0",
    description: "Kebutuhan rumah & daring",
  },
  tagihan: {
    label: "Tagihan",
    shortLabel: "Tagihan",
    color: "#E07A6B",
    description: "Listrik, internet, sewa",
  },
  transportasi: {
    label: "Transportasi",
    shortLabel: "Transportasi",
    color: "#6FB6B0",
    description: "Ojek, BBM, parkir",
  },
  hiburan: {
    label: "Hiburan",
    shortLabel: "Hiburan",
    color: "#9B86D9",
    description: "Film, langganan, hobi",
  },
  kesehatan: {
    label: "Kesehatan",
    shortLabel: "Kesehatan",
    color: "#7FA98B",
    description: "Obat & kunjungan",
  },
  lainnya: {
    label: "Lainnya",
    shortLabel: "Lainnya",
    color: "#98A3B8",
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
