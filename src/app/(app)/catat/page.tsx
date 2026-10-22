import type { Metadata } from "next";
import { CatatWorkspace } from "@/components/ledger/catat-workspace";

export const metadata: Metadata = { title: "Catat manual — Sisa" };

export default function CatatPage() {
  return <CatatWorkspace />;
}
