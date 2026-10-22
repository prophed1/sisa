# Sisa — pelacak pengeluaran

Produksi: <https://sisa-xi.vercel.app> (Vercel, project `sisa`). Panduan deploy
ulang ada di [docs/deploy-vercel.md](docs/deploy-vercel.md).

Aplikasi pelacak pengeluaran berbahasa Indonesia dengan delapan layar yang
berfungsi penuh — **Dasbor**, **Catat manual**, **Transaksi**, **Analisis**,
**Laporan** (rentang tanggal bebas, unduh PDF/CSV), **Scan struk & QRIS**,
**Email bank**, dan **Pengaturan** (anggaran per bulan, tema, ekspor dan impor
CSV). Catatan dan anggaran tersimpan di Neon (Postgres)
dan terikat pada akun Better Auth: tanpa sesi, seluruh ruang kerja dialihkan ke
`/masuk`, dan catatan yang dulu hidup di `localStorage` dipindahkan ke akun
pertama yang dibuat di peramban itu — sekali saja, dan hanya kalau akunnya
masih kosong. Bulan yang tampil mengikuti jam sungguhan dan bisa digeser, dan
setiap bulan punya anggarannya sendiri.

Struk dan QRIS dibaca di perangkat pengguna dengan Tesseract.js, jadi gambarnya
tidak diunggah ke mana pun. Email bank diterima lewat webhook penerusan lalu
disimpan sebagai draf; transaksi baru lahir setelah pengguna menekan simpan.
PRD menyebut Supabase dan Paxsenix: autentikasi serta database di sini memakai
Better Auth + Neon (jalur yang sudah teruji), dan Paxsenix tidak dipakai karena
host `api.paxsenix.biz.id` tidak bisa dihubungi — jalur OCR dipisah di
`lib/ocr-client.ts` supaya bisa diganti tanpa menyentuh halaman scan.

## Palet & tema

Warna diambil dari satu palet lima warna dan hanya didefinisikan sebagai token
di `src/app/globals.css`; komponen memakai `bg-surface`, `text-ink`, `bg-pine`,
dan seterusnya, jadi tidak ada layar yang menulis warna sendiri.

| Peran | Terang | Gelap |
|---|---|---|
| Kertas (kanvas) | Seashell, dinaikkan sedikit ke `#F7ECDF` | Tinta French Blue `#0F1322` |
| Permukaan panel | `#FFFAF3` | `#181D2E` |
| Garis & teks redup | `#E9D8C6` / plum `#6B4A60` | `#293046` / `#C1C5DB` |
| Tinta | Midnight Violet `#34102C` | Seashell `#F6EFE6` |
| Aksen kerja (tombol, tautan) | French Blue `#3E4B8E` | Powder Blue `#A9C4D4` |
| Sorotan (badge, seri pembanding) | Wheat `#F6E0B6` / `#B98F4E` | Wheat `#E8C98F` |
| Peringatan & hapus | rose `#8F3A50` | `#E79AAB` |
| Panel malam (hero, layar masuk) | Midnight Violet `#33122C` | indigo `#1D1A34` |

Mode gelap sengaja berpindah ke sisi dingin palet: kanvas, permukaan, dan
garis berporos French Blue, sedangkan Midnight Violet hanya dipakai di panel
malam dan tanda merek. Jadi ungu terbaca sebagai aksen, bukan warna dasar
seluruh layar; Wheat dan rose tetap muncul di angka, lencana, dan peringatan.

Pasangan teks/latar utama (tinta, teks redup, tautan, badge, tombol primer di
kedua tema) semuanya di atas 4,5:1 — diperiksa dengan rumus kontras WCAG, bukan
dikira-kira. Palet kategori di `lib/data/categories.ts` dan warna
berkas PDF di `lib/report-pdf.ts` memakai keluarga yang sama, jadi grafik, tabel,
dan hasil cetak tidak pernah keluar dari palet.

## Menjalankan

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test         # vitest: parser CSV/struk/email, penebak kategori, laju anggaran, database, auth, ledger & draf email
npm run db:setup # siapkan tabel di database (butuh DATABASE_URL)
npx tsc --noEmit
```

Uji berada di samping modulnya (`src/lib/*.test.ts`) dan memakai alias `@/*`
yang sama seperti aplikasi, diatur di `vitest.config.ts`. Uji yang butuh
Postgres menjalankan PGlite lalu membukanya lewat soket TCP, dengan
`maxConnections: 5` — bawaan `pglite-socket` hanya satu koneksi, sedangkan
`readLedger` memang mengirim dua kueri sekaligus, dan tanpa opsi itu koneksi
keduanya direset.

## Alur data

Satu ledger menjadi sumber tunggal; tidak ada angka statis di komponen, dan
bulan yang dihitung juga bukan angka yang ditulis mati.

```
periodFor(month, today)               # lib/period.ts: label, rentang, hari berjalan
readLedger(database, userId)          # layout server, sesi sudah diverifikasi
        │
        ▼
LedgerProvider (React state) ─► ledger-store hooks ─┬─► finance.summarizeLedger()   → dasbor & pengaturan
                                                    ├─► analytics.analyzeRange()    → analisis
                                                    ├─► csv.buildLedgerCsv()        → ekspor CSV
                                                    └─◄ csv-import.parseLedgerCsv() → impor CSV
        │
        └─► POST /api/ledger   (upsert | delete | budget | replace | adopt)
                 └─ ledger-input.parseOperation() → ledger-service.applyOperation() → Postgres
```

- `lib/data/ledger-history.ts` — pembangkit deterministik untuk Juli–September
  2026: tagihan tetap tiap bulan, belanja besar yang eksplisit, dan aktivitas
  harian dari deret acak berbenih (tanpa `Math.random`, jadi sama di server dan
  klien).
- `lib/data/ledger-seed.ts` — transaksi contoh 1–17 Oktober 2026, anggaran awal,
  dan gabungan seluruh riwayat sebagai `SEED_TRANSACTIONS`.
- `lib/csv.ts` — CSV kronologis delapan kolom dengan BOM dan escaping RFC 4180,
  plus pengunduhannya lewat `Blob` dan templat impor dua baris contoh.
- `lib/categorize.ts` — penebak kategori dari nama merchant: riwayat ledger
  lebih dulu (persis, lalu satu kata bermakna yang sama), baru kamus kata kunci
  sebagai jaring pengaman untuk merchant yang belum pernah dicatat.
  alias nama kolom (Indonesia maupun Inggris), tanggal ISO, `17/10/2026`, dan
  `17 Okt 2026`, nominal ber-“Rp” dengan pemisah ribuan, pasangan kolom
  debit/kredit, serta pemisahan baris jadi siap impor, duplikat, dan bermasalah.
  Baris duplikat dikenali dari tanggal + nominal + jenis + merchant.
- `lib/period.ts` — satu-satunya tempat bulan dihitung: `periodFor("2026-10",
  today)` memberi label, rentang, jumlah hari dalam bulan, hari yang sudah
  berjalan (bulan lalu penuh, bulan depan nol), dan bulan pembanding. Tidak ada
  lagi bulan yang ditulis mati di dalam komponen.
- `lib/finance.ts` — ringkasan bulan yang sedang dibaca (total, kategori,
  sumber, seri harian, proyeksi, status anggaran, saldo berjalan sampai bulan
  itu) plus `pace`: rata-rata harian, sisa aman per hari, hari saat anggaran
  tembus, dan perkiraan hari tembusnya.
- `lib/analytics.ts` — analisis rentang tanggal apa pun: pola hari, peringkat
  merchant, rincian kategori dengan pembanding periode yang sama bulan lalu,
  seri bulanan (bulan berjalan diadu dengan tanggal yang sama bulan lalu, bukan
  dengan satu bulan penuh), deteksi pengeluaran berulang, dan tiga temuan
  otomatis.
- `components/transactions/transactions-workspace.tsx` — daftar dibuka 60
  catatan sekaligus agar riwayat empat bulan tetap ringan, dengan tombol
  "Tampilkan … catatan lagi"; saringan apa pun dikembalikan ke halaman pertama.
- `lib/ledger-store.ts` — antarmuka yang dipakai seluruh layar
  (`addTransaction` / `updateTransaction` / `removeTransaction` /
  `importTransactions` / `restoreSeedLedger`, `setBudgetTotal` /
  `setBudgetLimit` / `resetBudget` / `copyBudgetFrom`, `useLedger`,
  `useLedgerSummary`), tapi isinya kini React context plus `applyOperation` —
  reducer murni yang membuat tampilan berubah lebih dulu sebelum
  `POST /api/ledger` menjawab. Keadaan memuat `transactions`, `budgets` per
  bulan, dan `month` yang sedang dibaca, jadi berpindah bulan tidak perlu
  permintaan jaringan baru. Fungsi perubahan di luar React memakai jembatan
  yang dipasang provider.
- `components/providers/ledger-provider.tsx` — pemegang keadaan, pengirim
  perintah berurutan (dua suntingan cepat tidak saling tabrak), pengambil ulang
  keadaan dari server saat penyimpanan gagal, dan pemindah catatan peramban ke
  akun kosong.
- `lib/ledger-input.ts` — pemeriksa untuk semua yang datang dari peramban:
  tanggal harus ada di kalender, waktu `HH:mm`, nominal dibatasi, teks dipotong,
  kategori dan sumber asing dibuang. Dipakai bersama oleh klien (untuk tipe
  perintah) dan server (untuk menolak).

## Laporan & unduh PDF

`/laporan` memakai rentang tanggal bebas, bukan bulan kalender: "20 Sep – 5 Okt",
"1 Agu – 31 Agu", atau "15 Okt – 15 Nov" semuanya bisa, termasuk rentang yang
masih kosong. Empat pintasan (bulan ini, bulan lalu penuh, awal bulan lalu –
hari ini, 30 hari terakhir) hanya jalan pintas; pemilih tanggalnya tidak dibatasi
ke bulan yang sedang dibuka. Tanggal mulai yang lebih baru dari tanggal akhir
ditukar otomatis, bukan ditolak.

- PDF dibuat di peramban dengan jsPDF + autoTable, digambar dalam milimeter
  supaya tidak bergantung pada pengaturan cetak peramban: pita judul, empat
  kotak ringkasan, pengeluaran per kategori (termasuk **Tanpa kategori** agar
  jumlahnya sama dengan total), rekap per bulan bila rentangnya lintas bulan,
  lalu rincian kronologis dengan header tabel yang diulang di tiap halaman dan
  kaki "Halaman x dari y". Judul bagian tidak pernah tertinggal sendiri di
  dasar halaman.
- Huruf baku PDF hanya WinAnsi, jadi teks di dalamnya memakai ASCII ("-" bukan
  "−") dan rupiah ditulis tanpa pemisah non-breaking.
- Nama berkas mengikuti rentangnya, mis.
  `sisa-laporan-2026-09-20-2026-10-05.pdf`.
- CSV di halaman ini memuat baris yang sama dengan PDF. Sementara itu
  Pengaturan → **Data & cadangan** tetap mengekspor **seluruh catatan, semua
  tanggal** — itu cadangan, bukan laporan.

## Impor CSV

Pengaturan → **Impor CSV** menerima berkas hasil ekspor aplikasi sendiri maupun
mutasi bank, tanpa perlu menyeragamkan nama kolom lebih dulu. Sebelum apa pun
masuk, modal menampilkan jumlah baris siap impor, duplikat, dan bermasalah,
beserta nomor baris dan alasannya.

- Baris yang tanggal, nominal, jenis, dan merchant-nya sama dengan catatan yang
  sudah ada dianggap duplikat dan dilewati, termasuk duplikat di dalam berkas
  yang sama.
- Kolom yang tidak dikenali (mis. kategori atau sumber asing) tidak membatalkan
  baris: nilainya dikosongkan atau dikembalikan ke `Catat manual`, dan
  penyesuaian itu tercatat di bagian "Bagian yang disesuaikan".
- Baris tanpa tanggal terbaca, merchant, atau nominal dilewati dengan alasan
  yang bisa dibaca, jadi berkas 500 baris tetap bisa disisir cepat.
- Tombol **Unduh templat** menyediakan dua baris contoh dengan susunan kolom
  yang sama seperti ekspor.
- Baris tanpa kategori diisi tebakan dari riwayat merchant (ditandai "tebakan"
  di pratinjau), jadi impor pertama pun tidak menghasilkan ratusan catatan
  tanpa kategori.

## Scan struk & QRIS

Halaman `/scan` menerima foto langsung, unggahan galeri, atau tangkapan layar
QRIS. Gambar dibaca di peramban dengan Tesseract.js (dimuat dari CDN saat
pertama dipakai), lalu `lib/receipt-parse.ts` mencari nominal, tanggal, waktu,
dan nama merchant. Sepuluh baris terakhir biasanya berisi total; baris tunai,
kembalian, pajak, dan diskon sengaja diberi skor rendah supaya tidak tertukar
dengan nominal belanja. Teks mentah tetap bisa dibuka untuk diperiksa.

Tangkapan layar QRIS menambah satu jebakan: nomor NMID, Merchant PAN, dan tahun
pada baris tanggal sama-sama panjang. Karena itu angka yang didahului "Rp" atau
memakai pemisah ribuan selalu menang atas angka telanjang, dan tahun tanpa
penanda mata uang di baris tanggal diabaikan sepenuhnya. Nama merchant diambil
dari label (`Merchant:`), atau dari baris paling atas yang masih menyisakan kata
selain istilah struk — jadi "GOPAY MERCHANT" terbaca, sementara "Total Bayar"
dan "Scan untuk bayar" tidak.

Hasilnya hanya mengisi form — pengguna tetap memilih kategori dan menekan
simpan. Kalau OCR gagal atau gambarnya terlalu buram, halaman menawarkan form
manual, bukan jalan buntu.

## Email bank

Halaman `/email` punya dua jalur masuk:

1. **Tempel email** — berfungsi tanpa konfigurasi apa pun. Isi email bank
ditempel, `lib/email-parse.ts` mengambil nominal, tanggal, arah (debit/kredit),
dan merchant, lalu menyimpannya sebagai draf.
2. **Penerusan otomatis** — setelah `EMAIL_INBOUND_DOMAIN` dan
`EMAIL_INBOUND_SECRET` diisi, halaman menampilkan alamat unik per akun
(`sisa+<token>@domain`). Penyedia penerusan email apa pun yang bisa memanggil
webhook cukup diarahkan ke `POST /api/email/inbound` dengan header
`x-inbound-secret`; webhook menerima JSON maupun form biasa.

Keduanya berakhir di daftar **Menunggu konfirmasi**. Tidak ada email yang
langsung menulis ke ledger: draf baru menjadi transaksi saat tombol Simpan
ditekan, dan email yang sama tidak digandakan (id draf deterministik dari
message-id atau isi email).

Nama merchant dibaca dari label di awal baris, sehingga baris khas BSI seperti
"Tanggal Transaksi:" dan "Jenis Transaksi:" tidak pernah terbaca sebagai nama
toko. Saat draf dikonfirmasi, kategorinya ditebak dari riwayat merchant dan
kamus kata kunci — aturan yang sama dengan jalur impor CSV — supaya catatan dari
email tidak menumpuk tanpa kategori. Tebakan itu bisa dibetulkan sebelum
menyimpan: setiap kartu draf punya pilihan kategori, dan pilihan pengguna selalu
menang atas tebakan.

Mutasi yang sudah ada tidak pernah masuk dua kali. Webhook mengabaikan
`message-id` yang sama, lalu mencocokkan **tanggal + nominal + jenis** — jam
boleh meleset sampai 10 menit — terhadap catatan di **semua bulan** dan terhadap
draf lain yang masih menunggu. Hasilnya `202` dengan `duplicate:true` dan alasan
seperti *Sudah tercatat: TOKOPEDIA 17 Okt 2026, 09:12.*, dan tidak ada draf baru.
Pemeriksaan yang sama dijalankan sekali lagi saat draf disimpan, untuk kasus draf
yang menunggu beberapa hari sementara mutasinya dicatat manual. Karena itu email
lama boleh disusul kapan saja: mengirim ulang rentang yang sudah pernah masuk
aman, dan mutasi bulan-bulan sebelumnya tetap terbaca.

### Mengaktifkan penerusan otomatis

Dua variabel lingkungan, dan hanya satu di antaranya yang "didapat" dari luar:

1. **`EMAIL_INBOUND_SECRET`** — rahasia buatan sendiri, tidak diambil dari mana
   pun. Buat satu nilai acak lalu pakai nilai yang sama di dua tempat: server
   aplikasi dan penyedia penerusan.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **`EMAIL_INBOUND_DOMAIN`** — subdomain milikmu yang MX-nya diarahkan ke
   penyedia penerusan, mis. `inbox.namadomainmu.com`. Aplikasi hanya memakainya
   untuk menyusun alamat `sisa+<token>@inbox.namadomainmu.com`. Domain dasarnya
   harus kamu miliki; subdomain ini tidak perlu bisa menerima surat biasa.

Secara lokal, isi keduanya di `.env.local`. Di produksi (mis. Vercel), isi lewat
Project → Settings → Environment Variables, lalu deploy ulang. Jangan pernah
menaruh rahasianya di dalam repo.

Contoh penyedia yang cocok: **Cloudflare Email Routing** dengan Email Worker.
Aktifkan Email Routing untuk domain, buat route `*@inbox.namadomainmu.com` ke
Worker berikut, dan simpan webhook + rahasia sebagai secret Worker:

```js
import PostalMime from "postal-mime";

export default {
  async email(message, env) {
    const mail = await PostalMime.parse(message.raw);
    await fetch(env.APP_WEBHOOK, {          // https://appmu/api/email/inbound
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-secret": env.INBOUND_SECRET, // = EMAIL_INBOUND_SECRET
      },
      body: JSON.stringify({
        to: message.to,
        from: message.from,
        subject: mail.subject ?? "",
        text: mail.text ?? mail.html ?? "",
        "message-id": message.headers.get("message-id") ?? "",
      }),
    });
  },
};
```

**Tanpa domain sendiri**, pakai jalur Gmail + Google Apps Script: skrip di akun
Google memeriksa email bank yang baru masuk lalu mengirimkannya ke webhook
memakai token penerusan akun (tampil di halaman Email). Langkah dan kodenya ada
di [docs/penerusan-gmail.md](docs/penerusan-gmail.md).

Penyedia yang memanggil webhook langsung juga bisa, asalkan bisa mengirim header
`x-inbound-secret` — hanya header itu yang diperiksa, rahasia di URL ditolak.
Untuk mencoba tanpa penyedia,
kirim POST JSON ke `/api/email/inbound` dengan kolom `to` (alamat yang tampil di
halaman Email) atau `token` (token penerusan akun), ditambah `from`, `subject`,
dan `text`.

## Susunan file

```
src/
  app/
    layout.tsx              # font Geist, provider tema, metadata
    not-found.tsx
    (auth)/masuk/page.tsx   # layar masuk dan pembuatan akun
    (app)/
      layout.tsx            # penjaga sesi + memuat ledger, lalu membungkus AppShell
      page.tsx              # Dasbor pengeluaran
      catat/page.tsx        # Catat manual
      transaksi/page.tsx    # Daftar, cari, saring, sunting, hapus
      analisis/page.tsx     # Pola belanja per rentang tanggal
      laporan/page.tsx      # Laporan rentang bebas + unduh PDF/CSV
      pengaturan/page.tsx   # Anggaran, tampilan, ekspor CSV, profil
      scan/page.tsx         # Foto struk/QRIS, OCR, form terisi otomatis
      email/page.tsx        # Alamat penerusan, tempel email, konfirmasi draf
      loading.tsx           # skeleton seukuran layout
      error.tsx             # error boundary di dalam shell
  components/
    shell/                  # AppShell, sidebar, topbar, drawer mobile, command palette
    dashboard/              # hero, sorotan, tren, donat, transaksi terbaru, anggaran, sumber
    ledger/                 # form transaksi, bidang input, workspace Catat
    transactions/           # workspace tabel Transaksi
    analysis/               # filter rentang, strip metrik, grafik harian, pola hari, merchant, kategori, temuan
    report/                 # workspace laporan: pintasan rentang, ringkasan, rincian, PDF
    settings/               # editor anggaran, panel tampilan, data & cadangan (ekspor + impor CSV), profil
    ui/                     # primitif: Panel, Button, Badge, Modal
    auth/                   # form masuk / buat akun
    providers/              # ThemeProvider (next-themes), LedgerProvider, SessionProvider
    scan/                   # workspace scan struk + OCR di peramban
    email/                  # workspace email bank + daftar draf
  lib/
    data/                   # ledger contoh, riwayat contoh, kategori
    finance.ts              # ringkasan bulan
    analytics.ts            # analisis rentang + temuan
    csv.ts                  # ekspor ledger ke CSV
    report.ts               # rentang tanggal bebas: validasi, pintasan, ringkasan, rekap bulan
    report-pdf.ts           # laporan A4 dengan jsPDF + autoTable (layout mm, kaki halaman)
    ledger-store.ts         # context, reducer murni, dan fungsi perubahan
    device-ledger.ts        # membaca catatan lama di localStorage sekali, untuk dipindahkan
    ledger-input.ts         # pemeriksa payload dari peramban + tipe perintah
    ledger-service.ts       # baca/terapkan perintah ledger atas nama satu pengguna
    http.ts                 # jawaban no-store, pemeriksaan asal, batas ukuran
    db/                     # skema, kueri Postgres, kolam koneksi, setup, uji PGlite
    auth.ts                 # instance Better Auth untuk Next
    auth-options.ts         # konfigurasi Better Auth tanpa plugin Next
    auth-session.ts         # pembaca sesi server (layout dan route handler)
    format.ts               # rupiah, persen, delta (locale id-ID)
    types.ts                # Transaction, CategoryKey, DailyPoint, dst.
    utils.ts                # cn(), clamp()
```

## Lapisan data Postgres

Databasenya Neon (Postgres serverless) dengan login Better Auth. Tabel
`transactions` dan `budgets` serta tabel Better Auth dibuat oleh `npm run
db:setup`, dan cara yang sama dipakai pengujian supaya tidak ada dua versi
skema:

- `lib/db/schema.ts` — skema sebagai sumber tunggal (dipakai menyiapkan tabel di
  Neon maupun di Postgres lokal saat pengujian, jadi tidak ada dua versi yang
  bisa menyimpang). Kunci utama `transactions` adalah gabungan `(user_id, id)`
  supaya id catatan buatan perangkat tidak bisa bertabrakan antar pengguna;
  `budgets` berkunci `(user_id, month)` sehingga anggaran Oktober tidak terbawa
  ke November. Skemanya juga memindahkan tabel `budgets` versi lama (satu
  anggaran per pengguna) ke baris bulan berjalan, sekali saja.
- `lib/db/repository.ts` — kueri baca/tulis di atas antarmuka `Queryable`, jadi
  kueri yang sama bisa dijalankan lewat `pg` ke Neon maupun ke Postgres lokal.
  `saveTransactions` memakai `on conflict do update`, sehingga mengimpor ulang
  berkas yang sama tidak menggandakan catatan, dan `migrateLedger` menolak
  memindahkan data perangkat kalau akunnya sudah punya catatan.
- `lib/db/pg.ts` — kolam koneksi untuk sisi server. Baru dibuka saat kueri
  pertama, jadi `next build` tetap jalan tanpa `DATABASE_URL`.

Ujinya ada di `lib/db/repository.test.ts` dan berjalan di atas **PGlite**,
Postgres sungguhan yang dikompilasi ke WASM di dalam Node — jadi skema,
constraint, kueri, dan migrasi dieksekusi nyata, bukan ditiru. Termasuk uji
bahwa catatan satu pengguna tidak pernah terlihat atau terhapus oleh pengguna
lain, dan uji migrasi seluruh ledger contoh yang hasil ringkasannya dibandingkan
angka per angka dengan hasil dari data lokal.

### Login dan sesi

Better Auth terpasang, teruji, dan sudah dipakai layar `/masuk` di server
sungguhan:

- `lib/auth-options.ts` — konfigurasi tanpa plugin Next.js, jadi skrip dan
  pengujian bisa memakainya di luar runtime Next.
- `lib/auth.ts` — instance untuk Next (`nextCookies()`), dibuat saat permintaan
  pertama sehingga `next build` tetap jalan tanpa `DATABASE_URL`.
- `lib/db/setup.ts` — menyiapkan tabel ledger lalu menjalankan migrasi resmi
  Better Auth lewat `getMigrations()`; dipakai `npm run db:setup` maupun
  pengujian.
- `app/api/auth/[...all]/route.ts` — endpoint Better Auth di bawah `/api/auth`.

`lib/auth.test.ts` menjalankan alur sungguhan di atas Postgres yang dibuka lewat
soket TCP, jadi jalur yang diuji sama dengan produksi (`pg.Pool` → repository →
Better Auth): daftar akun, masuk, sesi dipulihkan dari cookie, kata sandi salah
ditolak, email ganda ditolak, keluar mematikan sesi, tanpa cookie tidak ada
sesi, dan catatan dua akun tidak saling terlihat.

### Satu pintu data: `/api/ledger`

Komponen tidak pernah menyentuh database. Layout server membaca sesi, menolak
yang belum masuk dengan alih ke `/masuk`, lalu memuat ledger pemiliknya sekali
untuk seluruh halaman di bawahnya (`export const instant = false`, jadi segmen
ini memang menunggu server). Setiap perubahan sesudah itu pergi ke satu route
handler:

- `GET /api/ledger` — mengembalikan `{ transactions, budgets }` milik sesi
  yang sedang aktif.
- `POST /api/ledger` — menerima satu perintah: `upsert`, `delete`, `budget`
  (wajib membawa `month` berbentuk `YYYY-MM`), `replace` (kembalikan data
  contoh), atau `adopt` (pindahkan catatan peramban).
  Badan permintaan diperiksa `lib/ledger-input.ts` lebih dulu; yang tidak lolos
  dijawab `400`, bukan ditulis ke database.

Yang menjaga batasnya: `user_id` selalu diambil dari sesi, bukan dari klien;
posting yang mengubah data wajib datang dari halaman aplikasi sendiri
(pemeriksaan header `Origin`, seperti CSRF Better Auth); semua jawaban
`no-store`; dan `adopt` hanya menulis kalau akunnya masih kosong, jadi data
perangkat tidak pernah menimpa data akun yang sudah berisi.

`lib/ledger-service.test.ts` menguji semua itu di atas Postgres sungguhan lewat
soket TCP: simpan, perbarui tanpa menggandakan, urutan terbaru dulu, kiriman 620
baris yang dipecah, hapus, anggaran, `replace`, `adopt` ke akun kosong, `adopt`
yang ditolak karena akun sudah berisi, dan pemisahan data antar pengguna
(termasuk percobaan menghapus catatan milik akun lain dengan id yang benar).

## Bulan yang bergerak dan anggaran per bulan

Tidak ada tanggal yang ditulis mati di dalam kode. Bulan yang dibuka pertama
kali dipilih server: bulan berjalan kalau sudah ada isinya, kalau tidak bulan
terakhir yang punya catatan. Dari sana pemilih bulan di Dasbor dan Pengaturan
menggeser `month` di store, dan semua panel — hero, tren, donat, sorotan,
anggaran, editor — membaca bulan yang sama.

- Batas geserannya data: tidak masuk ke bulan sebelum catatan pertama, dan
  hanya satu bulan ke depan, cukup untuk menyiapkan anggaran berikutnya.
- Bulan berjalan memakai hari yang sudah lewat sebagai pembagi laju; bulan yang
  sudah tutup memakai satu bulan penuh, jadi "rata-rata per hari" dan proyeksi
  tidak membandingkan apel dengan jeruk.
- Anggaran disimpan per bulan. Bulan yang belum diisi menampilkan ajakan mengisi
  atau tombol **Salin September** di Pengaturan, bukan angka bulan lain yang
  diam-diam dipinjam.
- Form Catat manual tidak lagi dikurung ke satu bulan; catatan bertanggal bulan
  lain langsung dipakai sebagai bulan aktif setelah tersimpan.

## Kategori otomatis dan laju anggaran

Dua hal kecil yang mengubah rasa aplikasinya setelah riwayat menebal:

- **Tebakan kategori** muncul di form Catat manual sebagai tawaran (tombol
  "Pakai"), bukan keputusan sepihak, dan dipakai otomatis saat impor CSV karena
  di sana tawar-menawar per baris tidak masuk akal. Riwayat selalu menang atas
  kamus, jadi kebiasaanmu sendiri yang menentukan.
- **Laju belanja** di dasbor menyebut hari saat anggaran diperkirakan tembus
  ("sekitar 21 Okt — 10 hari sebelum akhir bulan"), bukan hanya persen terpakai
  yang baru terasa setelah terlambat. Angkanya dihitung dari rata-rata harian
  dan sisa hari kalender, dan berubah sendiri mengikuti catatan baru.

## Bahasa desain

- Palet lima warna: Seashell, Wheat, Powder Blue, French Blue, Midnight
  Violet. Mode terang berporos kertas hangat dengan aksen French Blue; mode
  gelap berporos tinta biru dengan aksen Powder Blue, dan Midnight Violet
  hanya untuk panel malam. Warna kategori hanya dipakai pada data, bukan pada
  chrome UI.
- Tipografi Geist + Geist Mono (angka memakai `tabular-nums` lewat kelas `.num`).
- Token warna berada di `src/app/globals.css` sebagai CSS variable, dipetakan ke
  Tailwind v4 melalui `@theme inline`, dengan varian gelap di kelas `.dark`.
- Grid 12 kolom asimetris (8/4 atau 7/5) yang runtuh jadi satu kolom di bawah
  `xl`; tidak ada `h-screen`, grafik digambar manual sebagai SVG + elemen HTML.
- Semua grafik punya padanan teks dan bisa dijangkau keyboard — kolom batang
  adalah tombol dengan `aria-label`, tooltip muncul saat fokus.

## Titik sambung tahap berikutnya

| Kebutuhan | Letaknya sekarang |
| --- | --- |
| Menambah perintah ledger baru | `LedgerOperation` di `src/lib/ledger-input.ts` + `applyOperation()` di `src/lib/ledger-service.ts` (klien hanya perlu mengirim perintahnya) |
| Menyiapkan tabel di Neon | `npm run db:setup` → `ensureSchema()` di `src/lib/db/repository.ts` |
| Ganti/reset kata sandi | `authOptions()` di `src/lib/auth-options.ts` (plugin Better Auth) + form di `src/components/auth/auth-form.tsx` |
| Riwayat bulan-bulan sebelumnya | sudah ada Juli–September; tambah bulan lain di `src/lib/data/ledger-history.ts` |
| Bulan yang bisa dibuka | `earliestMonthKey()` / `latestMonthKey()` di `src/lib/period.ts` |
| Perbandingan lintas tahun | `monthlySeries()` di `src/lib/analytics.ts` |
| Impor CSV / data lama | sudah ada di `src/lib/csv-import.ts` + modal `components/settings/import-csv-modal.tsx` |
| OCR struk / QRIS | `lib/ocr-client.ts` (Tesseract di peramban) + `lib/receipt-parse.ts`; ganti isi `readImageText()` kalau pindah penyedia |
| Penerusan email bank | `EMAIL_INBOUND_DOMAIN` + `EMAIL_INBOUND_SECRET`, lalu arahkan penyedia ke `POST /api/email/inbound`; parser di `lib/email-parse.ts` |
| Menambah format email bank lain | `parseBankEmail()` di `lib/email-parse.ts` + contoh di `email-parse.test.ts` |
| Foto profil & nama tampilan | `user.name` dari `SessionProvider`; avatar sekarang hanya inisial di `src/components/shell/sidebar.tsx` |
| Aturan tebakan kategori | `src/lib/categorize.ts` (kamus `KEYWORDS`) |
| Ambang peringatan laju | `summarizeLedger().pace` di `src/lib/finance.ts` |
