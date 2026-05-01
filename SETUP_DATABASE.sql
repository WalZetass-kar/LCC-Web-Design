-- ============================================================================
-- MediaSoft POS - Database Setup Script
-- Run this script to set up all database enhancements
-- ============================================================================

-- ============================================================================
-- STEP 1: Create New Tables (if not exist)
-- ============================================================================

-- Customer Table
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

-- Kas Drawer Table
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

-- Kas Transaksi Table
CREATE TABLE IF NOT EXISTS mediasoft_kas_transaksi (
    kd_kas_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
    kd_kas TEXT NOT NULL,
    tgl_transaksi TEXT NOT NULL,
    jenis TEXT NOT NULL,
    jumlah REAL NOT NULL,
    keterangan TEXT,
    username TEXT
);

-- Notifikasi Table
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

-- Backup Table
CREATE TABLE IF NOT EXISTS mediasoft_backup (
    kd_backup INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_file TEXT NOT NULL,
    ukuran INTEGER,
    tgl_backup TEXT NOT NULL,
    username TEXT,
    keterangan TEXT
);

-- Pembelian Table
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

-- Pembelian Detail Table
CREATE TABLE IF NOT EXISTS mediasoft_pembelian_detail (
    kd_pembelian_detail INTEGER PRIMARY KEY AUTOINCREMENT,
    kd_pembelian TEXT NOT NULL,
    kd_barang TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    harga_beli REAL DEFAULT 0,
    total REAL DEFAULT 0
);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS mediasoft_activity_log (
    kd_log INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    aktivitas TEXT NOT NULL,
    modul TEXT NOT NULL,
    tgl_aktivitas TEXT NOT NULL,
    ip_address TEXT,
    detail TEXT
);

-- ============================================================================
-- STEP 2: Add New Columns to Existing Tables
-- ============================================================================

-- Add columns to pengguna table (ignore errors if already exist)
ALTER TABLE mediasoft_pengguna ADD COLUMN role TEXT DEFAULT 'KASIR';
ALTER TABLE mediasoft_pengguna ADD COLUMN email TEXT;
ALTER TABLE mediasoft_pengguna ADD COLUMN no_telp TEXT;
ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';

-- Add columns to barang table
ALTER TABLE mediasoft_barang ADD COLUMN stok_minimum INTEGER DEFAULT 5;
ALTER TABLE mediasoft_barang ADD COLUMN barcode TEXT;
ALTER TABLE mediasoft_barang ADD COLUMN expired_date TEXT;

-- Add columns to penjualan table
ALTER TABLE mediasoft_penjualan ADD COLUMN pajak REAL DEFAULT 0;
ALTER TABLE mediasoft_penjualan ADD COLUMN kd_customer TEXT;

-- Add columns to identitas table
ALTER TABLE mediasoft_identitas ADD COLUMN logo TEXT;
ALTER TABLE mediasoft_identitas ADD COLUMN npwp TEXT;
ALTER TABLE mediasoft_identitas ADD COLUMN pajak_persen REAL DEFAULT 0;

-- Add columns to supplier table
ALTER TABLE mediasoft_supplier ADD COLUMN email TEXT;
ALTER TABLE mediasoft_supplier ADD COLUMN status TEXT DEFAULT 'Aktif';

-- ============================================================================
-- STEP 3: Update Existing Data
-- ============================================================================

-- Update password_hash_type for existing users
UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;

-- Update role for admin user
UPDATE mediasoft_pengguna SET role = 'ADMIN' WHERE nama_pengguna = 'admin' AND role IS NULL;

-- Update role for other users
UPDATE mediasoft_pengguna SET role = 'KASIR' WHERE role IS NULL;

-- ============================================================================
-- STEP 4: Create Performance Indexes
-- ============================================================================

-- Barang (Products) Indexes
CREATE INDEX IF NOT EXISTS idx_barang_kd_barang ON mediasoft_barang(kd_barang);
CREATE INDEX IF NOT EXISTS idx_barang_nama ON mediasoft_barang(nama_barang);
CREATE INDEX IF NOT EXISTS idx_barang_barcode ON mediasoft_barang(barcode);
CREATE INDEX IF NOT EXISTS idx_barang_kategori ON mediasoft_barang(kd_kategori_barang);
CREATE INDEX IF NOT EXISTS idx_barang_stok ON mediasoft_barang(stok);

-- Penjualan (Sales) Indexes
CREATE INDEX IF NOT EXISTS idx_penjualan_kd ON mediasoft_penjualan(kd_tansaksi_jual);
CREATE INDEX IF NOT EXISTS idx_penjualan_tgl ON mediasoft_penjualan(tgl_wkt_transaksi);
CREATE INDEX IF NOT EXISTS idx_penjualan_customer ON mediasoft_penjualan(kd_customer);
CREATE INDEX IF NOT EXISTS idx_penjualan_username ON mediasoft_penjualan(username_transaksi);

-- Penjualan Detail Indexes
CREATE INDEX IF NOT EXISTS idx_penjualan_detail_kd_transaksi ON mediasoft_penjualan_detail(kd_tansaksi_jual);
CREATE INDEX IF NOT EXISTS idx_penjualan_detail_kd_barang ON mediasoft_penjualan_detail(kd_barang);

-- Pengguna (Users) Indexes
CREATE INDEX IF NOT EXISTS idx_pengguna_username ON mediasoft_pengguna(nama_pengguna);
CREATE INDEX IF NOT EXISTS idx_pengguna_status ON mediasoft_pengguna(status_user);
CREATE INDEX IF NOT EXISTS idx_pengguna_role ON mediasoft_pengguna(role);
CREATE INDEX IF NOT EXISTS idx_pengguna_hash_type ON mediasoft_pengguna(password_hash_type);

-- Customer Indexes
CREATE INDEX IF NOT EXISTS idx_customer_kd ON mediasoft_customer(kd_customer);
CREATE INDEX IF NOT EXISTS idx_customer_nama ON mediasoft_customer(nama_customer);
CREATE INDEX IF NOT EXISTS idx_customer_status ON mediasoft_customer(status);
CREATE INDEX IF NOT EXISTS idx_customer_poin ON mediasoft_customer(poin);

-- Supplier Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_kd ON mediasoft_supplier(kd_suplier);
CREATE INDEX IF NOT EXISTS idx_supplier_nama ON mediasoft_supplier(nama_suplier);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON mediasoft_supplier(status);

-- Pembelian (Purchases) Indexes
CREATE INDEX IF NOT EXISTS idx_pembelian_kd ON mediasoft_pembelian(kd_pembelian);
CREATE INDEX IF NOT EXISTS idx_pembelian_tgl ON mediasoft_pembelian(tgl_pembelian);
CREATE INDEX IF NOT EXISTS idx_pembelian_supplier ON mediasoft_pembelian(kd_suplier);
CREATE INDEX IF NOT EXISTS idx_pembelian_status ON mediasoft_pembelian(status);

-- Pembelian Detail Indexes
CREATE INDEX IF NOT EXISTS idx_pembelian_detail_kd_pembelian ON mediasoft_pembelian_detail(kd_pembelian);
CREATE INDEX IF NOT EXISTS idx_pembelian_detail_kd_barang ON mediasoft_pembelian_detail(kd_barang);

-- Activity Log Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_username ON mediasoft_activity_log(username);
CREATE INDEX IF NOT EXISTS idx_activity_log_tgl ON mediasoft_activity_log(tgl_aktivitas);
CREATE INDEX IF NOT EXISTS idx_activity_log_modul ON mediasoft_activity_log(modul);
CREATE INDEX IF NOT EXISTS idx_activity_log_aktivitas ON mediasoft_activity_log(aktivitas);

-- Notifikasi Indexes
CREATE INDEX IF NOT EXISTS idx_notifikasi_dibaca ON mediasoft_notifikasi(dibaca);
CREATE INDEX IF NOT EXISTS idx_notifikasi_jenis ON mediasoft_notifikasi(jenis);
CREATE INDEX IF NOT EXISTS idx_notifikasi_username ON mediasoft_notifikasi(username);
CREATE INDEX IF NOT EXISTS idx_notifikasi_tgl ON mediasoft_notifikasi(tgl_dibuat);

-- Kas Drawer Indexes
CREATE INDEX IF NOT EXISTS idx_kas_drawer_username ON mediasoft_kas_drawer(username);
CREATE INDEX IF NOT EXISTS idx_kas_drawer_status ON mediasoft_kas_drawer(status);
CREATE INDEX IF NOT EXISTS idx_kas_drawer_tgl_buka ON mediasoft_kas_drawer(tgl_buka);

-- Kas Transaksi Indexes
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_kd_kas ON mediasoft_kas_transaksi(kd_kas);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_jenis ON mediasoft_kas_transaksi(jenis);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tgl ON mediasoft_kas_transaksi(tgl_transaksi);

-- Backup Indexes
CREATE INDEX IF NOT EXISTS idx_backup_tgl ON mediasoft_backup(tgl_backup);
CREATE INDEX IF NOT EXISTS idx_backup_username ON mediasoft_backup(username);

-- ============================================================================
-- STEP 5: Insert Sample Data
-- ============================================================================

-- Sample Customer (if not exists)
INSERT OR IGNORE INTO mediasoft_customer (kd_customer, nama_customer, no_telp, email, tgl_daftar, status)
VALUES ('CUST001', 'Customer Umum', '08123456789', 'customer@example.com', datetime('now'), 'Aktif');

-- Welcome Notification
INSERT OR IGNORE INTO mediasoft_notifikasi (judul, pesan, jenis, tgl_dibuat, dibaca, username)
VALUES ('Selamat Datang', 'Sistem MediaSoft POS berhasil diupdate ke versi 4.0 dengan security enhancement', 'INFO', datetime('now'), 0, 'admin');

-- ============================================================================
-- STEP 6: Optimize Database
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE;

-- Vacuum database to reclaim space and optimize
VACUUM;

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

-- Verify new tables created
SELECT 
    'New Tables Check' as check_name,
    COUNT(*) as tables_created
FROM sqlite_master 
WHERE type = 'table' 
  AND name IN (
    'mediasoft_customer',
    'mediasoft_kas_drawer',
    'mediasoft_kas_transaksi',
    'mediasoft_notifikasi',
    'mediasoft_backup',
    'mediasoft_pembelian',
    'mediasoft_pembelian_detail',
    'mediasoft_activity_log'
  );

-- Verify password_hash_type column
SELECT 
    'Password Hash Type Column' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ OK'
        ELSE '✗ FAILED'
    END as status
FROM pragma_table_info('mediasoft_pengguna')
WHERE name = 'password_hash_type';

-- Show password migration status
SELECT 
    'Password Migration Status' as check_name,
    COUNT(*) as total_users,
    SUM(CASE WHEN password_hash_type = 'bcrypt' THEN 1 ELSE 0 END) as migrated,
    SUM(CASE WHEN password_hash_type = 'sha1' OR password_hash_type IS NULL THEN 1 ELSE 0 END) as pending,
    ROUND(SUM(CASE WHEN password_hash_type = 'bcrypt' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) || '%' as percentage
FROM mediasoft_pengguna;

-- Show index statistics
SELECT 
    'Index Statistics' as check_name,
    tbl_name as table_name,
    COUNT(*) as index_count
FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%'
GROUP BY tbl_name
ORDER BY index_count DESC;

-- Show total indexes created
SELECT 
    'Total Indexes' as check_name,
    COUNT(*) as total_indexes
FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%';

-- Show all tables
SELECT 
    'All Tables' as check_name,
    COUNT(*) as total_tables
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'mediasoft_%';

-- ============================================================================
-- Setup Complete!
-- ============================================================================
SELECT '✓ Database setup completed successfully!' as message;
SELECT 'All tables created, columns added, indexes created, and data optimized.' as details;
