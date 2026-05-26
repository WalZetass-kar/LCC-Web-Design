-- ============================================================
-- MIGRATION: Hardening akses subscription/device/popup
-- Aman dijalankan berulang kali: tidak memakai ALTER TABLE.
-- Kolom baru tetap dibuat oleh migrasi runtime di src/database/connection.ts
-- karena SQLite tidak mendukung ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_devices_status
  ON mediasoft_user_devices(status);

CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen
  ON mediasoft_user_devices(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_device
  ON mediasoft_auth_sessions(username, device_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_event_type
  ON mediasoft_activity_log(event_type, tgl_aktivitas);

INSERT OR IGNORE INTO mediasoft_popup_rules
  (code, title, description, cta_text, trigger_on)
VALUES
  ('ACCESS_EXPIRING', 'Trial Hampir Habis',
   'Trial Anda segera berakhir. Upgrade sekarang agar transaksi dan data toko tetap berjalan.',
   'Upgrade Paket', '{"trigger":"access_expiring"}'),
  ('TRANSACTION_LIMIT', 'Limit Transaksi Tercapai',
   'Limit transaksi harian paket Anda sudah habis. Upgrade paket untuk melanjutkan transaksi.',
   'Upgrade Paket', '{"trigger":"transaction_limit"}'),
  ('PRODUCT_LIMIT', 'Limit Produk Tercapai',
   'Limit jumlah produk paket Anda sudah habis. Upgrade paket untuk menambah produk.',
   'Upgrade Paket', '{"trigger":"product_limit"}');

INSERT INTO mediasoft_subscription_plans
  (name, price, duration_days, features, is_active, is_recommended, created_at,
   max_devices, max_transactions_per_day, max_products, max_users, feature_flags)
SELECT
  'Trial 3 Hari',
  0,
  3,
  '["Trial terbatas 3 hari","1 device","20 transaksi per hari","30 produk","Fitur premium terkunci"]',
  0,
  0,
  datetime('now'),
  1,
  20,
  30,
  1,
  '{"reports":false,"export_excel":false,"export_pdf":false,"multi_user":false,"backup":false,"restore":false,"stock_opname":false,"debt_management":false,"shift_management":false,"api_access":false,"multi_branch":false,"return_refund":false}'
WHERE NOT EXISTS (
  SELECT 1 FROM mediasoft_subscription_plans WHERE name = 'Trial 3 Hari'
);

UPDATE mediasoft_popup_rules
SET trigger_on = '{"trigger":"device_limit"}'
WHERE code = 'DEVICE_LIMIT' AND (trigger_on IS NULL OR trigger_on = '{}');

UPDATE mediasoft_popup_rules
SET trigger_on = '{"trigger":"feature_locked"}'
WHERE code = 'FEATURE_LOCKED' AND (trigger_on IS NULL OR trigger_on = '{}');
