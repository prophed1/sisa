import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockSimple, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandMark } from "@/components/brand-mark";
import { AuroraVeil, GlassOrb, PerspectiveGrid } from "@/components/ornaments/glass-orb";
import { getSessionUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Masuk — Sisa",
  description: "Masuk untuk melihat catatan pengeluaranmu.",
};

/**
 * Halaman ini membaca sesi, dan pembacaan sesi tidak bisa jadi bagian dari
 * kerangka statis — jadi rute ini memang menunggu server, seperti layout
 * ruang kerja.
 */
export const instant = false;

const POINTS = [
  {
    title: "Catatanmu, bukan catatan peramban",
    body: "Setiap transaksi tersimpan di akunmu, jadi bisa dibuka dari perangkat lain dan tidak hilang saat cache dibersihkan.",
  },
  {
    title: "Anggaran tetap dihitung ulang",
    body: "Dasbor, analisis, dan proyeksi akhir bulan bekerja sama seperti sebelumnya — hanya sumber datanya yang berpindah.",
  },
  {
    title: "Impor dan ekspor CSV tetap ada",
    body: "Unduh seluruh ledger sebagai CSV kapan pun, atau tarik mutasi bank ke dalamnya.",
  },
];

export default async function MasukPage() {
  // Yang sudah punya sesi tidak perlu melihat formulir lagi. Tanpa ini, siapa
  // pun yang mendarat di sini dengan sesi aktif (mis. setelah pendaftaran yang
  // navigasinya gagal) akan tertahan di layar masuk tanpa jalan keluar.
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.02fr_0.98fr]">
      <div className="flex flex-col px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-semibold leading-none tracking-[-0.02em]">
            Sisa
          </span>
        </div>

        <div className="mt-auto mb-auto w-full max-w-[380px] py-12">
          <p className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint">
            <span className="size-[5px] rounded-full bg-pine" />
            Akun Sisa
          </p>
          <h1 className="mt-3 text-[30px] font-medium leading-[1.05] tracking-[-0.045em] sm:text-[36px]">
            Masuk, lalu lanjutkan catatanmu.
          </h1>
          <p className="mt-2.5 max-w-[46ch] text-[13px] leading-relaxed text-muted">
            Satu akun untuk seluruh catatanmu. Catatan yang sekarang ada di
            peramban ini dipindahkan ke akun pertama yang kamu buat di sini.
          </p>

          <div className="mt-7">
            <AuthForm />
          </div>

          <p className="mt-5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
            <LockSimple size={12} className="mt-px shrink-0" />
            Kata sandi disimpan sebagai hash oleh Better Auth di database
            pribadimu; tidak ada layanan lain yang melihatnya.
          </p>
        </div>

        <p className="text-[10.5px] text-faint">Sisa — pelacak pengeluaran</p>
      </div>

      <aside className="relative hidden flex-col justify-center gap-7 overflow-hidden border-l border-[var(--night-line)] bg-[var(--night)] px-12 py-14 text-[#F7F2FF] lg:flex xl:px-16">
        <AuroraVeil />
        <PerspectiveGrid className="h-[42%] opacity-70" />

        <div className="relative z-10 flex flex-col gap-7">
          <GlassOrb className="w-[132px]" tone="rose" />

          <div className="max-w-[42ch]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[10.5px] text-[#F7F2FF]/75">
              <Sparkle size={12} weight="fill" className="text-[#F8B6D2]" />
              Catatan lokal ikut pindah ke akunmu
            </span>
            <p className="mt-5 text-[21px] font-medium leading-snug tracking-[-0.03em] text-[#FFFDFF]">
              Yang tadinya hidup di satu peramban kini mengikuti akunmu.
            </p>
          </div>

          <dl className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {POINTS.map((point) => (
              <div key={point.title} className="py-3.5">
                <dt className="text-[12.5px] font-medium text-[#FFFDFF]">
                  {point.title}
                </dt>
                <dd className="mt-1 max-w-[52ch] text-[11.5px] leading-relaxed text-[#F7F2FF]/60">
                  {point.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
