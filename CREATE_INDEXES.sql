-- Database Performance Optimization: Create Indexes
-- Run this script to improve query performance

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
-- Note: password_hash_type index will be created after running MIGRATION_PASSWORD_HASH_TYPE.sql

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

-- Verify indexes created
SELECT 
    name as index_name,
    tbl_name as table_name,
    sql as create_statement
FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%'
ORDER BY tbl_name, name;

-- Analyze tables for query optimization
ANALYZE;

-- Vacuum database to reclaim space and optimize
VACUUM;

-- Show index statistics
SELECT 
    tbl_name as table_name,
    COUNT(*) as index_count
FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%'
GROUP BY tbl_name
ORDER BY index_count DESC;
