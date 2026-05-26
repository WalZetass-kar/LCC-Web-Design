-- MediaSoft POS central license schema for Supabase.
-- Apply with: supabase db push

create extension if not exists pgcrypto;

create table if not exists public.license_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text,
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  duration_days integer not null default 30,
  is_active boolean not null default true,
  is_recommended boolean not null default false,
  max_devices integer not null default 1,
  max_transactions_per_day integer not null default -1,
  max_products integer not null default -1,
  max_users integer not null default 1,
  feature_flags jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.license_customers(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'expired', 'suspended', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'trial',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_subscriptions_active
  on public.customer_subscriptions(customer_id, status, expires_at desc);

create table if not exists public.customer_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.license_customers(id) on delete cascade,
  device_id text not null,
  device_name text,
  platform text,
  os_name text,
  app_version text,
  ip_address text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'revoked', 'blocked')),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  unique(customer_id, device_id)
);

create index if not exists idx_customer_devices_lookup
  on public.customer_devices(customer_id, status, last_seen_at desc);

create table if not exists public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.license_customers(id) on delete cascade,
  metric text not null,
  amount integer not null default 1,
  period_bucket date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_usage_lookup
  on public.subscription_usage(customer_id, metric, period_bucket);

create table if not exists public.popup_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  cta_text text not null default 'Upgrade Sekarang',
  cta_url text,
  whatsapp_number text,
  pricing_html text,
  is_active boolean not null default true,
  trigger_on jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.license_customers(id) on delete set null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  amount numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  method text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  external_ref text,
  proof_url text,
  notes text,
  paid_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.license_activity_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.license_customers(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'general',
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_license_activity_logs_event
  on public.license_activity_logs(event_type, created_at desc);

alter table public.license_admins enable row level security;
alter table public.license_customers enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.feature_catalog enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.customer_devices enable row level security;
alter table public.subscription_usage enable row level security;
alter table public.popup_rules enable row level security;
alter table public.payments enable row level security;
alter table public.license_activity_logs enable row level security;

create policy "customers can read own profile"
  on public.license_customers for select
  using (auth.uid() = auth_user_id);

create policy "customers can read own subscriptions"
  on public.customer_subscriptions for select
  using (
    exists (
      select 1 from public.license_customers c
      where c.id = customer_subscriptions.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy "customers can read own devices"
  on public.customer_devices for select
  using (
    exists (
      select 1 from public.license_customers c
      where c.id = customer_devices.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy "authenticated can read active plans"
  on public.subscription_plans for select
  to authenticated
  using (is_active = true);

create policy "authenticated can read active popups"
  on public.popup_rules for select
  to authenticated
  using (is_active = true);

insert into public.feature_catalog (code, name, category, sort_order) values
  ('reports', 'Laporan', 'report', 10),
  ('export_excel', 'Export Excel', 'report', 20),
  ('export_pdf', 'Export PDF', 'report', 30),
  ('multi_user', 'Multi User', 'access', 40),
  ('backup', 'Backup', 'data', 50),
  ('restore', 'Restore', 'data', 60),
  ('stock_opname', 'Stock Opname', 'inventory', 70),
  ('debt_management', 'Hutang/Piutang', 'finance', 80),
  ('shift_management', 'Shift Management', 'operations', 90),
  ('api_access', 'E-commerce API', 'integration', 100),
  ('multi_branch', 'Multi Cabang', 'operations', 110),
  ('return_refund', 'Retur/Refund', 'sales', 120)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order;

insert into public.subscription_plans
  (code, name, description, price, duration_days, is_active, is_recommended,
   max_devices, max_transactions_per_day, max_products, max_users, feature_flags, sort_order)
values
  (
    'TRIAL_3_DAYS', 'Trial 3 Hari', 'Trial terbatas untuk akun pembeli baru.',
    0, 3, false, false, 1, 20, 30, 1,
    '{"reports":false,"export_excel":false,"export_pdf":false,"multi_user":false,"backup":false,"restore":false,"stock_opname":false,"debt_management":false,"shift_management":false,"api_access":false,"multi_branch":false,"return_refund":false}'::jsonb,
    0
  ),
  (
    'BASIC_MONTHLY', 'Basic Bulanan', 'Paket dasar untuk satu toko kecil.',
    99000, 30, true, false, 1, -1, 500, 1,
    '{"reports":true,"export_excel":false,"export_pdf":false,"multi_user":false,"backup":true,"restore":false,"stock_opname":false,"debt_management":false,"shift_management":false,"api_access":false,"multi_branch":false,"return_refund":true}'::jsonb,
    10
  ),
  (
    'PRO_MONTHLY', 'Pro Bulanan', 'Paket lengkap untuk operasional toko.',
    199000, 30, true, true, 3, -1, -1, 5,
    '{"reports":true,"export_excel":true,"export_pdf":true,"multi_user":true,"backup":true,"restore":true,"stock_opname":true,"debt_management":true,"shift_management":true,"api_access":true,"multi_branch":false,"return_refund":true}'::jsonb,
    20
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
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

insert into public.popup_rules
  (code, title, description, cta_text, trigger_on)
values
  ('DEMO_LIMIT', 'Batas Demo Tercapai', 'Anda telah mencapai batas akun demo. Upgrade untuk akses penuh.', 'Upgrade Sekarang', '{"trigger":"demo_limit"}'::jsonb),
  ('ACCESS_EXPIRING', 'Trial Hampir Habis', 'Trial Anda segera berakhir. Upgrade sekarang agar transaksi tetap berjalan.', 'Upgrade Paket', '{"trigger":"access_expiring"}'::jsonb),
  ('EXPIRED', 'Langganan Habis', 'Masa langganan Anda sudah berakhir. Perpanjang untuk melanjutkan.', 'Perpanjang', '{"trigger":"expired"}'::jsonb),
  ('FEATURE_LOCKED', 'Fitur Ini Terkunci', 'Fitur ini tidak tersedia di paket Anda saat ini.', 'Lihat Paket', '{"trigger":"feature_locked"}'::jsonb),
  ('DEVICE_LIMIT', 'Batas Device Tercapai', 'Anda telah mencapai batas jumlah device untuk paket ini.', 'Upgrade Paket', '{"trigger":"device_limit"}'::jsonb),
  ('TRANSACTION_LIMIT', 'Limit Transaksi Tercapai', 'Limit transaksi harian paket Anda sudah habis. Upgrade paket untuk melanjutkan transaksi.', 'Upgrade Paket', '{"trigger":"transaction_limit"}'::jsonb),
  ('PRODUCT_LIMIT', 'Limit Produk Tercapai', 'Limit jumlah produk paket Anda sudah habis. Upgrade paket untuk menambah produk.', 'Upgrade Paket', '{"trigger":"product_limit"}'::jsonb)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  cta_text = excluded.cta_text,
  trigger_on = excluded.trigger_on,
  updated_at = now();

-- After creating your admin user in Supabase Auth, grant access with:
-- insert into public.license_admins (user_id, role)
-- values ('<auth.users.id>', 'super_admin')
-- on conflict (user_id) do update set role = excluded.role, is_active = true;
