/**
 * OCR berjalan di perangkat pengguna, bukan di server: gambar struk tidak
 * pernah diunggah ke mana pun. Mesinnya Tesseract.js yang dimuat dari CDN
 * hanya saat halaman scan benar-benar dipakai.
 *
 * Catatan: PRD menyebut Paxsenix API, tetapi host `api.paxsenix.biz.id` tidak
 * bisa dihubungi (DNS gagal) saat fitur ini dibuat. Karena itu jalur OCR
 * dipisah di berkas ini: kalau Paxsenix kembali tersedia, cukup ganti isi
 * `readImageText` tanpa menyentuh halaman scan.
 */

interface TesseractResult {
  data: { text: string };
}

interface TesseractLike {
  recognize: (
    image: File | Blob | string,
    lang: string,
    options?: {
      logger?: (message: { status: string; progress: number }) => void;
    },
  ) => Promise<TesseractResult>;
}

declare global {
  interface Window {
    Tesseract?: TesseractLike;
  }
}

const SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

let loader: Promise<TesseractLike> | null = null;

function loadTesseract() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OCR hanya bisa berjalan di peramban."));
  }
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loader) return loader;

  loader = new Promise<TesseractLike>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");

    const done = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error("Mesin OCR tidak termuat."));
    };

    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("gagal")), {
        once: true,
      });
      return;
    }

    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = done;
    script.onerror = () => {
      loader = null;
      reject(
        new Error(
          "Mesin OCR gagal dimuat. Periksa koneksi, lalu coba lagi atau isi form manual.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  // Kegagalan tidak disimpan, supaya percobaan berikutnya bisa memuat ulang.
  loader.catch(() => {
    loader = null;
  });

  return loader;
}

const STATUS_LABEL: Record<string, string> = {
  "loading tesseract core": "Menyiapkan mesin OCR",
  "initializing tesseract": "Menyalakan mesin OCR",
  "loading language traineddata": "Mengunduh bahasa",
  "initializing api": "Menyiapkan pembacaan",
  "recognizing text": "Membaca teks",
};

export interface OcrProgress {
  /** 0 – 1 */
  progress: number;
  label: string;
}

export async function readImageText(
  file: File,
  onProgress?: (state: OcrProgress) => void,
) {
  const tesseract = await loadTesseract();
  const result = await tesseract.recognize(file, "eng", {
    logger: (message) => {
      onProgress?.({
        progress: Math.min(Math.max(message.progress, 0), 1),
        label: STATUS_LABEL[message.status] ?? "Memproses gambar",
      });
    },
  });
  return result.data.text;
}
