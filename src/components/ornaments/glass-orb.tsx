import { cn } from "@/lib/utils";

/**
 * Ornamen 3D yang digambar sepenuhnya dengan CSS: bola kaca, dua orbit
 * miring, dan pantulan lantai. Tidak ada dependensi WebGL — semuanya gradien
 * bertumpuk yang dirender sekali, jadi hero tetap ringan dan tetap terbaca
 * saat animasi dimatikan.
 */
export function GlassOrb({
  className,
  tone = "violet",
}: {
  className?: string;
  tone?: "violet" | "rose";
}) {
  const rose = tone === "rose";

  return (
    <div className={cn("relative aspect-square", className)} aria-hidden>
      {/* Halo di luar bola: satu-satunya cahaya yang benar-benar menyebar. */}
      <div
        className={cn(
          "absolute inset-[-18%] rounded-full blur-3xl",
          rose
            ? "bg-[radial-gradient(circle_at_42%_34%,rgba(240,150,196,0.42),rgba(180,90,150,0.18)_48%,transparent_72%)]"
            : "bg-[radial-gradient(circle_at_42%_34%,rgba(186,158,255,0.5),rgba(120,86,220,0.2)_48%,transparent_72%)]",
        )}
      />

      <div className="absolute inset-0 animate-[float-slow_16s_ease-in-out_infinite] [transform-style:preserve-3d]">
        {/* Dua orbit: cukup untuk memberi kedalaman, tidak sampai jadi planet. */}
        <div className="absolute inset-[-9%] rounded-full border border-white/14 [transform:rotateX(74deg)_rotateZ(-16deg)]" />
        <div className="absolute inset-[-1%] rounded-full border border-white/8 [transform:rotateX(71deg)_rotateZ(34deg)]" />

        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-full border border-white/25",
            "shadow-[inset_-16px_-22px_48px_rgba(5,3,14,0.9),inset_12px_14px_34px_rgba(255,255,255,0.2),0_34px_70px_-26px_rgba(120,80,220,0.55)]",
            rose
              ? "bg-[radial-gradient(circle_at_32%_24%,#fff1f7_0%,#f6c6dd_13%,#cf7fae_38%,#5c2a4c_66%,#1b0f1d_90%)]"
              : "bg-[radial-gradient(circle_at_32%_24%,#f8f1ff_0%,#d3bcff_13%,#8f68e0_38%,#3a2668_66%,#140e25_90%)]",
          )}
        >
          {/* Inti bercahaya di balik kaca. */}
          <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_38%_30%,rgba(255,255,255,0.42),transparent_58%)] blur-md" />
          {/* Pita hangat di kaki bola, seperti cahaya yang memantul dari bawah. */}
          <div
            className={cn(
              "absolute inset-x-[-12%] bottom-[4%] h-[42%] rounded-[50%] blur-[3px]",
              rose
                ? "bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,206,228,0.5),transparent_70%)]"
                : "bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,176,214,0.4),transparent_70%)]",
            )}
          />
          {/* Kilau utama dan satu titik kecil di sisi terang. */}
          <div className="absolute left-[19%] top-[13%] h-[17%] w-[29%] -rotate-[22deg] rounded-full bg-white/70 blur-[7px]" />
          <div className="absolute left-[54%] top-[19%] size-[5%] rounded-full bg-white/75 blur-[1px]" />
          {/* Bibir kaca: garis terang tipis di tepi kanan bawah. */}
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
        </div>
      </div>
    </div>
  );
}

/** Lantai kisi dalam perspektif: mengisi kaki panel tanpa menambah gambar. */
export function PerspectiveGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-[52%] [perspective:220px]",
        className,
      )}
    >
      <div
        className="absolute inset-x-[-30%] bottom-[-18%] top-0 origin-bottom [transform:rotateX(64deg)] bg-[linear-gradient(to_right,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.16)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:linear-gradient(to_top,black_10%,transparent_78%)] opacity-45"
      />
    </div>
  );
}

/** Kabut dua warna untuk panel malam; diam, hanya memberi suhu. */
export function AuroraVeil({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="absolute -left-24 -top-28 size-[340px] animate-[drift-glow_18s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(150,110,255,0.34),transparent_68%)] blur-2xl" />
      <div className="absolute -right-24 top-6 size-[300px] animate-[drift-glow_22s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(226,120,170,0.2),transparent_70%)] blur-2xl" />
    </div>
  );
}
