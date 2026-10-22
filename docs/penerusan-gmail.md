# Meneruskan email BSI dari Gmail ke Sisa

Jalur ini tidak butuh domain sendiri. Skrip kecil menempel di akun Google-mu,
memeriksa email BSI yang baru masuk, lalu mengirim isinya ke webhook aplikasi.
Email tetap di Gmail; tidak ada layanan lain yang membaca mutasimu.

## Yang perlu disiapkan

| Nilai | Dari mana |
|---|---|
| `WEBHOOK_URL` | `https://<alamat-aplikasi>/api/email/inbound` — untuk produksi sekarang: `https://sisa-xi.vercel.app/api/email/inbound`. Harus HTTPS yang bisa diakses publik; `localhost` tidak bisa dijangkau Google. |
| `INBOUND_SECRET` | Sama dengan `EMAIL_INBOUND_SECRET` di `.env.local` (atau di Environment Variables Vercel). Skrip dan server harus memakai nilai identik. |
| `INBOX_TOKEN` | Tampil di halaman **Email bank** pada aplikasi, di kartu *Alamat penerusan*. Isinya 12 huruf/angka heksadesimal (mis. `a1b2c3d4e5f6`), bukan kalimat penjelas di tabel ini. |

Tanpa `EMAIL_INBOUND_DOMAIN`, alamat `sisa+token@domain` memang tidak muncul —
itu wajar untuk jalur ini, karena yang mengirim adalah skrip, bukan penyedia
penerusan.

## Langkah pemasangan

1. Buka [script.google.com](https://script.google.com) → **New project**, beri nama
   mis. “Sisa — penerusan BSI”.
2. **Project Settings → Script Properties → Add script property**, isi tiga nama di
   atas beserta nilainya.
3. Tempel kode di bawah ini menggantikan isi `Code.gs`.
4. Jalankan fungsi `forwardBankEmails` sekali dari editor dan setujui izin yang
   diminta (membaca Gmail dan menghubungi layanan eksternal). Di **Log eksekusi**
   akan terlihat `utas ditemukan: N` — kalau `0`, lanjut ke bagian *Email tidak
   terbaca* di bawah.
5. Jalankan `pasangTrigger` sekali. Setelah itu skrip berjalan sendiri tiap 15
   menit.
6. Buka halaman **Email bank**: email yang terbaca muncul sebagai draf di
   *Menunggu konfirmasi*, dan tetap perlu kamu tekan Simpan.

Kalau draf tidak muncul, buka **Executions** di Apps Script untuk melihat respons
webhook. `202` berarti permintaan diterima — lihat kolom `accepted` dan `reason`:
`false` dengan alasan *tidak dikenali* berarti isinya bukan mutasi, sedangkan
*token penerusan tidak dikenali* berarti `INBOX_TOKEN` salah. `401` berarti
rahasianya tidak sama. `400` berarti permintaan tidak membawa token maupun alamat
penerima sama sekali.

## Email tidak terbaca

Log eksekusi yang hanya berisi *Eksekusi dimulai / selesai* berarti skrip
berjalan tanpa error, tetapi tidak ada email yang cocok. Urutannya:

1. Tempel ulang kode di bawah (versi dengan log), lalu **Terapkan**.
2. Pilih fungsi `cekNotifikasiBank` → **Jalankan** → buka **Log eksekusi**. Isinya
   daftar `tanggal | pengirim | subjek` email yang menyebut BSI sebulan terakhir.
   Fungsi ini hanya membaca, tidak mengirim apa pun.
3. Samakan `PENCARIAN` dengan pengirim yang muncul. Notifikasi BSI ternyata
   berangkat dari `mobile@bankbsi.co.id`, jadi `from:bsi.co.id` tidak pernah
   cocok; pakai `from:bankbsi.co.id`. Subjeknya beragam — *QRIS Payment*,
   *Transfer BI Fast (Ke Bank Lain)*, *Transaksi Bank Syariah Indonesia* — jadi
   jangan disaring per subjek.
4. Jalankan `forwardBankEmails` lagi; log harus menampilkan
   `utas ditemukan: N` lalu satu baris per email berisi kode `202`.

Penyebab paling sering: notifikasi BSI dikirim ke **alamat email lain**, bukan ke
Gmail tempat skrip ini dipasang. Skrip hanya membaca kotak yang kamu izinkan saat
menekan *Allow*, jadi notifikasinya harus masuk ke kotak itu — atau alamat lain
itu diteruskan (forwarding) ke Gmail tersebut.

Penyebab kedua: emailnya ada, tetapi masuk folder **Spam**. `GmailApp.search`
tidak membaca Spam dan Trash. Cek folder Spam di Gmail, tandai *Bukan spam*, lalu
jalankan lagi; kalau memang selalu berakhir di Spam, tambahkan `in:anywhere` pada
`PENCARIAN` agar tetap terbaca.

## Kode

```js
/**
 * Mengirim email notifikasi BSI dari Gmail ke webhook Sisa.
 * Butuh tiga Script Property: WEBHOOK_URL, INBOUND_SECRET, INBOX_TOKEN.
 */

const LABEL = "sisa-terkirim";
// Notifikasi BSI datang dari mobile@bankbsi.co.id — perhatikan "bankbsi",
// bukan "bsi.co.id". Ubah kalau bankmu memakai alamat lain.
const PENCARIAN = "from:bankbsi.co.id -label:" + LABEL + " newer_than:2d";

function forwardBankEmails() {
  const props = PropertiesService.getScriptProperties();
  const webhook = props.getProperty("WEBHOOK_URL");
  const secret = props.getProperty("INBOUND_SECRET");
  const token = props.getProperty("INBOX_TOKEN");

  if (!webhook || !secret || !token) {
    throw new Error("WEBHOOK_URL, INBOUND_SECRET, dan INBOX_TOKEN wajib diisi.");
  }

  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  const threads = GmailApp.search(PENCARIAN, 0, 20);
  console.log("utas ditemukan: " + threads.length);
  if (threads.length === 0) {
    console.log("Tidak ada email yang cocok dengan: " + PENCARIAN);
    console.log("Jalankan cekNotifikasiBank() untuk melihat pengirim email bankmu.");
  }

  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      const response = UrlFetchApp.fetch(webhook, {
        method: "post",
        contentType: "application/json",
        headers: { "x-inbound-secret": secret },
        payload: JSON.stringify({
          token: token,
          from: message.getFrom(),
          subject: message.getSubject(),
          // Tanggal email ditempel di akhir supaya transaksi tetap terbaca
          // kalau isi notifikasinya tidak mencantumkan tanggal sendiri. Format
          // yyyy-MM-dd dipakai agar tanggal asli di isi email tetap menang.
          text:
            message.getPlainBody() +
            "\nTanggal email: " +
            Utilities.formatDate(message.getDate(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"),
          "message-id": "gmail-" + message.getId(),
        }),
        muteHttpExceptions: true,
      });

      const code = response.getResponseCode();
      const body = response.getContentText();
      // Terlihat di Executions: 202 accepted:false berarti email terkirim tapi
      // isinya bukan mutasi, 401 berarti rahasianya tidak sama.
      console.log(message.getSubject() + " -> " + code + " " + body);
      if (code !== 202 && code !== 200) {
        console.error("Webhook menolak: " + code + " " + body);
        return;
      }

      // Ditandai supaya pesan yang sama tidak dikirim ulang tiap 15 menit.
      thread.addLabel(label);
    });
  });
}

/** Diagnostik: mencatat pengirim dan subjek email bank, tanpa mengirim apa pun. */
function cekNotifikasiBank() {
  const threads = GmailApp.search(
    "(BSI OR bsi.co.id OR \"Bank Syariah\") newer_than:30d",
    0,
    20,
  );
  console.log("utas: " + threads.length);
  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      console.log(
        message.getDate().toISOString() +
          " | " +
          message.getFrom() +
          " | " +
          message.getSubject(),
      );
    });
  });
}

function pasangTrigger() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === "forwardBankEmails") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("forwardBankEmails").timeBased().everyMinutes(15).create();
}
```

## Catatan

- Jalankan `forwardBankEmails` hanya setelah menekan **Terapkan** (atau Ctrl+S).
  Tanpa itu Apps Script masih memakai versi kode yang lama.
- Nilai Script Property disalin apa adanya, termasuk spasi di ujung. Spasi
  tak sengaja pada `INBOUND_SECRET` membuat webhook menjawab `401`.
- Putaran pertama hanya memeriksa email dua hari terakhir (`newer_than:2d`).
  Untuk menyusul mutasi bulan-bulan sebelumnya, besarkan angkanya sementara —
  mis. `newer_than:120d` — lalu jalankan `forwardBankEmails` beberapa kali.
  Mengulang rentang yang sama aman: server menolak duplikat (lihat di bawah),
  jadi email lama tetap masuk tanpa menggandakan yang sudah ada.
- Kalau tidak ada draf sama sekali, jalankan `cekNotifikasiBank()` dan lihat
  pengirim aslinya. Satu bank bisa memakai beberapa domain (BSI: `bankbsi.co.id`
  untuk notifikasi transaksi, `bsi.co.id` untuk hal lain), jadi `PENCARIAN`
  boleh diubah kapan saja.
- Satu putaran memproses maksimal 20 utas. Utas yang sudah diproses diberi label,
  jadi putaran berikutnya mengambil sisanya — untuk menyusul tumpukan lama,
  jalankan `forwardBankEmails` beberapa kali berturut-turut.
- Webhook menolak duplikat dari dua arah: `message-id` yang sama, dan mutasi
  yang isinya sudah ada. Pencocokan kedua memakai tanggal + nominal + jenis
  (jam boleh meleset sampai 10 menit) dan berlaku untuk **semua bulan** serta
  draf yang masih menunggu. Jadi catatan yang dulu kamu input manual tetap
  dikenali, dan menjalankan ulang skrip untuk email lama tidak menggandakan
  apa pun — responsnya `accepted:false, duplicate:true` dengan alasan seperti
  *Sudah tercatat: TOKOPEDIA 17 Okt 2026, 09:12.*
- Email yang bukan mutasi (promo, OTP) akan dijawab `202` dengan
  `accepted: false`, dan tidak membuat draf. Itu perilaku yang benar.
- Jangan menaruh rahasia di dalam kode atau repo; Script Properties adalah
  tempatnya.
