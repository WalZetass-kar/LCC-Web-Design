-- Developer/Admin account system and compatibility tables for Zetass Pos.
-- Apply after 20260528120000_license_realtime_payment_gateway.sql.

create extension if not exists pgcrypto;

alter table public.license_admins
  drop constraint if exists license_admins_role_check;

alter table public.license_admins
  add constraint license_admins_role_check
  check (role in ('super_admin', 'admin', 'developer'));

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  customer_id uuid unique references public.license_customers(id) on delete cascade,
  email text not null unique,
  name text,
  role text not null default 'user' check (role in ('user', 'admin', 'developer')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.license_customers(id) on delete cascade,
  legacy_device_id uuid unique references public.customer_devices(id) on delete cascade,
  device_id text not null,
  device_name text,
  platform text,
  app_version text,
  license_status text not null default 'unknown'
    check (license_status in ('unknown', 'active', 'inactive', 'expired', 'suspended', 'blocked', 'cancelled')),
  last_seen timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked', 'revoked')),
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, device_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.license_customers(id) on delete cascade,
  legacy_subscription_id uuid unique references public.customer_subscriptions(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  package_code text,
  status text not null default 'inactive'
    check (status in ('active', 'inactive', 'expired', 'suspended', 'blocked', 'cancelled')),
  started_at timestamptz,
  expired_at timestamptz,
  source text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remote_popups (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.license_customers(id) on delete cascade,
  popup_rule_id uuid references public.popup_rules(id) on delete set null,
  code text not null default 'REMOTE_ANNOUNCEMENT',
  title text not null,
  message text,
  cta_text text,
  cta_url text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'danger')),
  dismissible boolean not null default true,
  is_active boolean not null default true,
  force_popup boolean not null default true,
  show_until timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.license_customers(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  legacy_log_id uuid unique references public.license_activity_logs(id) on delete cascade,
  event_type text not null default 'general',
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role_status on public.profiles(role, status);
create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_app_devices_user_last_seen on public.app_devices(user_id, last_seen desc);
create index if not exists idx_app_devices_customer_status on public.app_devices(customer_id, status, last_seen desc);
create index if not exists idx_subscriptions_user_status on public.subscriptions(user_id, status, expired_at desc);
create index if not exists idx_remote_popups_target on public.remote_popups(user_id, customer_id, is_active, show_until);
create index if not exists idx_activity_logs_user_created on public.activity_logs(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.app_devices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.remote_popups enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.license_admins a
    where a.user_id = auth.uid()
      and a.is_active = true
      and a.role in ('super_admin', 'admin', 'developer')
  )
  or exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'developer')
  );
$$;

create or replace function public.is_app_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.license_admins a
    where a.user_id = auth.uid()
      and a.is_active = true
      and a.role in ('super_admin', 'developer')
  )
  or exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role = 'developer'
  );
$$;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_app_developer() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if auth.uid() is not null and not public.is_app_admin() then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.status := coalesce(new.status, 'active');
    elsif tg_op = 'UPDATE' then
      new.role := old.role;
      new.status := old.status;
      new.auth_user_id := old.auth_user_id;
      new.customer_id := old.customer_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.protect_device_license_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if auth.uid() is not null and not public.is_app_admin() and tg_op = 'UPDATE' then
    new.license_status := old.license_status;
    new.status := old.status;
    new.blocked_at := old.blocked_at;
    new.blocked_by := old.blocked_by;
    new.user_id := old.user_id;
    new.customer_id := old.customer_id;
    new.profile_id := old.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_device_license_fields on public.app_devices;
create trigger trg_protect_device_license_fields
before insert or update on public.app_devices
for each row execute function public.protect_device_license_fields();

drop policy if exists "profiles users read own" on public.profiles;
create policy "profiles users read own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists "profiles admins manage all" on public.profiles;
create policy "profiles admins manage all"
  on public.profiles for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "profiles users update own safe fields" on public.profiles;
create policy "profiles users update own safe fields"
  on public.profiles for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists "app devices users read own" on public.app_devices;
create policy "app devices users read own"
  on public.app_devices for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "app devices users upsert own tracking" on public.app_devices;
create policy "app devices users upsert own tracking"
  on public.app_devices for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "app devices users update own tracking" on public.app_devices;
create policy "app devices users update own tracking"
  on public.app_devices for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app devices admins manage all" on public.app_devices;
create policy "app devices admins manage all"
  on public.app_devices for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "subscriptions users read own" on public.subscriptions;
create policy "subscriptions users read own"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "subscriptions admins manage all" on public.subscriptions;
create policy "subscriptions admins manage all"
  on public.subscriptions for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "remote popups users read own active" on public.remote_popups;
create policy "remote popups users read own active"
  on public.remote_popups for select
  to authenticated
  using (
    is_active = true
    and (show_until is null or show_until > now())
    and (
      user_id is null
      or user_id = auth.uid()
      or exists (
        select 1
        from public.profiles p
        where p.customer_id = remote_popups.customer_id
          and p.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists "remote popups admins manage all" on public.remote_popups;
create policy "remote popups admins manage all"
  on public.remote_popups for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "activity logs users read own" on public.activity_logs;
create policy "activity logs users read own"
  on public.activity_logs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "activity logs users insert own" on public.activity_logs;
create policy "activity logs users insert own"
  on public.activity_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "activity logs admins read all" on public.activity_logs;
create policy "activity logs admins read all"
  on public.activity_logs for select
  to authenticated
  using (public.is_app_admin());

create or replace function public.sync_profile_from_license_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    auth_user_id = new.auth_user_id,
    customer_id = new.id,
    email = lower(new.email),
    name = new.name,
    status = new.status,
    updated_at = now()
  where customer_id = new.id
    or (new.auth_user_id is not null and auth_user_id = new.auth_user_id)
    or lower(email) = lower(new.email);

  if not found then
    insert into public.profiles (auth_user_id, customer_id, email, name, role, status, created_at, updated_at)
    values (new.auth_user_id, new.id, lower(new.email), new.name, 'user', new.status, new.created_at, new.updated_at);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_license_customer on public.license_customers;
create trigger trg_sync_profile_from_license_customer
after insert or update on public.license_customers
for each row execute function public.sync_profile_from_license_customer();

create or replace function public.sync_profile_from_license_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text;
  auth_name text;
  mapped_role text;
begin
  select lower(u.email), coalesce(u.raw_user_meta_data->>'name', u.email)
    into auth_email, auth_name
  from auth.users u
  where u.id = new.user_id;

  if auth_email is null then
    return new;
  end if;

  mapped_role := case
    when new.role in ('super_admin', 'developer') then 'developer'
    else 'admin'
  end;

  insert into public.profiles (auth_user_id, email, name, role, status, created_at, updated_at)
  values (new.user_id, auth_email, auth_name, mapped_role, case when new.is_active then 'active' else 'inactive' end, new.created_at, new.updated_at)
  on conflict (auth_user_id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_license_admin on public.license_admins;
create trigger trg_sync_profile_from_license_admin
after insert or update on public.license_admins
for each row execute function public.sync_profile_from_license_admin();

create or replace function public.sync_app_device_from_customer_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
  latest_status text;
begin
  select * into profile_row
  from public.profiles
  where customer_id = new.customer_id
  limit 1;

  select cs.status into latest_status
  from public.customer_subscriptions cs
  where cs.customer_id = new.customer_id
  order by cs.expires_at desc
  limit 1;

  insert into public.app_devices (
    profile_id, user_id, customer_id, legacy_device_id, device_id, device_name,
    platform, app_version, license_status, last_seen, status, blocked_at, blocked_by, created_at, updated_at
  )
  values (
    profile_row.id, profile_row.auth_user_id, new.customer_id, new.id, new.device_id, new.device_name,
    coalesce(new.os_name, new.platform), new.app_version, coalesce(latest_status, 'unknown'),
    new.last_seen_at, new.status, new.revoked_at, new.revoked_by, new.first_seen_at, now()
  )
  on conflict (legacy_device_id) do update set
    profile_id = excluded.profile_id,
    user_id = excluded.user_id,
    device_id = excluded.device_id,
    device_name = excluded.device_name,
    platform = excluded.platform,
    app_version = excluded.app_version,
    license_status = excluded.license_status,
    last_seen = excluded.last_seen,
    status = excluded.status,
    blocked_at = excluded.blocked_at,
    blocked_by = excluded.blocked_by,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_app_device_from_customer_device on public.customer_devices;
create trigger trg_sync_app_device_from_customer_device
after insert or update on public.customer_devices
for each row execute function public.sync_app_device_from_customer_device();

create or replace function public.sync_subscription_from_customer_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
  plan_code text;
begin
  select * into profile_row
  from public.profiles
  where customer_id = new.customer_id
  limit 1;

  select code into plan_code
  from public.subscription_plans
  where id = new.plan_id;

  insert into public.subscriptions (
    profile_id, user_id, customer_id, legacy_subscription_id, plan_id, package_code,
    status, started_at, expired_at, source, notes, created_at, updated_at
  )
  values (
    profile_row.id, profile_row.auth_user_id, new.customer_id, new.id, new.plan_id, plan_code,
    new.status, new.started_at, new.expires_at, new.source, new.notes, new.created_at, now()
  )
  on conflict (legacy_subscription_id) do update set
    profile_id = excluded.profile_id,
    user_id = excluded.user_id,
    plan_id = excluded.plan_id,
    package_code = excluded.package_code,
    status = excluded.status,
    started_at = excluded.started_at,
    expired_at = excluded.expired_at,
    source = excluded.source,
    notes = excluded.notes,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_subscription_from_customer_subscription on public.customer_subscriptions;
create trigger trg_sync_subscription_from_customer_subscription
after insert or update on public.customer_subscriptions
for each row execute function public.sync_subscription_from_customer_subscription();

create or replace function public.sync_activity_log_from_license_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
begin
  if new.customer_id is not null then
    select * into profile_row
    from public.profiles
    where customer_id = new.customer_id
    limit 1;
  end if;

  insert into public.activity_logs (
    profile_id, user_id, customer_id, actor_user_id, legacy_log_id,
    event_type, action, metadata, ip_address, user_agent, created_at
  )
  values (
    profile_row.id, profile_row.auth_user_id, new.customer_id, new.actor_user_id, new.id,
    new.event_type, new.action, new.metadata, new.ip_address, new.user_agent, new.created_at
  )
  on conflict (legacy_log_id) do update set
    profile_id = excluded.profile_id,
    user_id = excluded.user_id,
    event_type = excluded.event_type,
    action = excluded.action,
    metadata = excluded.metadata,
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent;

  return new;
end;
$$;

drop trigger if exists trg_sync_activity_log_from_license_activity_log on public.license_activity_logs;
create trigger trg_sync_activity_log_from_license_activity_log
after insert or update on public.license_activity_logs
for each row execute function public.sync_activity_log_from_license_activity_log();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email, name, role, status)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'user',
    'active'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

update public.profiles p
set
  auth_user_id = c.auth_user_id,
  customer_id = c.id,
  email = lower(c.email),
  name = c.name,
  status = c.status,
  updated_at = now()
from public.license_customers c
where p.customer_id = c.id
  or (c.auth_user_id is not null and p.auth_user_id = c.auth_user_id)
  or lower(p.email) = lower(c.email);

insert into public.profiles (auth_user_id, customer_id, email, name, role, status, created_at, updated_at)
select c.auth_user_id, c.id, lower(c.email), c.name, 'user', c.status, c.created_at, c.updated_at
from public.license_customers c
where not exists (
  select 1
  from public.profiles p
  where p.customer_id = c.id
    or (c.auth_user_id is not null and p.auth_user_id = c.auth_user_id)
    or lower(p.email) = lower(c.email)
);

insert into public.profiles (auth_user_id, email, name, role, status, created_at, updated_at)
select
  a.user_id,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'name', u.email),
  case when a.role in ('super_admin', 'developer') then 'developer' else 'admin' end,
  case when a.is_active then 'active' else 'inactive' end,
  a.created_at,
  a.updated_at
from public.license_admins a
join auth.users u on u.id = a.user_id
on conflict (auth_user_id) do update set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.app_devices (
  profile_id, user_id, customer_id, legacy_device_id, device_id, device_name,
  platform, app_version, license_status, last_seen, status, blocked_at, blocked_by, created_at, updated_at
)
select
  p.id,
  p.auth_user_id,
  d.customer_id,
  d.id,
  d.device_id,
  d.device_name,
  coalesce(d.os_name, d.platform),
  d.app_version,
  coalesce(cs.status, 'unknown'),
  d.last_seen_at,
  d.status,
  d.revoked_at,
  d.revoked_by,
  d.first_seen_at,
  now()
from public.customer_devices d
left join public.profiles p on p.customer_id = d.customer_id
left join lateral (
  select status
  from public.customer_subscriptions s
  where s.customer_id = d.customer_id
  order by s.expires_at desc
  limit 1
) cs on true
on conflict (legacy_device_id) do update set
  profile_id = excluded.profile_id,
  user_id = excluded.user_id,
  device_id = excluded.device_id,
  device_name = excluded.device_name,
  platform = excluded.platform,
  app_version = excluded.app_version,
  license_status = excluded.license_status,
  last_seen = excluded.last_seen,
  status = excluded.status,
  blocked_at = excluded.blocked_at,
  blocked_by = excluded.blocked_by,
  updated_at = now();

insert into public.subscriptions (
  profile_id, user_id, customer_id, legacy_subscription_id, plan_id, package_code,
  status, started_at, expired_at, source, notes, created_at, updated_at
)
select
  p.id,
  p.auth_user_id,
  s.customer_id,
  s.id,
  s.plan_id,
  sp.code,
  s.status,
  s.started_at,
  s.expires_at,
  s.source,
  s.notes,
  s.created_at,
  now()
from public.customer_subscriptions s
left join public.profiles p on p.customer_id = s.customer_id
left join public.subscription_plans sp on sp.id = s.plan_id
on conflict (legacy_subscription_id) do update set
  profile_id = excluded.profile_id,
  user_id = excluded.user_id,
  plan_id = excluded.plan_id,
  package_code = excluded.package_code,
  status = excluded.status,
  started_at = excluded.started_at,
  expired_at = excluded.expired_at,
  source = excluded.source,
  notes = excluded.notes,
  updated_at = now();

insert into public.remote_popups (popup_rule_id, code, title, message, cta_text, cta_url, severity, dismissible, is_active, force_popup, show_until, updated_at)
select id, code, title, description, cta_text, cta_url, severity, dismissible, is_active, force_popup, force_popup_until, updated_at
from public.popup_rules
on conflict do nothing;

-- First developer bootstrap:
-- 1. Create the user in Supabase Auth (Dashboard or Admin API).
-- 2. Grant the role:
-- insert into public.license_admins (user_id, role, is_active)
-- values ('<auth.users.id>', 'developer', true)
-- on conflict (user_id) do update set role = 'developer', is_active = true, updated_at = now();
