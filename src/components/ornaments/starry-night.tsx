import { cn } from "@/lib/utils";

/**
 * Ornamen "malam berbintang" — semuanya digambar dengan CSS dan SVG, tanpa
 * dependensi WebGL atau gambar raster. Setiap potongan dirender sekali di
 * server, jadi hero tetap ringan dan tetap utuh saat animasi dimatikan.
 */

/** Bintang kecil dengan posisi tetap supaya HTML server dan klien sama. */
const STARS = [
  { x: 6, y: 14, size: 3, delay: 0, duration: 5 },
  { x: 13, y: 38, size: 2, delay: 1.4, duration: 6 },
  { x: 21, y: 9, size: 2.5, delay: 0.8, duration: 4.5 },
  { x: 28, y: 27, size: 2, delay: 2.1, duration: 5.5 },
  { x: 35, y: 63, size: 2.5, delay: 0.4, duration: 6.5 },
  { x: 41, y: 12, size: 2, delay: 1.9, duration: 5 },
  { x: 49, y: 44, size: 3, delay: 0.6, duration: 6 },
  { x: 55, y: 78, size: 2, delay: 2.4, duration: 4.8 },
  { x: 61, y: 18, size: 2.5, delay: 1.1, duration: 5.6 },
  { x: 67, y: 52, size: 2, delay: 0.2, duration: 6.2 },
  { x: 73, y: 8, size: 2, delay: 1.6, duration: 5.2 },
  { x: 79, y: 34, size: 3, delay: 2.7, duration: 6.8 },
  { x: 86, y: 70, size: 2, delay: 0.9, duration: 5.4 },
  { x: 92, y: 22, size: 2.5, delay: 2, duration: 4.6 },
  { x: 96, y: 48, size: 2, delay: 0.5, duration: 6.1 },
  { x: 17, y: 82, size: 2, delay: 1.3, duration: 5.9 },
];

const SPARKLES = [
  { x: 24, y: 46, size: 11, delay: 0.3 },
  { x: 58, y: 12, size: 8, delay: 1.8 },
  { x: 81, y: 60, size: 13, delay: 1 },
];

function Sparkle({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 0.6 13.9 10.1 23.4 12 13.9 13.9 12 23.4 10.1 13.9 0.6 12 10.1 10.1Z" />
    </svg>
  );
}

/** Medan bintang: titik kecil berkelip, plus tiga kilau bersudut empat. */
export function StarField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {STARS.map((star, index) => (
        <span
          key={`star-${index}`}
          className="absolute rounded-full bg-[#f8ecc4]"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      {SPARKLES.map((sparkle, index) => (
        <span
          key={`sparkle-${index}`}
          className="absolute text-[#f7e3a4]"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animation: `twinkle ${6 + index}s ease-in-out ${sparkle.delay}s infinite`,
          }}
        >
          <Sparkle size={sparkle.size} />
        </span>
      ))}
    </div>
  );
}

function spiralPath({
  cx,
  cy,
  turns,
  from,
  to,
  rotation,
  squash = 1,
  steps = 130,
}: {
  cx: number;
  cy: number;
  turns: number;
  from: number;
  to: number;
  rotation: number;
  squash?: number;
  steps?: number;
}) {
  let path = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = rotation + t * turns * Math.PI * 2;
    const radius = from + (to - from) * t;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * squash;
    path += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path;
}

const SWIRLS = [
  {
    lead: spiralPath({ cx: 250, cy: 150, turns: 2.15, from: 6, to: 108, rotation: 0.6 }),
    echo: spiralPath({ cx: 250, cy: 150, turns: 2.05, from: 16, to: 126, rotation: 0.75 }),
    width: 5,
  },
  {
    lead: spiralPath({ cx: 520, cy: 262, turns: 2.4, from: 4, to: 86, rotation: 2.4, squash: 0.8 }),
    echo: spiralPath({ cx: 520, cy: 262, turns: 2.25, from: 14, to: 100, rotation: 2.55, squash: 0.8 }),
    width: 4,
  },
  {
    lead: spiralPath({ cx: 92, cy: 300, turns: 1.8, from: 3, to: 62, rotation: 3.4 }),
    echo: null,
    width: 3,
  },
];

/**
 * Pusaran langit: tiga spiral berlapis, digambar sebagai garis kuas tipis.
 * Opasitasnya sengaja rendah — ini latar, bukan ilustrasi yang berebut
 * perhatian dengan angka.
 */
export function SwirlSky({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden animate-[swirl-drift_26s_ease-in-out_infinite]",
        className,
      )}
    >
      <svg
        viewBox="0 0 640 420"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        fill="none"
      >
        {SWIRLS.map((swirl, index) => (
          <g key={`swirl-${index}`}>
            <path
              d={swirl.lead}
              stroke="#f9e9b8"
              strokeWidth={swirl.width * 1.8}
              strokeOpacity={0.09}
              strokeLinecap="round"
            />
            <path
              d={swirl.lead}
              stroke="#fdf3d2"
              strokeWidth={swirl.width * 0.9}
              strokeOpacity={0.2}
              strokeLinecap="round"
            />
            <path
              d={swirl.lead}
              stroke="#f7e3a4"
              strokeWidth={1.5}
              strokeOpacity={0.34}
              strokeLinecap="round"
            />
            {swirl.echo ? (
              <>
                <path
                  d={swirl.echo}
                  stroke="#8fb4e8"
                  strokeWidth={2.6}
                  strokeOpacity={0.14}
                  strokeLinecap="round"
                />
                <path
                  d={swirl.echo}
                  stroke="#a9c6ee"
                  strokeWidth={1.1}
                  strokeOpacity={0.22}
                  strokeLinecap="round"
                />
              </>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Semburat kuas di sekeliling bintang besar, diputar sangat pelan. */
const CORONA = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2;
  const radius = index % 3 === 0 ? 45 : 44;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
    width: 12 + (index % 4) * 4,
    height: 3 + (index % 3),
    rotate: (angle * 180) / Math.PI,
  };
});

/**
 * Bintang besar seperti di lukisan: inti krem, cincin cat tebal, dan semburat
 * kuning krom di sekelilingnya.
 */
export function GreatStar({
  className,
  tone = "gold",
}: {
  className?: string;
  tone?: "gold" | "moon";
}) {
  const moon = tone === "moon";
  const core = moon ? "#fdf6dc" : "#fff8e0";
  const mid = moon ? "#f6e7ae" : "#f7d97f";
  const edge = moon ? "#e9c264" : "#edb845";

  // Pemanggil menentukan posisinya (absolute/fixed); tanpa itu anak-anak
  // absolut di dalamnya tidak punya acuan.
  return (
    <div aria-hidden className={cn("aspect-square", className)}>
      <div
        className="absolute inset-[-38%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${edge}59, transparent 66%)`,
        }}
      />

      <div className="absolute inset-0 animate-[halo-spin_180s_linear_infinite]">
        {CORONA.map((dab, index) => (
          <span
            key={`dab-${index}`}
            className="absolute rounded-full"
            style={{
              left: `${dab.x}%`,
              top: `${dab.y}%`,
              width: `${dab.width}%`,
              height: `${dab.height}%`,
              background: index % 2 === 0 ? edge : core,
              opacity: index % 3 === 0 ? 0.5 : 0.26,
              transform: `translate(-50%, -50%) rotate(${dab.rotate}deg)`,
              filter: "blur(0.4px)",
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-[6%] rounded-full shadow-[inset_0_0_28px_rgba(255,251,232,0.4)]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${core} 0%, ${mid} 42%, ${edge} 66%, ${edge}00 82%)`,
        }}
      />
      <div className="absolute inset-[13%] rounded-full border-[2.5px] border-[#fff8e0]/45" />
      <div className="absolute inset-[27%] rounded-full border-[1.5px] border-[#fff8e0]/30" />
      <div className="absolute inset-[40%] rounded-full bg-[#fffbe9]/45 blur-[2px]" />
    </div>
  );
}

/**
 * Siluet cemara: bentuk api yang sempit, gelap hampir hitam, dengan beberapa
 * goresan hijau tua. Ditempatkan di tepi panel supaya terasa seperti bingkai
 * lukisan, bukan ikon.
 */
export function Cypress({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none", className)}>
      {/* Cahaya tipis di belakang cemara supaya siluetnya lepas dari langit. */}
      <div className="absolute inset-x-[-40%] bottom-0 top-[10%] bg-[radial-gradient(ellipse_at_50%_60%,rgba(96,150,120,0.22),transparent_70%)] blur-2xl" />
      <svg viewBox="0 0 120 400" className="relative size-full" fill="none">
        <path
          d="M61 2c-9 26-2 46-12 68-9 20-2 34-11 54-10 22-1 38-10 60-8 19-2 37-11 56-7 15-3 33-8 52-4 15-2 32-6 48h84c-4-16-2-33-6-48-5-19-1-37-8-52-9-19-3-37-11-56-9-22 0-38-10-60-9-20 0-34-9-54-10-22-3-42-12-68Z"
          fill="#08161b"
        />
        <path
          d="M58 26c-4 34 4 58-4 88-7 26 2 46-5 72-7 25 1 45-6 70-6 22 1 42-5 64"
          stroke="#1e3a30"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        <path
          d="M72 44c4 30-3 52 4 80 6 24-2 42 4 66 6 22-1 40 5 62 5 18 1 34 5 48"
          stroke="#2a4433"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
        <path
          d="M50 70c-3 22 1 40-4 60"
          stroke="#3d4a33"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
        {/* Rim light: tepi yang terkena cahaya bintang. */}
        <path
          d="M61 2c-9 26-2 46-12 68-9 20-2 34-11 54-10 22-1 38-10 60-8 19-2 37-11 56-7 15-3 33-8 52-4 15-2 32-6 48"
          stroke="#7fa08a"
          strokeWidth="1.6"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** Bukit gelap dengan kampung kecil dan menara gereja — kaki langit lukisan. */
export function NightVillage({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none", className)}>
      <svg
        viewBox="0 0 320 96"
        preserveAspectRatio="xMidYMax slice"
        className="size-full"
        fill="none"
      >
        <path
          d="M0 54c30-12 48-6 74-14 22-7 40-2 62-10 26-9 48-4 74-12 30-9 54 0 82-6 12-3 20-2 28-1v85H0Z"
          fill="#0a1a22"
        />
        <path
          d="M0 72c34-8 56-2 86-10 26-7 46-2 72-8 30-7 54 1 86-6 26-5 46-1 76-6v54H0Z"
          fill="#071319"
        />
        <path d="M176 54V20l7-14 7 14v34Z" fill="#0b1c20" />
        <path d="M176 20l7-14 7 14Z" fill="#14282a" />
        <rect x="150" y="64" width="16" height="12" fill="#0b1c20" />
        <rect x="196" y="68" width="20" height="12" fill="#0b1c20" />
        <rect x="118" y="70" width="14" height="10" fill="#0b1c20" />
        <rect x="232" y="66" width="24" height="14" fill="#0b1c20" />
        <rect x="153" y="68" width="4" height="4" fill="#f2c14e" fillOpacity="0.85" />
        <rect x="202" y="72" width="4" height="4" fill="#f2c14e" fillOpacity="0.7" />
        <rect x="238" y="70" width="4" height="4" fill="#f2c14e" fillOpacity="0.6" />
        <rect x="122" y="73" width="4" height="4" fill="#f2c14e" fillOpacity="0.55" />
      </svg>
    </div>
  );
}

/** Semburat cahaya dua warna untuk panel malam; diam, hanya memberi suhu. */
export function NightGlow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="absolute -left-24 -top-28 size-[340px] animate-[drift-glow_20s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(76,127,208,0.34),transparent_68%)] blur-2xl" />
      <div className="absolute -right-24 top-6 size-[300px] animate-[drift-glow_24s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(242,193,78,0.22),transparent_70%)] blur-2xl" />
    </div>
  );
}
