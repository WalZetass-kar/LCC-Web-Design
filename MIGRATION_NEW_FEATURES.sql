-- ============================================
-- MIGRATION: New Features for MediaSoft POS
-- Date: 2026-05-03
-- Description: Add tables for all new features
-- ============================================

-- 1. BARCODE SETTINGS
CREATE TABLE IF NOT EXISTS mediasoft_barcode_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT DEFAULT 'MS',
    next_number INTEGER DEFAULT 1,
    length INTEGER DEFAULT 13,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. EXPIRED DATE TRACKING (Add column to existing table)
-- Skip if already exists
-- ALTER TABLE mediasoft_barang ADD COLUMN expired_date DATE;
-- ALTER TABLE mediasoft_barang ADD COLUMN batch_number TEXT;

-- 3. PAYMENT METHODS
CREATE TABLE IF NOT EXISTS mediasoft_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('TUNAI', 'TRANSFER', 'KARTU', 'EWALLET', 'QRIS')),
    account_number TEXT,
    account_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. MULTI PAYMENT DETAILS
CREATE TABLE IF NOT EXISTS mediasoft_payment_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    penjualan_id INTEGER NOT NULL,
    payment_method_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reference_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (penjualan_id) REFERENCES mediasoft_penjualan(id),
    FOREIGN KEY (payment_method_id) REFERENCES mediasoft_payment_methods(id)
);

-- 5. TAX SETTINGS
CREATE TABLE IF NOT EXISTS mediasoft_tax_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rate REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add tax columns to penjualan (skip if exists)
-- ALTER TABLE mediasoft_penjualan ADD COLUMN tax_amount REAL DEFAULT 0;
-- ALTER TABLE mediasoft_penjualan ADD COLUMN discount_amount REAL DEFAULT 0;

-- 6. RETURNS/REFUNDS
CREATE TABLE IF NOT EXISTS mediasoft_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL,
    penjualan_id INTEGER,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    refund_method TEXT CHECK(refund_method IN ('TUNAI', 'TRANSFER', 'STORE_CREDIT')),
    reason TEXT,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (penjualan_id) REFERENCES mediasoft_penjualan(id),
    FOREIGN KEY (customer_id) REFERENCES mediasoft_customer(id),
    FOREIGN KEY (created_by) REFERENCES mediasoft_pengguna(id),
    FOREIGN KEY (approved_by) REFERENCES mediasoft_pengguna(id)
);

CREATE TABLE IF NOT EXISTS mediasoft_return_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    barang_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    subtotal REAL NOT NULL,
    reason TEXT,
    FOREIGN KEY (return_id) REFERENCES mediasoft_returns(id),
    FOREIGN KEY (barang_id) REFERENCES mediasoft_barang(id)
);

-- 7. SHIFT MANAGEMENT
CREATE TABLE IF NOT EXISTS mediasoft_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    opening_balance REAL NOT NULL,
    closing_balance REAL,
    expected_balance REAL,
    difference REAL,
    total_sales REAL DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES mediasoft_pengguna(id)
);

-- Add shift_id to penjualan (skip if exists)
-- ALTER TABLE mediasoft_penjualan ADD COLUMN shift_id INTEGER REFERENCES mediasoft_shifts(id);

-- 8. DEBTS (HUTANG PIUTANG)
CREATE TABLE IF NOT EXISTS mediasoft_debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HUTANG', 'PIUTANG')),
    customer_id INTEGER,
    supplier_id INTEGER,
    penjualan_id INTEGER,
    pembelian_id INTEGER,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining_amount REAL NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'UNPAID' CHECK(status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES mediasoft_customer(id),
    FOREIGN KEY (supplier_id) REFERENCES mediasoft_supplier(id),
    FOREIGN KEY (penjualan_id) REFERENCES mediasoft_penjualan(id),
    FOREIGN KEY (pembelian_id) REFERENCES mediasoft_pembelian(id)
);

CREATE TABLE IF NOT EXISTS mediasoft_debt_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debt_id) REFERENCES mediasoft_debts(id),
    FOREIGN KEY (created_by) REFERENCES mediasoft_pengguna(id)
);

-- 9. STOCK OPNAME
CREATE TABLE IF NOT EXISTS mediasoft_stock_opname (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opname_number TEXT UNIQUE NOT NULL,
    opname_date DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'COMPLETED', 'APPROVED')),
    total_items INTEGER DEFAULT 0,
    total_difference REAL DEFAULT 0,
    notes TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES mediasoft_pengguna(id),
    FOREIGN KEY (approved_by) REFERENCES mediasoft_pengguna(id)
);

CREATE TABLE IF NOT EXISTS mediasoft_stock_opname_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opname_id INTEGER NOT NULL,
    barang_id INTEGER NOT NULL,
    system_stock INTEGER NOT NULL,
    physical_stock INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (opname_id) REFERENCES mediasoft_stock_opname(id),
    FOREIGN KEY (barang_id) REFERENCES mediasoft_barang(id)
);

-- 10. PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS mediasoft_product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barang_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barang_id) REFERENCES mediasoft_barang(id)
);

-- 11. USER PREFERENCES (for dashboard widgets, shortcuts, etc)
CREATE TABLE IF NOT EXISTS mediasoft_user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES mediasoft_pengguna(id),
    UNIQUE(user_id, preference_key)
);

-- 12. APP UPDATES
CREATE TABLE IF NOT EXISTS mediasoft_app_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    release_notes TEXT,
    download_url TEXT,
    is_critical INTEGER DEFAULT 0,
    released_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. ERROR LOGS
CREATE TABLE IF NOT EXISTS mediasoft_error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    user_id INTEGER,
    context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES mediasoft_pengguna(id)
);

-- Insert default data
INSERT INTO mediasoft_barcode_settings (prefix, next_number, length) 
VALUES ('MS', 1, 13) 
ON CONFLICT DO NOTHING;

INSERT INTO mediasoft_payment_methods (name, type, is_active) VALUES
('Tunai', 'TUNAI', 1),
('Transfer Bank', 'TRANSFER', 1),
('Kartu Debit/Kredit', 'KARTU', 1),
('E-Wallet', 'EWALLET', 1),
('QRIS', 'QRIS', 1)
ON CONFLICT DO NOTHING;

INSERT INTO mediasoft_tax_settings (name, rate, is_active) VALUES
('PPN 11%', 11.0, 1),
('PPN 12%', 12.0, 0)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_details_penjualan ON mediasoft_payment_details(penjualan_id);
CREATE INDEX IF NOT EXISTS idx_returns_penjualan ON mediasoft_returns(penjualan_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON mediasoft_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON mediasoft_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON mediasoft_shifts(status);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON mediasoft_debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_supplier ON mediasoft_debts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON mediasoft_debts(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_date ON mediasoft_stock_opname(opname_date);
CREATE INDEX IF NOT EXISTS idx_product_images_barang ON mediasoft_product_images(barang_id);
CREATE INDEX IF NOT EXISTS idx_barang_expired ON mediasoft_barang(expired_date);
CREATE INDEX IF NOT EXISTS idx_penjualan_shift ON mediasoft_penjualan(shift_id);

-- ============================================
-- END OF MIGRATION
-- ============================================
