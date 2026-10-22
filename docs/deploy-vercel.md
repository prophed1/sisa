# Deploy ke Vercel

Aplikasi ini satu Next.js biasa dengan Postgres (Neon) dan Better Auth. Tidak ada
layanan lain yang perlu disiapkan.

## Yang dibutuhkan

| Variabel | Nilai produksi |
|---|---|
| `DATABASE_URL` | Sama dengan `.env.local`. Pastikan memakai host `-pooler` Neon, bukan host langsung. |
| `BETTER_AUTH_SECRET` | Sama dengan `.env.local` atau nilai baru; yang penting tidak berubah setelah ada sesi. |
| `BETTER_AUTH_URL` | Alamat produksi lengkap dengan `https://`, tanpa garis miring di akhir. |
| `EMAIL_INBOUND_SECRET` | **Harus sama** dengan yang di `.env.local`, kalau tidak skrip Gmail akan ditolak `401`. |
| `EMAIL_INBOUND_DOMAIN` | Kosongkan untuk jalur Gmail + Apps Script. |

Tabel database sudah ada di Neon; menjalankan `npm run db:setup` di produksi tidak
diperlukan lagi.

## Langkah

```bash
npx vercel login                 # sekali saja, lewat tautan perangkat
npx vercel link                  # hubungkan folder ini ke satu project Vercel
npx vercel env add DATABASE_URL production     # ulangi untuk tiap variabel
npx vercel --prod                # build dan publikasikan
```

`vercel env add` membaca nilai dari input, bukan argumen, supaya rahasia tidak
tertinggal di riwayat shell:

```bash
grep '^DATABASE_URL=' .env.local | cut -d= -f2- | npx vercel env add DATABASE_URL production
```

Ulangi pola itu untuk `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (isi manual), dan
`EMAIL_INBOUND_SECRET`. Setelah variabel diisi, deploy ulang supaya nilainya
terpakai.

## Pemeriksaan setelah deploy

1. `https://<domain>/masuk` terbuka dan bisa mendaftar/masuk.
2. Halaman Dasbor memuat data akun yang sama seperti di lokal (database bersama).
3. Tanpa sesi, `/` mengalihkan ke `/masuk` dan `/api/ledger` menjawab `401`.
4. Webhook: `POST /api/email/inbound` tanpa header rahasia harus menjawab `401`
   (bukan `503` — `503` berarti `EMAIL_INBOUND_SECRET` belum terbaca).
5. Salin token penerusan dari halaman **Email bank**, lalu perbarui `WEBHOOK_URL`
   dan `INBOX_TOKEN` di Script Properties Apps Script dengan alamat produksi.
6. Kirim satu email BSI sungguhan (atau teruskan satu email lama), lalu pastikan
   draf muncul dan isinya benar sebelum menekan Simpan.

## Kalau ada yang salah

- Build gagal karena `BETTER_AUTH_SECRET` tidak ada: variabel harus diisi sebelum
  deploy, bukan setelah.
- Login berhasil tetapi langsung terlempar lagi: `BETTER_AUTH_URL` tidak sama
  dengan alamat yang dibuka di peramban.
- Webhook menjawab `503`: rahasia belum terpasang di environment produksi.
- Koneksi database habis: pastikan memakai host `-pooler` Neon.

Log runtime ada di dashboard Vercel → project → **Logs**, dan itu tempat pertama
yang perlu dilihat kalau ada `500`.
