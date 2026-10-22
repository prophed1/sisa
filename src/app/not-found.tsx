import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/brand-mark";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[14px] font-semibold tracking-[-0.02em]">
            Sisa
          </span>
        </div>

        <p className="mt-10 font-mono text-[11px] tracking-[0.1em] text-faint">
          404
        </p>
        <h1 className="mt-2 text-[26px] font-medium leading-tight tracking-[-0.03em]">
          Halaman ini belum ada di catatan.
        </h1>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
          Tautan mungkin sudah berpindah, atau alamatnya salah ketik.
        </p>

        <Link
          href="/"
          className={buttonStyles({
            variant: "primary",
            className: "mt-7",
          })}
        >
          <ArrowLeft size={14} />
          Kembali ke dasbor
        </Link>
      </div>
    </main>
  );
}
