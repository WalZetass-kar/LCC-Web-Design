-- ============================================================================
-- MediaSoft POS - Payment Gateway Schema
-- Run this script to add payment gateway support
-- ============================================================================

-- ============================================================================
-- Payment Methods Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediasoft_payment_method (
    kd_payment_method TEXT PRIMARY KEY NOT NULL,
    nama_method TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK(jenis IN ('CASH', 'CARD', 'EWALLET', 'QRIS', 'TRANSFER', 'CREDIT')),
    status TEXT DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
    icon TEXT,
    fee_persen REAL DEFAULT 0,
    fee_fixed REAL DEFAULT 0,
    min_amount REAL DEFAULT 0,
    max_amount REAL DEFAULT 0,
    deskripsi TEXT,
    tgl_dibuat TEXT DEFAULT (datetime('now')),
    tgl_diupdate TEXT
);

-- ============================================================================
-- Payment Transactions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediasoft_payment_transaction (
    kd_payment_transaction TEXT PRIMARY KEY NOT NULL,
    kd_transaksi_jual TEXT NOT NULL,
    kd_payment_method TEXT NOT NULL,
    jumlah REAL NOT NULL,
    fee REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
    
    -- Midtrans specific fields
    midtrans_order_id TEXT UNIQUE,
    midtrans_transaction_id TEXT,
    midtrans_transaction_status TEXT,
    payment_type TEXT,
    
    -- Payment details
    va_number TEXT,
    bank TEXT,
    qr_code_url TEXT,
    deeplink_url TEXT,
    
    -- Timestamps
    expired_at TEXT,
    paid_at TEXT,
    settlement_time TEXT,
    tgl_dibuat TEXT DEFAULT (datetime('now')),
    tgl_diupdate TEXT,
    
    -- Metadata
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    notes TEXT,
    
    FOREIGN KEY (kd_transaksi_jual) REFERENCES mediasoft_penjualan(kd_tansaksi_jual) ON DELETE CASCADE,
    FOREIGN KEY (kd_payment_method) REFERENCES mediasoft_payment_method(kd_payment_method)
);

-- ============================================================================
-- Payment Settlement Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediasoft_payment_settlement (
    kd_settlement INTEGER PRIMARY KEY AUTOINCREMENT,
    tgl_settlement TEXT NOT NULL,
    tgl_mulai TEXT NOT NULL,
    tgl_selesai TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    total_transaksi INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    total_fee REAL DEFAULT 0,
    net_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    settlement_file TEXT,
    catatan TEXT,
    tgl_dibuat TEXT DEFAULT (datetime('now')),
    username TEXT
);

-- ============================================================================
-- Payment Refund Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediasoft_payment_refund (
    kd_refund TEXT PRIMARY KEY NOT NULL,
    kd_payment_transaction TEXT NOT NULL,
    kd_transaksi_jual TEXT NOT NULL,
    jumlah_refund REAL NOT NULL,
    alasan TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'COMPLETED', 'FAILED')),
    
    -- Midtrans refund
    midtrans_refund_id TEXT,
    midtrans_refund_key TEXT,
    
    -- Approval
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    tgl_request TEXT DEFAULT (datetime('now')),
    tgl_approved TEXT,
    tgl_processed TEXT,
    tgl_completed TEXT,
    
    catatan TEXT,
    
    FOREIGN KEY (kd_payment_transaction) REFERENCES mediasoft_payment_transaction(kd_payment_transaction),
    FOREIGN KEY (kd_transaksi_jual) REFERENCES mediasoft_penjualan(kd_tansaksi_jual)
);

-- ============================================================================
-- Payment Webhook Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediasoft_payment_webhook_log (
    kd_webhook_log INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    transaction_status TEXT,
    payment_type TEXT,
    gross_amount REAL,
    signature_key TEXT,
    raw_payload TEXT, -- JSON
    tgl_received TEXT DEFAULT (datetime('now')),
    processed INTEGER DEFAULT 0,
    error_message TEXT
);

-- ============================================================================
-- Insert Default Payment Methods
-- ============================================================================
INSERT OR IGNORE INTO mediasoft_payment_method (kd_payment_method, nama_method, jenis, icon, fee_persen, fee_fixed) VALUES
('CASH', 'Tunai', 'CASH', '💵', 0, 0),
('TRANSFER', 'Transfer Bank', 'TRANSFER', '🏦', 0, 0),
('QRIS', 'QRIS', 'QRIS', '📱', 0.7, 0),
('GOPAY', 'GoPay', 'EWALLET', '🟢', 2, 0),
('OVO', 'OVO', 'EWALLET', '🟣', 2, 0),
('DANA', 'DANA', 'EWALLET', '🔵', 2, 0),
('SHOPEEPAY', 'ShopeePay', 'EWALLET', '🟠', 2, 0),
('BCA_VA', 'BCA Virtual Account', 'TRANSFER', '🏦', 0, 4000),
('BNI_VA', 'BNI Virtual Account', 'TRANSFER', '🏦', 0, 4000),
('BRI_VA', 'BRI Virtual Account', 'TRANSFER', '🏦', 0, 4000),
('MANDIRI_VA', 'Mandiri Virtual Account', 'TRANSFER', '🏦', 0, 4000),
('PERMATA_VA', 'Permata Virtual Account', 'TRANSFER', '🏦', 0, 4000),
('CREDIT_CARD', 'Kartu Kredit', 'CARD', '💳', 2.9, 2000),
('DEBIT_CARD', 'Kartu Debit', 'CARD', '💳', 1.5, 2000),
('AKULAKU', 'Akulaku', 'CREDIT', '🛒', 3, 0),
('KREDIVO', 'Kredivo', 'CREDIT', '🛒', 3, 0);

-- ============================================================================
-- Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_transaction_kd_transaksi ON mediasoft_payment_transaction(kd_transaksi_jual);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_status ON mediasoft_payment_transaction(status);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_midtrans_order ON mediasoft_payment_transaction(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_tgl ON mediasoft_payment_transaction(tgl_dibuat);
CREATE INDEX IF NOT EXISTS idx_payment_refund_status ON mediasoft_payment_refund(status);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_order ON mediasoft_payment_webhook_log(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_settlement_tgl ON mediasoft_payment_settlement(tgl_settlement);

-- ============================================================================
-- Add payment columns to existing penjualan table
-- ============================================================================
-- Check if columns exist before adding
ALTER TABLE mediasoft_penjualan ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE mediasoft_penjualan ADD COLUMN payment_method_used TEXT;
ALTER TABLE mediasoft_penjualan ADD COLUMN payment_fee REAL DEFAULT 0;

-- ============================================================================
-- Create Views for Reporting
-- ============================================================================

-- Payment summary view
CREATE VIEW IF NOT EXISTS v_payment_summary AS
SELECT 
    DATE(pt.tgl_dibuat) as tanggal,
    pm.nama_method,
    pm.jenis,
    COUNT(*) as total_transaksi,
    SUM(pt.jumlah) as total_amount,
    SUM(pt.fee) as total_fee,
    SUM(pt.net_amount) as net_amount
FROM mediasoft_payment_transaction pt
JOIN mediasoft_payment_method pm ON pt.kd_payment_method = pm.kd_payment_method
WHERE pt.status = 'SUCCESS'
GROUP BY DATE(pt.tgl_dibuat), pm.nama_method, pm.jenis;

-- Daily settlement view
CREATE VIEW IF NOT EXISTS v_daily_settlement AS
SELECT 
    DATE(pt.tgl_dibuat) as tanggal,
    COUNT(*) as total_transaksi,
    SUM(pt.jumlah) as total_penjualan,
    SUM(pt.fee) as total_fee,
    SUM(pt.net_amount) as net_settlement,
    SUM(CASE WHEN pm.jenis = 'CASH' THEN pt.jumlah ELSE 0 END) as cash_amount,
    SUM(CASE WHEN pm.jenis = 'EWALLET' THEN pt.jumlah ELSE 0 END) as ewallet_amount,
    SUM(CASE WHEN pm.jenis = 'QRIS' THEN pt.jumlah ELSE 0 END) as qris_amount,
    SUM(CASE WHEN pm.jenis = 'CARD' THEN pt.jumlah ELSE 0 END) as card_amount,
    SUM(CASE WHEN pm.jenis = 'TRANSFER' THEN pt.jumlah ELSE 0 END) as transfer_amount
FROM mediasoft_payment_transaction pt
JOIN mediasoft_payment_method pm ON pt.kd_payment_method = pm.kd_payment_method
WHERE pt.status = 'SUCCESS'
GROUP BY DATE(pt.tgl_dibuat);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if tables created
SELECT 'Payment Tables Created' as status, COUNT(*) as table_count
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'mediasoft_payment%';

-- Check default payment methods
SELECT 'Default Payment Methods' as status, COUNT(*) as method_count
FROM mediasoft_payment_method;

-- Show all payment methods
SELECT kd_payment_method, nama_method, jenis, fee_persen, fee_fixed, status
FROM mediasoft_payment_method
ORDER BY jenis, nama_method;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
SELECT '✓ Payment Gateway schema created successfully!' as message;
SELECT 'You can now integrate Midtrans payment gateway.' as next_step;
