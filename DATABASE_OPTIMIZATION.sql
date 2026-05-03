-- ============================================
-- DATABASE OPTIMIZATION
-- Add indexes for better query performance
-- ============================================

-- Barang (Products)
CREATE INDEX IF NOT EXISTS idx_barang_nama ON mediasoft_barang(nama_barang);
CREATE INDEX IF NOT EXISTS idx_barang_kategori ON mediasoft_barang(kd_kategori_barang);
CREATE INDEX IF NOT EXISTS idx_barang_barcode ON mediasoft_barang(barcode);
CREATE INDEX IF NOT EXISTS idx_barang_stok ON mediasoft_barang(stok);
CREATE INDEX IF NOT EXISTS idx_barang_satuan ON mediasoft_barang(kd_satuan);

-- Customer
CREATE INDEX IF NOT EXISTS idx_customer_nama ON mediasoft_customer(nama_customer);
CREATE INDEX IF NOT EXISTS idx_customer_telp ON mediasoft_customer(no_telp);
CREATE INDEX IF NOT EXISTS idx_customer_status ON mediasoft_customer(status);

-- Notifikasi
CREATE INDEX IF NOT EXISTS idx_notifikasi_user ON mediasoft_notifikasi(username);
CREATE INDEX IF NOT EXISTS idx_notifikasi_dibaca ON mediasoft_notifikasi(dibaca);

-- Kas
CREATE INDEX IF NOT EXISTS idx_kas_drawer_user ON mediasoft_kas_drawer(username);
CREATE INDEX IF NOT EXISTS idx_kas_drawer_status ON mediasoft_kas_drawer(status);

-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space and optimize
VACUUM;

-- ============================================
-- END OF OPTIMIZATION
-- ============================================
