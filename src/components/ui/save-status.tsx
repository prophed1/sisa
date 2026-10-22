"use client";

import { CloudCheck, CloudSlash, CircleNotch } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { useLedger } from "@/lib/ledger-store";

/**
 * Keadaan penyimpanan yang jujur: pengguna berhak tahu kalau perubahannya
 * belum sampai ke server, bukan hanya melihat "tersimpan" yang selalu hijau.
 */
export function SaveStatusBadge({ className }: { className?: string }) {
  const { status } = useLedger();

  if (status === "error") {
    return (
      <Badge tone="clay" className={className}>
        <CloudSlash size={12} />
        Gagal menyimpan
      </Badge>
    );
  }

  if (status === "saving") {
    return (
      <Badge tone="outline" className={className}>
        <CircleNotch size={12} className="animate-spin" />
        Menyimpan
      </Badge>
    );
  }

  return (
    <Badge tone="outline" className={className}>
      <CloudCheck size={12} />
      Tersimpan di akun
    </Badge>
  );
}
