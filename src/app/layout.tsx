import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { RegisterServiceWorker } from "@/components/providers/register-service-worker";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sisa — Pelacak pengeluaran",
  description:
    "Satu tempat yang tenang untuk melihat ke mana uangmu pergi setiap bulan.",
  applicationName: "Sisa",
  // Dipasang ke layar utama iOS: judul di bawah ikon dan status bar malam.
  appleWebApp: {
    capable: true,
    title: "Sisa",
    // Bilah status gelap, bukan tembus pandang: isi halaman tidak perlu
    // diberi jarak tambahan untuk notch di mode aplikasi.
    statusBarStyle: "black",
  },
  // iOS versi lama hanya mengenali nama meta yang berawalan "apple-".
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ead3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1226" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-[100dvh] bg-canvas font-sans text-ink antialiased">
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
