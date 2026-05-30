# Production Deployment Checklist

## Supabase

1. Link project:

```bash
supabase link --project-ref PROJECT_ID
```

2. Push database:

```bash
supabase db push
```

3. Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set DEVELOPER_WHATSAPP=628xxxxxxxxxx
```

Midtrans tidak wajib untuk fase manual WhatsApp. Simpan secret Midtrans kosong sampai merchant siap.

4. Deploy Edge Function:

```bash
supabase functions deploy mediasoft-license
```

5. Buat admin Supabase Auth, lalu grant:

```sql
insert into public.license_admins (user_id, role)
values ('AUTH_USER_ID', 'super_admin')
on conflict (user_id) do update set role = excluded.role, is_active = true;
```

6. Smoke test:

```bash
MEDIASOFT_LICENSE_SERVER_URL=https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license \
LICENSE_ADMIN_EMAIL=admin@example.com \
LICENSE_ADMIN_PASSWORD='password' \
npm run smoke:supabase-license
```

## Build Env

Set saat build desktop/mobile:

```bash
MEDIASOFT_LICENSE_SERVER_URL=https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_LICENSE_OFFLINE_GRACE_HOURS=72
```

`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` hanya dipakai untuk realtime notification. Jika kosong, aplikasi tetap sync tiap 30 detik.

## Manual Payment Flow

1. User buka `Pembayaran Lisensi`.
2. User pilih paket dan klik `Chat Developer`.
3. Supabase membuat payment `pending` provider `manual_whatsapp`.
4. WhatsApp developer terbuka dengan invoice dan detail paket.
5. Developer menerima pembayaran manual.
6. Developer buka `License Center > Pembayaran` dan klik approve.
7. Supabase memperpanjang subscription.
8. Aplikasi user sync otomatis atau menerima event realtime jika env realtime aktif.

## Production Hardening

- Service role key hanya disimpan sebagai Supabase Edge Function secret.
- DevTools dimatikan di packaged Electron build.
- Renderer build di-obfuscate dan console/debugger didrop saat build.
- Offline grace default 72 jam. Ubah via `VITE_LICENSE_OFFLINE_GRACE_HOURS`.
- Semua status premium tetap divalidasi ulang ke Supabase.
