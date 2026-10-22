"use client";

import { useState } from "react";
import { CircleNotch, SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Keluar harus lewat permintaan dari halaman ini sendiri: Better Auth menolak
 * permintaan ber-cookie yang tidak jelas asalnya, dan peramban mengirim header
 * `Origin` otomatis untuk permintaan dari halaman.
 */
export function SignOutButton({
  variant = "full",
  className,
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      // Navigasi penuh, bukan `router.push`: seluruh isi memori dan cache rute
      // milik akun sebelumnya dibuang, dan `replace` menjaga tombol kembali
      // tidak membuka lagi halaman yang sudah tidak boleh dilihat.
      window.location.replace("/masuk");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title={failed ? "Gagal keluar — coba lagi" : "Keluar"}
        aria-label="Keluar dari akun"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[9px] text-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60",
          failed && "text-clay hover:text-clay",
          className,
        )}
      >
        {busy ? (
          <CircleNotch size={14} className="animate-spin" />
        ) : (
          <SignOut size={14} />
        )}
      </button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={run}
      disabled={busy}
      className={className}
    >
      {busy ? (
        <CircleNotch size={14} className="animate-spin" />
      ) : (
        <SignOut size={14} />
      )}
      {busy ? "Keluar..." : "Keluar"}
    </Button>
  );
}
