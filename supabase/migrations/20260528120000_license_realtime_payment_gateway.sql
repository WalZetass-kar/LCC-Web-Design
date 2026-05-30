-- Realtime license control, payment gateway, and stricter RLS hardening.
-- Apply after 20260521143000_mediasoft_license_schema.sql.

create extension if not exists pgcrypto;

create or replace function public.is_license_admin()
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
  );
$$;

grant execute on function public.is_license_admin() to authenticated;

-- Normalize legacy statuses before tightening constraints.
update public.license_customers set status = 'blocked' where status = 'banned';
update public.customer_devices set status = 'blocked' where status = 'revoked';
update public.payments set status = 'paid' where status = 'success';
update public.payments set status = 'failed' where status = 'refunded';

alter table public.license_customers
  drop constraint if exists license_customers_status_check;
alter table public.license_customers
  add constraint license_customers_status_check
  check (status in ('active', 'inactive', 'suspended', 'blocked'));

alter table public.customer_subscriptions
  drop constraint if exists customer_subscriptions_status_check;
alter table public.customer_subscriptions
  add constraint customer_subscriptions_status_check
  check (status in ('active', 'inactive', 'expired', 'suspended', 'blocked', 'cancelled'));

alter table public.customer_devices
  drop constraint if exists customer_devices_status_check;
alter table public.customer_devices
  add constraint customer_devices_status_check
  check (status in ('active', 'inactive', 'blocked', 'revoked'));

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'paid', 'failed', 'expired', 'refunded'));

alter table public.license_customers
  add column if not exists force_popup_code text,
  add column if not exists force_popup_until timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.popup_rules
  add column if not exists force_popup boolean not null default false,
  add column if not exists force_popup_until timestamptz,
  add column if not exists severity text not null default 'info'
    check (severity in ('info', 'warning', 'danger')),
  add column if not exists dismissible boolean not null default true;

alter table public.payments
  add column if not exists invoice_number text,
  add column if not exists provider text not null default 'manual',
  add column if not exists payment_url text,
  add column if not exists payment_token text,
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_status text,
  add column if not exists expires_at timestamptz,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_payments_external_ref_unique
  on public.payments(external_ref)
  where external_ref is not null;

create index if not exists idx_payments_customer_status
  on public.payments(customer_id, status, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  provider text not null,
  event_type text not null,
  external_ref text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;

create index if not exists idx_payment_events_payment
  on public.payment_events(payment_id, created_at desc);

create index if not exists idx_customer_devices_online
  on public.customer_devices(status, last_seen_at desc);

create index if not exists idx_popup_rules_force
  on public.popup_rules(force_popup, is_active, force_popup_until);

-- Admin RLS: dashboard/developer can manage every license row.
drop policy if exists "license admins can read admins" on public.license_admins;
create policy "license admins can read admins"
  on public.license_admins for select
  to authenticated
  using (public.is_license_admin() or auth.uid() = user_id);

drop policy if exists "license admins can manage customers" on public.license_customers;
create policy "license admins can manage customers"
  on public.license_customers for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage subscriptions" on public.customer_subscriptions;
create policy "license admins can manage subscriptions"
  on public.customer_subscriptions for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage devices" on public.customer_devices;
create policy "license admins can manage devices"
  on public.customer_devices for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage plans" on public.subscription_plans;
create policy "license admins can manage plans"
  on public.subscription_plans for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage features" on public.feature_catalog;
create policy "license admins can manage features"
  on public.feature_catalog for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage popups" on public.popup_rules;
create policy "license admins can manage popups"
  on public.popup_rules for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can manage payments" on public.payments;
create policy "license admins can manage payments"
  on public.payments for all
  to authenticated
  using (public.is_license_admin())
  with check (public.is_license_admin());

drop policy if exists "license admins can read activity logs" on public.license_activity_logs;
create policy "license admins can read activity logs"
  on public.license_activity_logs for select
  to authenticated
  using (public.is_license_admin());

drop policy if exists "license admins can read payment events" on public.payment_events;
create policy "license admins can read payment events"
  on public.payment_events for select
  to authenticated
  using (public.is_license_admin());

-- Customer read-only RLS: customers can inspect their own payment history.
drop policy if exists "customers can read own payments" on public.payments;
create policy "customers can read own payments"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.license_customers c
      where c.id = payments.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "customers can read own activity logs" on public.license_activity_logs;
create policy "customers can read own activity logs"
  on public.license_activity_logs for select
  to authenticated
  using (
    exists (
      select 1
      from public.license_customers c
      where c.id = license_activity_logs.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

insert into public.popup_rules
  (code, title, description, cta_text, severity, dismissible, trigger_on)
values
  ('BLOCKED', 'Aplikasi Diblokir', 'Device atau akun ini diblokir dari server developer. Hubungi admin untuk aktivasi ulang.', 'Hubungi Admin', 'danger', false, '{"trigger":"blocked"}'::jsonb),
  ('REMOTE_ANNOUNCEMENT', 'Pesan dari Developer', 'Admin mengirim pesan remote ke aplikasi ini.', 'OK', 'info', true, '{"trigger":"remote_popup"}'::jsonb)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  cta_text = excluded.cta_text,
  severity = excluded.severity,
  dismissible = excluded.dismissible,
  trigger_on = excluded.trigger_on,
  updated_at = now();
