-- MediaSoft POS - SQL Script untuk Membuat Tabel Baru
-- Jalankan script ini di database sistem_pos.db

-- 1. Update tabel pengguna (tambah kolom baru)
ALTER TABLE mediasoft_pengguna ADD COLUMN role TEXT DEFAULT 'KASIR' NOT NULL;
ALTER TABLE mediasoft_pengguna ADD COLUMN email TEXT;
ALTER TABLE mediasoft_pengguna ADD COLUMN no_telp TEXT;

-- 2. Update tabel barang (tambah kolom baru)
ALTER TABLE mediasoft_barang ADD COLUMN stok_minimum INTEGER DEFAULT 5;
ALTER TABLE mediasoft_barang ADD COLUMN barcode TEXT;
ALTER TABLE mediasoft_barang ADD COLUMN expired_date TEXT;

-- 3. Update tabel penjualan (tambah kolom baru)
ALTER TABLE mediasoft_penjualan ADD COLUMN pajak REAL DEFAULT 0;
ALTER TABLE mediasoft_penjualan ADD COLUMN kd_customer TEXT;

-- 4. Update tabel identitas (tambah kolom baru)
ALTER TABLE mediasoft_identitas ADD COLUMN logo TEXT;
ALTER TABLE mediasoft_identitas ADD COLUMN npwp TEXT;
ALTER TABLE mediasoft_identitas ADD COLUMN pajak_persen REAL DEFAULT 0;

-- 5. Update tabel supplier (tambah kolom baru)
ALTER TABLE mediasoft_supplier ADD COLUMN email TEXT;
ALTER TABLE mediasoft_supplier ADD COLUMN status TEXT DEFAULT 'Aktif';

-- 6. Tabel Customer (baru)
CREATE TABLE IF NOT EXISTS mediasoft_customer (
    kd_customer TEXT PRIMARY KEY NOT NULL,
    nama_customer TEXT NOT NULL,
    no_telp TEXT,
    email TEXT,
    alamat TEXT,
    tgl_lahir TEXT,
    poin INTEGER DEFAULT 0,
    total_belanja REAL DEFAULT 0,
    tgl_daftar TEXT,
    status TEXT DEFAULT 'Aktif'
);

-- 7. Tabel Kas Drawer (baru)
CREATE TABLE IF NOT EXISTS mediasoft_kas_drawer (
    kd_kas TEXT PRIMARY KEY NOT NULL,
    tgl_buka TEXT NOT NULL,
    tgl_tutup TEXT,
    username TEXT NOT NULL,
    modal_awal REAL DEFAULT 0,
    total_penjualan REAL DEFAULT 0,
    total_pengeluaran REAL DEFAULT 0,
    saldo_akhir REAL DEFAULT 0,
    selisih REAL DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    catatan TEXT
);

-- 8. Tabel Kas Transaksi (baru)
CREATE TABLE IF NOT EXISTS mediasoft_kas_transaksi (
    kd_kas_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
    kd_kas TEXT NOT NULL,
    tgl_transaksi TEXT NOT NULL,
    jenis TEXT NOT NULL,
    jumlah REAL NOT NULL,
    keterangan TEXT,
    username TEXT
);

-- 9. Tabel Notifikasi (baru)
CREATE TABLE IF NOT EXISTS mediasoft_notifikasi (
    kd_notifikasi INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    pesan TEXT NOT NULL,
    jenis TEXT NOT NULL,
    tgl_dibuat TEXT NOT NULL,
    dibaca INTEGER DEFAULT 0,
    username TEXT,
    link TEXT
);

-- 10. Tabel Backup (baru)
CREATE TABLE IF NOT EXISTS mediasoft_backup (
    kd_backup INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_file TEXT NOT NULL,
    ukuran INTEGER,
    tgl_backup TEXT NOT NULL,
    username TEXT,
    keterangan TEXT
);

-- 11. Tabel Pembelian (baru)
CREATE TABLE IF NOT EXISTS mediasoft_pembelian (
    kd_pembelian TEXT PRIMARY KEY NOT NULL,
    tgl_pembelian TEXT NOT NULL,
    kd_suplier TEXT,
    total_qty INTEGER DEFAULT 0,
    sub_total REAL DEFAULT 0,
    yang_dibayar REAL DEFAULT 0,
    sisa_hutang REAL DEFAULT 0,
    status TEXT DEFAULT 'LUNAS',
    username TEXT,
    catatan TEXT
);

-- 12. Tabel Pembelian Detail (baru)
CREATE TABLE IF NOT EXISTS mediasoft_pembelian_detail (
    kd_pembelian_detail INTEGER PRIMARY KEY AUTOINCREMENT,
    kd_pembelian TEXT NOT NULL,
    kd_barang TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    harga_beli REAL DEFAULT 0,
    total REAL DEFAULT 0
);

-- 13. Tabel Activity Log (baru)
CREATE TABLE IF NOT EXISTS mediasoft_activity_log (
    kd_log INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    aktivitas TEXT NOT NULL,
    modul TEXT NOT NULL,
    tgl_aktivitas TEXT NOT NULL,
    ip_address TEXT,
    detail TEXT
);

-- 14. Update role user admin yang sudah ada
UPDATE mediasoft_pengguna SET role = 'ADMIN' WHERE nama_pengguna = 'admin';

-- 15. Insert sample data (optional)
-- Sample Customer
INSERT OR IGNORE INTO mediasoft_customer (kd_customer, nama_customer, no_telp, email, tgl_daftar, status)
VALUES ('CUST001', 'Customer Umum', '08123456789', 'customer@example.com', datetime('now'), 'Aktif');

-- Sample Notifikasi
INSERT INTO mediasoft_notifikasi (judul, pesan, jenis, tgl_dibuat, dibaca)
VALUES ('Selamat Datang', 'Sistem MediaSoft POS berhasil diupdate ke versi 2.0', 'INFO', datetime('now'), 0);

-- Selesai!
-- Jalankan: sqlite3 sistem_pos.db < CREATE_NEW_TABLES.sql
