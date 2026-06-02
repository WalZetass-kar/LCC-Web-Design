-- Migration to seed required subscription plans and features
-- This fixes the registration bug where TRIAL_3_DAYS was missing

-- Ensure trial plan exists
INSERT INTO subscription_plans (
  code, 
  name, 
  description, 
  price, 
  currency, 
  duration_days, 
  is_active, 
  is_recommended, 
  max_devices,
  max_transactions_per_day,
  max_products,
  max_users,
  sort_order,
  feature_flags
)
VALUES 
  (
    'TRIAL_3_DAYS', 
    'Trial 3 Hari', 
    'Coba gratis semua fitur dasar selama 3 hari. Terbatas 1 device.', 
    0, 
    'IDR', 
    3, 
    true, 
    false, 
    1,
    20,
    30,
    1,
    0,
    '{"pos_cashier": true, "inventory_management": true, "basic_reports": true}'
  ),
  (
    'DAILY', 
    'Paket Harian', 
    'Transaksi tak terbatas, Export laporan dasar, Support email', 
    15000, 
    'IDR', 
    1, 
    true, 
    false, 
    1,
    -1,
    -1,
    1,
    1,
    '{"pos_cashier": true, "inventory_management": true, "basic_reports": true}'
  ),
  (
    'MONTHLY', 
    'Paket Bulanan', 
    'Semua fitur Harian + Multi-user (3 akun) + Export Excel & PDF + Laporan lanjutan + Backup otomatis + Support prioritas', 
    299000, 
    'IDR', 
    30, 
    true, 
    true, 
    3,
    -1,
    -1,
    3,
    2,
    '{"pos_cashier": true, "inventory_management": true, "basic_reports": true, "advanced_reports": true, "export_data": true, "auto_backup": true, "multi_user": true}'
  ),
  (
    'YEARLY', 
    'Paket Tahunan', 
    'Semua fitur Bulanan + Multi-user unlimited + Stok opname + Manajemen hutang + Shift management + API access + Support 24/7', 
    2899000, 
    'IDR', 
    365, 
    true, 
    false, 
    999,
    -1,
    -1,
    999,
    3,
    '{"pos_cashier": true, "inventory_management": true, "basic_reports": true, "advanced_reports": true, "export_data": true, "auto_backup": true, "multi_user": true, "stock_opname": true, "debt_management": true, "shift_management": true, "api_access": true}'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  is_active = EXCLUDED.is_active,
  is_recommended = EXCLUDED.is_recommended,
  max_devices = EXCLUDED.max_devices,
  max_transactions_per_day = EXCLUDED.max_transactions_per_day,
  max_products = EXCLUDED.max_products,
  max_users = EXCLUDED.max_users,
  sort_order = EXCLUDED.sort_order,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

-- Ensure feature catalog is initialized (optional but good for consistency)
INSERT INTO feature_catalog (code, name, description, category)
VALUES 
  ('pos_cashier', 'Kasir (POS)', 'Fitur transaksi penjualan barang', 'core'),
  ('inventory_management', 'Manajemen Stok', 'Fitur input barang dan pantau stok', 'core'),
  ('basic_reports', 'Laporan Dasar', 'Laporan penjualan harian sederhana', 'core'),
  ('advanced_reports', 'Laporan Lanjutan', 'Laporan laba rugi, grafik, dan analisis', 'premium'),
  ('export_data', 'Export Data', 'Export ke Excel dan PDF', 'premium'),
  ('auto_backup', 'Backup Otomatis', 'Keamanan data dengan backup berkala', 'premium'),
  ('multi_user', 'Multi User', 'Support banyak akun dalam satu toko', 'premium'),
  ('stock_opname', 'Stok Opname', 'Fitur penyesuaian stok fisik', 'enterprise'),
  ('debt_management', 'Manajemen Hutang', 'Pantau hutang customer dan ke supplier', 'enterprise'),
  ('shift_management', 'Manajemen Shift', 'Laporan per shift kasir', 'enterprise'),
  ('api_access', 'API Access', 'Integrasi dengan sistem pihak ketiga', 'enterprise')
ON CONFLICT (code) DO NOTHING;
