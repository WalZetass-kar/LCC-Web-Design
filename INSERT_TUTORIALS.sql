-- ═══════════════════════════════════════════════════════════════
-- INSERT TUTORIAL LENGKAP - MediaSoft POS
-- Panduan penggunaan aplikasi untuk semua fitur
-- ═══════════════════════════════════════════════════════════════

-- Hapus data tutorial lama (opsional)
DELETE FROM mediasoft_tutorials;

-- Insert tutorial lengkap
INSERT INTO mediasoft_tutorials (title, content, created_at) VALUES

-- 1. GETTING STARTED
('🚀 Memulai dengan MediaSoft POS',
'## Selamat Datang di MediaSoft POS!

MediaSoft POS adalah aplikasi Point of Sale lengkap untuk mengelola toko retail Anda.

### Fitur Utama:
- **Transaksi Penjualan** — Kasir dengan barcode scanner
- **Manajemen Produk** — Kelola stok & harga
- **Laporan Lengkap** — Penjualan, laba rugi, stok
- **Customer & Supplier** — Database pelanggan & pemasok
- **Kas & Shift** — Kelola uang kasir
- **Multi-Payment** — Tunai, Transfer, Kartu, E-Wallet, QRIS

### Login Pertama Kali:
- Username: `admin`
- Password: `admin`
- **⚠️ Segera ubah password setelah login!**

### Navigasi Cepat:
- Gunakan **F1-F10** untuk akses cepat menu
- Tekan **Ctrl+K** untuk quick search
- Tekan **ESC** untuk tutup modal',
datetime('now')),

-- 2. TRANSAKSI PENJUALAN
('💰 Cara Melakukan Transaksi Penjualan',
'## Panduan Transaksi Penjualan (Kasir)

### Langkah-langkah:

1. **Buka Menu Transaksi**
   - Klik menu **Transaksi** di sidebar
   - Atau tekan **F1** untuk akses cepat

2. **Tambah Produk ke Keranjang**
   - Gunakan kolom pencarian untuk cari produk
   - Atau scan **barcode** produk
   - Klik produk untuk tambahkan ke keranjang
   - Atur **qty** sesuai kebutuhan

3. **Pilih Customer (Opsional)**
   - Pilih customer untuk tracking poin loyalty
   - Poin otomatis: **Rp 10.000 = 1 poin**

4. **Terapkan Diskon (Opsional)**
   - Masukkan diskon dalam **persen (%)** atau **nominal (Rp)**
   - Diskon berlaku untuk total transaksi

5. **Pilih Metode Pembayaran**
   - **Tunai** — bayar cash
   - **Transfer** — transfer bank
   - **Kartu Debit/Kredit**
   - **E-Wallet** (GoPay, OVO, Dana, dll)
   - **QRIS** — scan QR code

6. **Proses Pembayaran**
   - Masukkan jumlah bayar
   - Sistem otomatis hitung kembalian
   - Klik **Bayar** untuk selesaikan transaksi

7. **Cetak Struk**
   - Struk otomatis muncul setelah pembayaran
   - Klik **Cetak** untuk print struk

### Tips:
- Gunakan **barcode scanner** untuk transaksi lebih cepat
- Pajak otomatis dihitung sesuai pengaturan
- Riwayat transaksi tersimpan otomatis',
datetime('now')),

-- 3. MANAJEMEN PRODUK
('📦 Cara Mengelola Produk',
'## Panduan Manajemen Produk

### Tambah Produk Baru:

1. Buka menu **Produk** (F2)
2. Klik **+ Tambah Produk**
3. Isi data produk:
   - **Nama Produk** — wajib diisi
   - **Kategori** — pilih atau buat baru
   - **Satuan** — pcs, kg, liter, dll
   - **Barcode** — untuk scan kasir
   - **Harga Modal** — harga beli/produksi
   - **Harga Jual** — harga jual ke customer
   - **Stok** — jumlah stok tersedia
   - **Stok Minimum** — alert stok menipis
   - **Diskon** — diskon khusus produk (%)
   - **Expired Date** — tanggal kadaluarsa
   - **Foto Produk** — upload gambar
4. Klik **Simpan**

### Edit Produk:
- Klik ikon **pensil** di baris produk
- Ubah data yang diperlukan
- Klik **Simpan**

### Hapus Produk:
- Klik ikon **tempat sampah**
- Konfirmasi penghapusan

### Fitur Pencarian:
- Cari berdasarkan **nama** atau **barcode**
- Filter berdasarkan **kategori**
- Urutkan berdasarkan **nama**, **harga**, atau **stok**

### Tips:
- Gunakan **barcode** untuk mempercepat transaksi
- Set **stok minimum** untuk notifikasi otomatis
- Upload **foto produk** untuk tampilan lebih menarik',
datetime('now')),

-- 4. KALKULATOR HPP
('🧮 Cara Menggunakan Kalkulator HPP',
'## Panduan Kalkulator HPP (Harga Pokok Produksi)

### Apa itu HPP?
**HPP = Modal + Biaya Lain-lain**

HPP adalah total biaya yang dikeluarkan untuk memproduksi atau membeli produk. Gunakan HPP sebagai dasar penetapan harga jual.

### Langkah-langkah:

1. Buka menu **Kalkulator HPP**
2. Masukkan **Nama Produk**
3. Isi **Modal**:
   - Bahan baku
   - Tenaga kerja
   - Biaya produksi
4. Isi **Biaya Lain**:
   - Kemasan
   - Ongkos kirim
   - Listrik, air, dll
5. Klik **Hitung HPP**
6. Sistem akan tampilkan:
   - **Total HPP**
   - **Rekomendasi Harga Jual** (margin 30%)

### Rumus Harga Jual:
```
Harga Jual = HPP × (1 + Margin Keuntungan)
```

### Contoh:
- Modal: Rp 8.000
- Biaya Lain: Rp 2.000
- **HPP: Rp 10.000**
- Margin 30% → **Harga Jual: Rp 13.000**
- Margin 50% → **Harga Jual: Rp 15.000**

### Riwayat Kalkulasi:
- Semua kalkulasi tersimpan otomatis
- Lihat riwayat di panel kanan
- Hapus riwayat yang tidak diperlukan

### Batasan Akun Demo:
- Akun **demo** dibatasi **10x kalkulasi**
- Akun lainnya **unlimited**',
datetime('now')),

-- 5. CUSTOMER & LOYALTY
('👥 Cara Mengelola Customer & Poin Loyalty',
'## Panduan Customer & Program Poin

### Tambah Customer Baru:

1. Buka menu **Customer** (F4)
2. Klik **+ Tambah Customer**
3. Isi data:
   - **Nama** — wajib diisi
   - **Telepon** — untuk kontak
   - **Email** — opsional
   - **Alamat** — opsional
   - **Tanggal Lahir** — untuk birthday reminder
4. Klik **Simpan**

### Program Poin Loyalty:
- **Rp 10.000 = 1 poin**
- Poin otomatis dihitung saat transaksi
- Lihat total poin di detail customer
- Tracking total belanja customer

### Riwayat Pembelian:
- Klik customer untuk lihat detail
- Tampil riwayat transaksi lengkap
- Total belanja & poin terakumulasi

### Fitur Pencarian:
- Cari berdasarkan **nama** atau **telepon**
- Filter berdasarkan **status** (aktif/nonaktif)

### Tips:
- Gunakan program poin untuk customer retention
- Birthday reminder untuk promo spesial
- Export data customer untuk marketing',
datetime('now')),

-- 6. SUPPLIER
('🚚 Cara Mengelola Supplier',
'## Panduan Manajemen Supplier

### Tambah Supplier Baru:

1. Buka menu **Supplier** (F5)
2. Klik **+ Tambah Supplier**
3. Isi data:
   - **Nama Supplier** — wajib diisi
   - **Kontak Person** — nama PIC
   - **Telepon** — nomor kontak
   - **Email** — email supplier
   - **Alamat** — alamat lengkap
   - **Status** — aktif/nonaktif
4. Klik **Simpan**

### Riwayat Pembelian:
- Klik supplier untuk lihat detail
- Tampil riwayat pembelian dari supplier
- Total pembelian terakumulasi

### Fitur Pencarian:
- Cari berdasarkan **nama** atau **kontak**
- Filter berdasarkan **status**

### Tips:
- Simpan data supplier lengkap untuk kemudahan order
- Tracking riwayat pembelian per supplier
- Nonaktifkan supplier yang sudah tidak digunakan',
datetime('now')),

-- 7. PEMBELIAN
('🛒 Cara Melakukan Pembelian dari Supplier',
'## Panduan Transaksi Pembelian

### Langkah-langkah:

1. Buka menu **Pembelian** (F6)
2. Klik **+ Tambah Pembelian**
3. Pilih **Supplier**
4. Tambah produk:
   - Pilih produk dari list
   - Atau tambah produk baru
   - Atur **qty** dan **harga beli**
5. Sistem otomatis hitung **total**
6. Pilih **metode pembayaran**:
   - **Lunas** — bayar penuh
   - **Hutang** — bayar nanti
   - **Cicilan** — bayar bertahap
7. Klik **Simpan**

### Stok Otomatis Update:
- Stok produk otomatis bertambah
- Harga modal terupdate sesuai harga beli

### Tracking Hutang:
- Hutang tercatat otomatis
- Lihat di menu **Hutang & Piutang**
- Bayar cicilan kapan saja

### Tips:
- Cek harga beli untuk update harga modal
- Gunakan fitur hutang untuk cash flow management
- Export laporan pembelian per periode',
datetime('now')),

-- 8. KAS & SHIFT
('💵 Cara Mengelola Kas & Shift Kasir',
'## Panduan Kas & Shift Management

### Buka Kas/Shift:

1. Buka menu **Kas** (F7)
2. Klik **Buka Kas/Shift**
3. Masukkan **modal awal** kasir
4. Klik **Buka Shift**

### Selama Shift:
- Semua transaksi tercatat otomatis
- Tambah **pengeluaran** jika ada:
  - Klik **+ Pengeluaran**
  - Isi keterangan & nominal
  - Klik **Simpan**

### Tutup Kas/Shift:

1. Klik **Tutup Kas/Shift**
2. Hitung uang fisik di kasir
3. Masukkan **total uang akhir**
4. Sistem otomatis hitung:
   - **Selisih kas** (lebih/kurang)
   - **Total penjualan**
   - **Total pengeluaran**
5. Klik **Tutup Shift**

### Laporan Shift:
- Lihat detail penjualan per shift
- Tracking selisih kas
- Export laporan untuk rekonsiliasi

### Tips:
- Selalu buka shift sebelum transaksi
- Catat semua pengeluaran
- Tutup shift setiap akhir hari/pergantian kasir',
datetime('now')),

-- 9. LAPORAN
('📊 Cara Membuat & Export Laporan',
'## Panduan Laporan

### Jenis Laporan:

1. **Laporan Penjualan**
   - Ringkasan transaksi per periode
   - Total penjualan & jumlah transaksi
   - Breakdown per metode pembayaran

2. **Laporan Laba Rugi**
   - Pendapatan vs Modal
   - Keuntungan bersih
   - Margin keuntungan (%)

3. **Laporan Produk Terlaris**
   - Top 10 produk paling laku
   - Qty terjual & total omzet

4. **Laporan Stok**
   - Kondisi stok saat ini
   - Alert stok menipis
   - Nilai stok (modal × qty)

5. **Laporan Kas**
   - Rekap kas per shift
   - Selisih kas
   - Pengeluaran

### Cara Membuat Laporan:

1. Buka menu **Laporan** (F8)
2. Pilih **jenis laporan**
3. Pilih **rentang tanggal**:
   - Hari ini
   - Minggu ini
   - Bulan ini
   - Custom range
4. Klik **Tampilkan**

### Export Laporan:

- **Export Excel** — untuk analisis data
- **Export PDF** — untuk print/arsip
- **Print Langsung** — cetak ke printer

### Tips:
- Buat laporan rutin setiap akhir bulan
- Gunakan laporan laba rugi untuk evaluasi bisnis
- Export untuk backup data',
datetime('now')),

-- 10. SETTINGS
('⚙️ Pengaturan Aplikasi',
'## Panduan Settings

### Identitas Toko:
- **Nama Toko** — tampil di struk
- **Alamat** — alamat lengkap
- **Telepon** — kontak toko
- **Email** — email toko

### Pengaturan Pajak:
- **Aktifkan Pajak** — on/off
- **Persentase Pajak** — default 10%
- Pajak otomatis dihitung di transaksi

### Pengaturan Barcode:
- **Prefix Barcode** — awalan kode
- **Panjang Barcode** — jumlah digit
- Auto-generate barcode untuk produk baru

### Tema & Tampilan:
- **Light Mode** — tema terang
- **Dark Mode** — tema gelap
- **Color Theme** — pilih warna:
  - Indigo (default)
  - Emerald
  - Rose
  - Amber
  - Sky

### Backup & Restore:
- **Backup Manual** — backup database
- **Auto Backup** — jadwal otomatis
- **Restore** — kembalikan dari backup
- **Download Backup** — simpan file backup

### User Management:
- Kelola akun pengguna
- Role-based access:
  - **Developer** — full access
  - **Superadmin** — full access
  - **Admin** — kelola data
  - **Operator** — transaksi & laporan
  - **Kasir** — transaksi saja
  - **Demo** — read-only

### Tips:
- Backup database secara rutin
- Ubah password default segera
- Atur role user sesuai kebutuhan',
datetime('now')),

-- 11. KEYBOARD SHORTCUTS
('⌨️ Keyboard Shortcuts',
'## Daftar Keyboard Shortcuts

### Navigasi Cepat:
- **F1** — Transaksi (Kasir)
- **F2** — Produk
- **F3** — Riwayat
- **F4** — Customer
- **F5** — Supplier
- **F6** — Pembelian
- **F7** — Kas
- **F8** — Laporan
- **F9** — Settings
- **F10** — Dashboard

### Quick Actions:
- **Ctrl+K** — Quick Search (command palette)
- **ESC** — Tutup modal/dialog
- **Enter** — Konfirmasi/Submit
- **Tab** — Pindah field

### Tips Produktivitas:
- Gunakan **F-keys** untuk navigasi cepat
- **Ctrl+K** untuk cari menu/fitur
- Kombinasi keyboard mempercepat workflow kasir

### Barcode Scanner:
- Scan barcode langsung di halaman transaksi
- Produk otomatis masuk keranjang
- Tekan **Enter** untuk proses',
datetime('now')),

-- 12. TROUBLESHOOTING
('🔧 Troubleshooting & FAQ',
'## Troubleshooting

### Login Gagal:
- Pastikan username & password benar
- Default: `admin` / `admin`
- Hubungi admin untuk reset password

### Produk Tidak Muncul di Kasir:
- Cek stok produk (harus > 0)
- Pastikan produk aktif
- Refresh halaman (F5)

### Struk Tidak Tercetak:
- Cek koneksi printer
- Pastikan printer default sudah diset
- Gunakan **Print Preview** untuk cek

### Database Error:
- Restart aplikasi
- Restore dari backup terakhir
- Hubungi support

### Stok Tidak Akurat:
- Lakukan **Stok Opname**
- Adjustment otomatis setelah approval
- Cek riwayat transaksi

### Laporan Tidak Sesuai:
- Pastikan rentang tanggal benar
- Cek filter yang diterapkan
- Export untuk analisis detail

### FAQ:

**Q: Bagaimana cara backup data?**
A: Settings → Backup & Restore → Backup Manual

**Q: Bisa multi-user?**
A: Ya, kelola di Settings → User Management

**Q: Apakah bisa offline?**
A: Ya, aplikasi desktop berjalan offline

**Q: Bagaimana cara update aplikasi?**
A: Notifikasi update otomatis muncul

**Q: Support barcode scanner?**
A: Ya, semua barcode scanner USB/Bluetooth

### Butuh Bantuan?
Hubungi support atau buka issue di GitHub',
datetime('now'));

-- Selesai
SELECT 'Tutorial berhasil diinsert! Total: ' || COUNT(*) || ' tutorial' as result 
FROM mediasoft_tutorials;
