insert into public.subscription_plans
  (code, name, description, price, duration_days, is_active, is_recommended,
   max_devices, max_transactions_per_day, max_products, max_users, feature_flags, sort_order)
values
  (
    'PRO_ANNUAL',
    'Tahunan',
    'Paket 1 tahun untuk operasional lengkap: laporan, export Excel/PDF, multi-user, backup/restore, stock opname, hutang/piutang, shift, API, multi cabang, dan retur/refund.',
    1999000,
    365,
    true,
    false,
    5,
    -1,
    -1,
    10,
    '{"reports":true,"export_excel":true,"export_pdf":true,"multi_user":true,"backup":true,"restore":true,"stock_opname":true,"debt_management":true,"shift_management":true,"api_access":true,"multi_branch":true,"return_refund":true}'::jsonb,
    30
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  duration_days = excluded.duration_days,
  is_active = excluded.is_active,
  max_devices = excluded.max_devices,
  max_transactions_per_day = excluded.max_transactions_per_day,
  max_products = excluded.max_products,
  max_users = excluded.max_users,
  feature_flags = excluded.feature_flags,
  sort_order = excluded.sort_order,
  updated_at = now();
