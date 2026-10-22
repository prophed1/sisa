import type { Icon } from "@phosphor-icons/react";
import {
  ChartLineUp,
  EnvelopeSimple,
  FilePdf,
  PencilSimpleLine,
  Receipt,
  Scan,
  SlidersHorizontal,
  SquaresFour,
} from "@phosphor-icons/react";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  hint: string;
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Ringkasan",
    items: [
      {
        label: "Dasbor",
        href: "/",
        icon: SquaresFour,
        hint: "Ringkasan bulan berjalan",
      },
      {
        label: "Transaksi",
        href: "/transaksi",
        icon: Receipt,
        hint: "Cari, saring, dan kelola catatan",
      },
      {
        label: "Analisis",
        href: "/analisis",
        icon: ChartLineUp,
        hint: "Tren bulanan & kategori",
      },
      {
        label: "Laporan",
        href: "/laporan",
        icon: FilePdf,
        hint: "Rentang tanggal bebas, unduh PDF",
      },
    ],
  },
  {
    title: "Tangkap",
    items: [
      {
        label: "Catat manual",
        href: "/catat",
        icon: PencilSimpleLine,
        hint: "Tambahkan pengeluaran atau pemasukan",
      },
      {
        label: "Scan struk & QRIS",
        href: "/scan",
        icon: Scan,
        hint: "Isi otomatis dari foto struk",
      },
      {
        label: "Email bank",
        href: "/email",
        icon: EnvelopeSimple,
        hint: "Tarik mutasi dari email BSI",
      },
    ],
  },
  {
    title: "Lainnya",
    items: [
      {
        label: "Pengaturan",
        href: "/pengaturan",
        icon: SlidersHorizontal,
        hint: "Tema, ekspor, dan keamanan",
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  "/": "Dasbor",
  "/transaksi": "Transaksi",
  "/analisis": "Analisis",
  "/laporan": "Laporan",
  "/catat": "Catat manual",
  "/scan": "Scan struk & QRIS",
  "/email": "Email bank",
  "/pengaturan": "Pengaturan",
};
