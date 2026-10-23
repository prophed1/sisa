/*
 * Service worker sengaja kosong: tidak ada cache, tidak ada strategi offline.
 * Kehadirannya hanya memenuhi syarat pemasangan aplikasi di Android, dan
 * seluruh permintaan tetap langsung ke jaringan — data keuangan tidak boleh
 * disajikan dari salinan lama di perangkat.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Tanpa respondWith: peramban memakai jalur jaringan seperti biasa.
});
