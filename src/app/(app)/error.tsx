"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-[460px] p-7 text-center sm:p-9">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-clay-soft text-clay">
          <WarningCircle size={20} />
        </span>
        <h1 className="mt-5 text-[19px] font-medium tracking-[-0.02em]">
          Halaman ini tidak bisa dimuat
        </h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-[12.5px] leading-relaxed text-muted">
          Ada gangguan saat mengambil data. Coba muat ulang; catatan yang sudah
          tersimpan tidak terpengaruh.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[10px] text-faint">
            kode: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            <ArrowClockwise size={14} />
            Coba lagi
          </Button>
          <Button variant="secondary" onClick={() => router.push("/")}>
            Ke dasbor
          </Button>
        </div>
      </Panel>
    </div>
  );
}
