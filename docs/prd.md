# Product Requirements Document (PRD) - Web App Pelacak Pengeluaran

## 1. Deskripsi Produk
Web app pelacak pengeluaran bulanan yang dirancang untuk menyederhanakan pencatatan finansial pengguna. Aplikasi ini mendukung pencatatan otomatis dari mutasi email Bank BSI, pemindaian teks dari struk belanja atau QRIS menggunakan OCR, serta pencatatan manual. Sistem akan menyimpan data secara aman di database, menyajikan visualisasi data yang interaktif, dan di-deploy dengan kinerja tinggi.

## 2. Spesifikasi Teknologi
* **Frontend & Hosting:** Vercel
* **Backend & Database:** Supabase (termasuk Autentikasi)
* **API Pihak Ketiga:** Paxsenix API (untuk OCR pemindaian struk dan QRIS)
* **Integrasi Tambahan:** Email Parsing (untuk membaca mutasi Bank BSI)

## 3. Fitur Utama & Sub-Fitur

### 3.1 Dasbor Pengeluaran
* **Ringkasan Bulan Ini:** Menampilkan total pengeluaran dan total pemasukan/saldo pada bulan berjalan.
* **Sorotan Boros Terbesar:** Menampilkan kategori atau transaksi individual dengan nominal pengeluaran tertinggi.
* **Transaksi Terbaru:** Menampilkan daftar (list) singkat dari transaksi terakhir yang masuk ke sistem.

### 3.2 Catat Manual
* **Form Pengeluaran:** Input manual yang mencakup nominal, tanggal, dan deskripsi/catatan transaksi.
* **Pilih Kategori:** Dropdown/pilihan kategori pengeluaran (makanan, transportasi, hiburan, tagihan, dll).
* **Catat Saldo & Pemasukan:** Fitur untuk menginput penambahan saldo atau pemasukan di bulan berjalan.

### 3.3 Grafik & Analisis
* **Grafik per Kategori:** Visualisasi (misal: *pie chart* atau *doughnut chart*) untuk melihat proporsi pengeluaran berdasarkan kategori.
* **Tren Bulanan:** Grafik (misal: *bar chart* atau *line chart*) yang menampilkan tren naik-turunnya pengeluaran antar bulan.
* **Pilih Rentang Tanggal:** Filter dinamis untuk menampilkan data dari rentang waktu kustom (misal: 15 Januari hingga 14 Februari).

### 3.4 Kelola Transaksi
* **Cari & Saring:** Fitur *search bar* untuk mencari transaksi spesifik dan *filter* untuk menyaring data.
* **Edit Data:** Memungkinkan pengguna untuk mengubah detail transaksi yang sudah tersimpan sebelumnya.
* **Hapus Transaksi:** Menghapus data transaksi dari sistem (dan database).

### 3.5 Scan Struk & QRIS
* **Foto atau Unggah Struk:** Antarmuka untuk mengambil gambar langsung atau mengunggah gambar dari galeri.
* **Isi Otomatis dari Struk:** Mengirim gambar ke Paxsenix API (OCR) untuk mengekstrak nominal dan tanggal, lalu mengisi form secara otomatis.
* **Pindai QRIS:** Mendeteksi dan membaca nilai transaksi dari gambar/tangkapan layar kode QRIS.

### 3.6 Email Bank Otomatis
* **Hubungkan Email Bank:** Fitur untuk menghubungkan/meneruskan (*forward*) notifikasi email dari Bank BSI.
* **Deteksi Transaksi:** Sistem memilah (*parsing*) isi email yang masuk untuk mengekstrak data pengeluaran.
* **Konfirmasi Sebelum Simpan:** Menampilkan *draft* dari hasil deteksi email, pengguna harus mengklik konfirmasi sebelum data permanen disimpan.

### 3.7 Akun & Penyimpanan
* **Daftar & Masuk:** Sistem autentikasi pengguna (*Login/Register*) menggunakan Supabase Auth.
* **Sinkron Otomatis:** Memastikan semua data tersimpan dan tersinkronisasi secara *real-time* ke Supabase.
* **Keluar & Keamanan:** Fitur *Logout* dan manajemen keamanan sesi akun.

### 3.8 Pengaturan & Ekstra
* **Mode Gelap:** *Toggle* / tombol untuk mengubah tema UI antara *Light Mode* dan *Dark Mode*.
* **Ekspor Data:** Tombol untuk mengunduh seluruh data pengeluaran dalam format .CSV atau .Excel.
* **Impor Data:** Fitur untuk mengunggah file .CSV agar datanya masuk ke dalam aplikasi.