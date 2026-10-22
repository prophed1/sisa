import type { Metadata } from "next";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";

export const metadata: Metadata = { title: "Transaksi — Sisa" };

export default function TransaksiPage() {
  return <TransactionsWorkspace />;
}
