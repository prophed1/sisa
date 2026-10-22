import type { Metadata } from "next";
import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";

export const metadata: Metadata = {
  title: "Analisis — Sisa",
  description:
    "Pola belanja harian, ritme mingguan, merchant, dan kategori dari ledger yang sama.",
};

export default function AnalisisPage() {
  return <AnalysisWorkspace />;
}
