-- Seed data paket langganan untuk MediaSoft POS
-- Jalankan di Supabase SQL Editor

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
  created_at, 
  updated_at
)
VALUES 
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
    NOW(), 
    NOW()
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
    NOW(), 
    NOW()
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
    NOW(), 
    NOW()
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
  updated_at = NOW();

