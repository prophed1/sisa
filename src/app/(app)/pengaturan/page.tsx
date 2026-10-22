import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const metadata: Metadata = {
  title: "Pengaturan — Sisa",
  description:
    "Atur anggaran bulanan, tema tampilan, dan unduh cadangan catatan dalam format CSV.",
};

export default function PengaturanPage() {
  return <SettingsWorkspace />;
}
