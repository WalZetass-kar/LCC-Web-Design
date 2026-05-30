-- Developer Operations Center: monitoring, updates, errors, announcements, and revenue analytics.
-- Apply after 20260529100000_developer_account_system.sql.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.app_devices
  add column if not exists operating_system text;

alter table public.payments
  add column if not exists updated_at timestamptz not null default now();

alter table public.customer_subscriptions
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'all' check (platform in ('all', 'windows', 'linux', 'macos', 'android', 'ios')),
  latest_version text not null,
  minimum_version text not null,
  release_notes text,
  download_url text,
  mode text not null default 'optional' check (mode in ('optional', 'force')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform)
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.license_customers(id) on delete set null,
  device_id text,
  error_type text not null default 'application',
  error_message text not null,
  stack_trace text,
  app_version text,
  platform text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'announcement'
    check (type in ('announcement', 'maintenance', 'promo', 'warning', 'update')),
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'danger', 'success')),
  target_scope text not null default 'all'
    check (target_scope in ('all', 'user', 'plan', 'platform')),
  target_user_id uuid references auth.users(id) on delete cascade,
  target_customer_id uuid references public.license_customers(id) on delete cascade,
  target_plan_code text,
  target_platform text,
  cta_text text,
  cta_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.license_customers(id) on delete set null,
  device_id text,
  external_ref text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  status text not null default 'completed' check (status in ('pending', 'completed', 'cancelled', 'refunded')),
  transaction_type text not null default 'sale',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_devices_online_platform
  on public.app_devices(status, platform, last_seen desc);
create index if not exists idx_error_logs_created_type
  on public.error_logs(error_type, created_at desc);
create index if not exists idx_announcements_target_active
  on public.announcements(target_scope, is_active, starts_at, ends_at);
create index if not exists idx_transactions_customer_time
  on public.transactions(customer_id, occurred_at desc);
create index if not exists idx_payments_paid_time
  on public.payments(status, paid_at desc, created_at desc);

drop trigger if exists trg_app_updates_touch on public.app_updates;
create trigger trg_app_updates_touch
before update on public.app_updates
for each row execute function public.touch_updated_at();

drop trigger if exists trg_announcements_touch on public.announcements;
create trigger trg_announcements_touch
before update on public.announcements
for each row execute function public.touch_updated_at();

drop trigger if exists trg_transactions_touch on public.transactions;
create trigger trg_transactions_touch
before update on public.transactions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_payments_touch on public.payments;
create trigger trg_payments_touch
before update on public.payments
for each row execute function public.touch_updated_at();

drop trigger if exists trg_customer_subscriptions_touch on public.customer_subscriptions;
create trigger trg_customer_subscriptions_touch
before update on public.customer_subscriptions
for each row execute function public.touch_updated_at();

alter table public.app_updates enable row level security;
alter table public.error_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "app updates admins manage all" on public.app_updates;
create policy "app updates admins manage all"
  on public.app_updates for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "app updates users read active" on public.app_updates;
create policy "app updates users read active"
  on public.app_updates for select
  to authenticated
  using (is_active = true);

drop policy if exists "error logs admins read all" on public.error_logs;
create policy "error logs admins read all"
  on public.error_logs for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "error logs users insert own" on public.error_logs;
create policy "error logs users insert own"
  on public.error_logs for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "announcements admins manage all" on public.announcements;
create policy "announcements admins manage all"
  on public.announcements for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "announcements users read targeted" on public.announcements;
create policy "announcements users read targeted"
  on public.announcements for select
  to authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and (
      target_scope = 'all'
      or (target_scope = 'user' and target_user_id = auth.uid())
      or (
        target_scope = 'user'
        and exists (
          select 1 from public.license_customers c
          where c.id = announcements.target_customer_id
            and c.auth_user_id = auth.uid()
        )
      )
      or (
        target_scope = 'plan'
        and exists (
          select 1
          from public.license_customers c
          join public.customer_subscriptions s on s.customer_id = c.id
          join public.subscription_plans p on p.id = s.plan_id
          where c.auth_user_id = auth.uid()
            and s.status = 'active'
            and (s.expires_at is null or s.expires_at > now())
            and p.code = announcements.target_plan_code
        )
      )
    )
  );

drop policy if exists "transactions admins read all" on public.transactions;
create policy "transactions admins read all"
  on public.transactions for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "transactions users manage own" on public.transactions;
create policy "transactions users manage own"
  on public.transactions for all
  to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

insert into public.app_updates (platform, latest_version, minimum_version, release_notes, download_url, mode, is_active)
values
  ('all', '2.0.0', '2.0.0', 'Rilis awal Developer Operations Center.', null, 'optional', true)
on conflict (platform) do nothing;
