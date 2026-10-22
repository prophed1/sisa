import type { Metadata } from "next";
import { ReportWorkspace } from "@/components/report/report-workspace";

export const metadata: Metadata = { title: "Laporan — Sisa" };

export default function LaporanPage() {
  return <ReportWorkspace />;
}
