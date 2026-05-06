-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Tutorial & HPP Calculator Tables
-- Run this script once against sistem_pos.db
-- ═══════════════════════════════════════════════════════════════

-- 1. Tutorials table (all users can view, admin can manage)
CREATE TABLE IF NOT EXISTS mediasoft_tutorials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  created_at  TEXT    NOT NULL
);

-- Seed with sample data
INSERT OR IGNORE INTO mediasoft_tutorials (id, title, content, created_at) VALUES
(1, 'Cara Melakukan Transaksi Penjualan',
'## Panduan Transaksi Penjualan\n\n1. Buka menu **Kasir** di sidebar kiri.\n2. Cari produk menggunakan kolom pencarian atau scan barcode.\n3. Klik produk untuk menambahkan ke keranjang.\n4. Atur jumlah qty jika diperlukan.\n5. Pilih metode pembayaran (Tunai / Transfer).\n6. Masukkan jumlah bayar lalu klik **Bayar**.\n7. Struk akan muncul otomatis — cetak jika diperlukan.',
datetime('now')),

(2, 'Cara Mengelola Produk',
'## Panduan Manajemen Produk\n\n1. Buka menu **Produk** di sidebar.\n2. Klik tombol **+ Tambah Produk** untuk menambahkan produk baru.\n3. Isi nama, kategori, harga jual, dan harga modal.\n4. Upload foto produk (opsional).\n5. Atur stok minimum untuk notifikasi stok rendah.\n6. Klik **Simpan** untuk menyimpan data produk.',
datetime('now')),

(3, 'Cara Menggunakan Kalkulator HPP',
'## Panduan Kalkulator HPP (Harga Pokok Produksi)\n\n**HPP = Modal + Biaya Lain-lain**\n\n1. Buka menu **Kalkulator HPP** di sidebar.\n2. Masukkan nama produk.\n3. Isi **Modal** (bahan baku + tenaga kerja).\n4. Isi **Biaya Lain** (kemasan, ongkos kirim, dll).\n5. Klik **Hitung HPP** untuk mendapatkan hasil.\n6. Gunakan HPP sebagai dasar penetapan harga jual.\n\n**Tips:** Harga jual ideal = HPP × (1 + margin keuntungan)\nContoh: HPP Rp 10.000 dengan margin 30% → Harga jual Rp 13.000',
datetime('now')),

(4, 'Cara Membuat Laporan',
'## Panduan Laporan\n\n1. Buka menu **Laporan** di sidebar.\n2. Pilih rentang tanggal laporan.\n3. Pilih jenis laporan:\n   - **Penjualan** — ringkasan transaksi per periode\n   - **Laba Rugi** — kalkulasi keuntungan bersih\n   - **Produk Terlaris** — produk dengan penjualan tertinggi\n   - **Stok** — kondisi stok saat ini\n4. Klik **Tampilkan** untuk memuat laporan.\n5. Export ke Excel atau PDF menggunakan tombol di pojok kanan.',
datetime('now')),

(5, 'Cara Mengelola Customer & Poin',
'## Panduan Customer & Program Poin\n\n1. Buka menu **Customer** untuk mengelola data pelanggan.\n2. Klik **+ Tambah Customer** dan isi data lengkap.\n3. Saat transaksi, pilih customer di form kasir.\n4. Poin otomatis dihitung: **Rp 10.000 = 1 poin**.\n5. Poin dapat dilihat di detail customer.\n6. Filter customer berdasarkan status atau cari berdasarkan nama/telepon.',
datetime('now'));

-- 2. HPP Calculations table
CREATE TABLE IF NOT EXISTS mediasoft_hpp_calculations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT    NOT NULL,
  nama_produk  TEXT    NOT NULL,
  modal        REAL    NOT NULL DEFAULT 0,
  biaya_lain   REAL    NOT NULL DEFAULT 0,
  total_hpp    REAL    NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL
);

-- Index for faster per-user queries
CREATE INDEX IF NOT EXISTS idx_hpp_user_id ON mediasoft_hpp_calculations(user_id);

PRAGMA journal_mode=WAL;
