-- ============================================================
-- MIGRATION: Integrasi sistem lisensi ke aplikasi POS
-- Semua ALTER TABLE menggunakan IF NOT EXISTS / try-catch
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

-- 1. Tambah field ke mediasoft_pengguna
--    (device_type, max_devices sudah bisa diambil dari subscription)
ALTER TABLE mediasoft_pengguna ADD COLUMN subscription_plan_id INTEGER DEFAULT NULL;
ALTER TABLE mediasoft_pengguna ADD COLUMN subscription_expires_at TEXT DEFAULT NULL;
ALTER TABLE mediasoft_pengguna ADD COLUMN is_buyer INTEGER DEFAULT 0;  -- 1 = akun pembeli eksternal

-- 2. Tambah field ke mediasoft_auth_sessions (device detail)
ALTER TABLE mediasoft_auth_sessions ADD COLUMN platform TEXT DEFAULT NULL;   -- electron|android|web
ALTER TABLE mediasoft_auth_sessions ADD COLUMN os_name TEXT DEFAULT NULL;    -- Windows|Linux|macOS|Android
ALTER TABLE mediasoft_auth_sessions ADD COLUMN app_version TEXT DEFAULT NULL;
ALTER TABLE mediasoft_auth_sessions ADD COLUMN is_revoked INTEGER DEFAULT 0;

-- 3. Tambah limit fields ke mediasoft_subscription_plans
ALTER TABLE mediasoft_subscription_plans ADD COLUMN max_devices INTEGER DEFAULT 1;
ALTER TABLE mediasoft_subscription_plans ADD COLUMN max_transactions_per_day INTEGER DEFAULT -1; -- -1 = unlimited
ALTER TABLE mediasoft_subscription_plans ADD COLUMN max_products INTEGER DEFAULT -1;
ALTER TABLE mediasoft_subscription_plans ADD COLUMN max_users INTEGER DEFAULT 1;
ALTER TABLE mediasoft_subscription_plans ADD COLUMN feature_flags TEXT DEFAULT '{}'; -- JSON object

-- 4. Tambah event_type ke activity_log untuk filter lebih mudah
ALTER TABLE mediasoft_activity_log ADD COLUMN event_type TEXT DEFAULT 'general';
-- event_type: login|logout|device|subscription|payment|revoke|feature|error

-- 5. Tambah field ke ecommerce_api untuk payment gateway & WA
ALTER TABLE mediasoft_ecommerce_api ADD COLUMN whatsapp_number TEXT DEFAULT NULL;
ALTER TABLE mediasoft_ecommerce_api ADD COLUMN payment_link TEXT DEFAULT NULL;
ALTER TABLE mediasoft_ecommerce_api ADD COLUMN auto_activate INTEGER DEFAULT 0;
ALTER TABLE mediasoft_ecommerce_api ADD COLUMN activation_plan_id INTEGER DEFAULT NULL;

-- 6. Tabel baru: user_devices (device tracking per user)
CREATE TABLE IF NOT EXISTS mediasoft_user_devices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    device_name     TEXT,
    platform        TEXT,   -- electron|android|web
    os_name         TEXT,   -- Windows|Linux|macOS|Android
    app_version     TEXT,
    ip_address      TEXT,
    last_seen_at    TEXT,
    first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
    status          TEXT NOT NULL DEFAULT 'active', -- active|revoked|blocked
    revoked_at      TEXT,
    revoked_by      TEXT,
    UNIQUE(username, device_id)
);
CREATE INDEX IF NOT EXISTS idx_user_devices_username ON mediasoft_user_devices(username);

-- 7. Tabel baru: popup_rules (aturan kapan popup muncul)
CREATE TABLE IF NOT EXISTS mediasoft_popup_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT NOT NULL UNIQUE,  -- DEMO_LIMIT|EXPIRED|FEATURE_LOCKED|DEVICE_LIMIT
    title           TEXT NOT NULL,
    description     TEXT,
    cta_text        TEXT DEFAULT 'Upgrade Sekarang',
    cta_url         TEXT,
    whatsapp_number TEXT,
    pricing_html    TEXT,
    is_active       INTEGER DEFAULT 1,
    trigger_on      TEXT DEFAULT '{}',  -- JSON: {"status":"expired"} atau {"limit":"max_devices"}
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Seed popup rules default
INSERT OR IGNORE INTO mediasoft_popup_rules (code, title, description, cta_text, trigger_on) VALUES
('DEMO_LIMIT',    'Batas Demo Tercapai',      'Anda telah mencapai batas akun demo. Upgrade untuk akses penuh.', 'Upgrade Sekarang', '{"trigger":"demo_limit"}'),
('EXPIRED',       'Langganan Habis',           'Masa langganan Anda sudah berakhir. Perpanjang untuk melanjutkan.', 'Perpanjang', '{"trigger":"expired"}'),
('FEATURE_LOCKED','Fitur Ini Terkunci',        'Fitur ini tidak tersedia di paket Anda saat ini.', 'Lihat Paket', '{"trigger":"feature_locked"}'),
('DEVICE_LIMIT',  'Batas Device Tercapai',     'Anda telah mencapai batas jumlah device untuk paket ini.', 'Upgrade Paket', '{"trigger":"device_limit"}'),
('TRANSACTION_LIMIT', 'Limit Transaksi Tercapai', 'Limit transaksi harian paket Anda sudah habis. Upgrade paket untuk melanjutkan transaksi.', 'Upgrade Paket', '{"trigger":"transaction_limit"}');

-- 8. Update subscription_plans dengan limit default
UPDATE mediasoft_subscription_plans SET
    max_devices = 1, max_transactions_per_day = 20, max_products = 30, max_users = 1,
    feature_flags = '{"reports":false,"export_excel":false,"multi_user":false,"backup":false}'
WHERE name = 'Harian' AND max_devices IS NULL;

UPDATE mediasoft_subscription_plans SET
    max_devices = 2, max_transactions_per_day = -1, max_products = 500, max_users = 2,
    feature_flags = '{"reports":true,"export_excel":true,"multi_user":false,"backup":true}'
WHERE name IN ('Mingguan','Bulanan') AND max_devices IS NULL;

UPDATE mediasoft_subscription_plans SET
    max_devices = -1, max_transactions_per_day = -1, max_products = -1, max_users = -1,
    feature_flags = '{"reports":true,"export_excel":true,"multi_user":true,"backup":true,"api_access":true}'
WHERE name IN ('Tahunan','Per 3 Bulan') AND max_devices IS NULL;
