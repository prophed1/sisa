"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "masuk" | "daftar";

const inputClass =
  "h-[42px] w-full rounded-[11px] border border-line bg-surface px-3 text-[13px] outline-none transition-colors placeholder:text-faint/70 focus:border-line-strong";

/** Kode dari Better Auth diterjemahkan supaya pesannya manusiawi. */
function humanMessage(payload: unknown, fallback: string) {
  const data = (payload ?? {}) as { code?: string; message?: string };
  switch (data.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email atau kata sandi tidak cocok.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Email ini sudah terdaftar — masuk saja dengan kata sandinya.";
    case "PASSWORD_TOO_SHORT":
      return "Kata sandi minimal 8 karakter.";
    case "INVALID_EMAIL":
      return "Alamat emailnya belum benar.";
    default:
      return data.message ?? fallback;
  }
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("masuk");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Sesi sudah dibuat tetapi dasbor belum tampil; teks tombol ikut berubah
  // supaya keberhasilan tidak terlihat seperti proses yang menggantung.
  const [opening, setOpening] = useState(false);

  const isRegister = mode === "daftar";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (isRegister && !name.trim()) {
      setError("Nama panggilan perlu diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = isRegister ? "sign-up/email" : "sign-in/email";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? { email, password, name: name.trim() }
            : { email, password },
        ),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          humanMessage(
            payload,
            isRegister
              ? "Pendaftaran gagal. Coba lagi sebentar lagi."
              : "Tidak bisa masuk. Coba lagi sebentar lagi.",
          ),
        );
        setBusy(false);
        return;
      }

      // Sesi sudah tersimpan sebagai cookie. Halaman masuk sendiri sudah
      // mengalihkan pengunjung bersesi ke dasbor, jadi kalau navigasi ini gagal
      // pun tidak ada yang tertahan di formulir.
      setOpening(true);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Periksa koneksimu.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div
        role="tablist"
        aria-label="Pilih cara masuk"
        className="grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-surface-2 p-1"
      >
        {(["masuk", "daftar"] as const).map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setMode(option);
                setError(null);
                setOpening(false);
              }}
              className={cn(
                "h-8 rounded-[9px] text-[12px] font-medium transition-colors duration-200",
                active
                  ? "bg-surface text-ink shadow-[var(--shadow-panel)]"
                  : "text-muted hover:text-ink",
              )}
            >
              {option === "masuk" ? "Masuk" : "Buat akun"}
            </button>
          );
        })}
      </div>

      {isRegister ? (
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted">
            Nama
          </span>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Nama yang dipakai di aplikasi"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted">
          Email
        </span>
        <input
          className={inputClass}
          type="email"
          inputMode="email"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted">
          Kata sandi
        </span>
        <input
          className={inputClass}
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isRegister ? "Minimal 8 karakter" : "Kata sandimu"}
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[11px] border border-line bg-clay-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-clay"
        >
          <WarningCircle size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        className="mt-1 h-10 w-full"
        disabled={busy}
      >
        {busy ? (
          <>
            <CircleNotch size={14} className="animate-spin" />
            {opening ? "Membuka dasbor" : "Memproses"}
          </>
        ) : (
          <>
            {isRegister ? "Buat akun dan mulai" : "Masuk ke akunku"}
            <ArrowRight size={14} />
          </>
        )}
      </Button>
    </form>
  );
}
