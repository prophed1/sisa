"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker kosong (lihat `public/sw.js`) supaya Sisa bisa
 * dipasang ke layar utama. Hanya di produksi: di mode pengembangan, service
 * worker hanya menambah lapisan yang membingungkan saat memuat ulang.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pemasangan tetap bisa ditawarkan; kegagalan registrasi bukan alasan
        // mengganggu pengguna dengan pesan.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
