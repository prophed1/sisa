import type { MetadataRoute } from "next";

/**
 * Manifest membuat Sisa bisa dipasang ke layar utama dan dibuka tanpa bilah
 * peramban. Warna mengikuti tema malam supaya layar pembuka tidak berkedip
 * putih sebelum aplikasi siap.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sisa — Pelacak pengeluaran",
    short_name: "Sisa",
    description:
      "Satu tempat yang tenang untuk melihat ke mana uangmu pergi setiap bulan.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1226",
    theme_color: "#0a1226",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
