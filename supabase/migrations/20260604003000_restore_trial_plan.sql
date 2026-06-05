-- Restore the public trial plan if it was removed from the Developer Panel.
-- Android registration depends on this code for /register-trial.

insert into public.subscription_plans
  (code, name, description, price, currency, duration_days, is_active, is_recommended,
   max_devices, max_transactions_per_day, max_products, max_users, feature_flags, sort_order)
values
  (
    'TRIAL_3_DAYS',
    'Trial 3 Hari',
    'Trial terbatas 3 hari untuk akun pembeli baru.',
    0,
    'IDR',
    3,
    true,
    false,
    1,
    20,
    30,
    1,
    '{
      "reports": false,
      "export_excel": false,
      "export_pdf": false,
      "multi_user": false,
      "backup": false,
      "restore": false,
      "stock_opname": false,
      "debt_management": false,
      "shift_management": false,
      "api_access": false,
      "multi_branch": false,
      "return_refund": false
    }'::jsonb,
    0
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  duration_days = excluded.duration_days,
  is_active = excluded.is_active,
  is_recommended = excluded.is_recommended,
  max_devices = excluded.max_devices,
  max_transactions_per_day = excluded.max_transactions_per_day,
  max_products = excluded.max_products,
  max_users = excluded.max_users,
  feature_flags = excluded.feature_flags,
  sort_order = excluded.sort_order,
  updated_at = now();
