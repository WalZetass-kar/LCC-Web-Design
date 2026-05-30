# Supabase License Server + Payment Gateway

Server pusat ini dipakai agar POS developer dan POS pembeli di device/lokasi berbeda terhubung ke satu sumber lisensi.

## Endpoint Produksi

Setelah deploy, gunakan URL ini di License Center:

```text
https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license
```

Jangan gunakan `localhost` untuk pembeli jarak jauh.

## Setup

1. Buat project Supabase.
2. Install dan login Supabase CLI.
3. Link project:

```bash
supabase link --project-ref PROJECT_ID
```

4. Push schema:

```bash
supabase db push
```

5. Deploy Edge Function:

```bash
supabase functions deploy mediasoft-license
```

6. Pastikan secret service role tersedia:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

7. Set nomor WhatsApp developer untuk pembayaran manual:

```bash
supabase secrets set DEVELOPER_WHATSAPP=628xxxxxxxxxx
```

Midtrans/Xendit/Duitku belum wajib untuk fase ini. Pembayaran user diarahkan ke WhatsApp developer dan admin meng-approve pembayaran dari License Center.

## Admin License Center

Buat user admin di Supabase Auth, lalu jalankan SQL ini di SQL Editor:

```sql
insert into public.license_admins (user_id, role)
values ('AUTH_USER_ID', 'super_admin')
on conflict (user_id) do update set role = excluded.role, is_active = true;
```

Setelah itu di POS:

- Buka `License Center`
- URL: `https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license`
- Email/password: user Supabase Auth yang sudah diberi role `super_admin`
- Klik `Simpan & Hubungkan`
- Klik `Sync Lisensi dari Server`

Untuk build yang dibagikan ke pembeli, set endpoint server pusat saat build/runtime:

```bash
MEDIASOFT_LICENSE_SERVER_URL=https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license
```

Jika variabel ini tersedia, tombol `Daftar Akun` di halaman login akan mendaftarkan trial ke Supabase terlebih dahulu, lalu membuat cache akun lokal untuk POS.

## Flow Pembeli

```text
Pembeli Desktop/Mobile
  -> POST /register-trial
  -> POST /customer/login
  -> POST /check-license
  -> POST /validate-device atau /sync
  -> GET /active-features
  -> GET /popup/:code
  -> POST /payments/manual-request
  -> GET /payments/status
```

Data transaksi POS tetap lokal di SQLite. Supabase menjadi pusat akun, lisensi, paket, device, popup, invoice, transaksi pembayaran, dan log aktivitas lisensi.

## Struktur Database Supabase

Tabel utama:

- `license_admins`: daftar developer/admin yang boleh mengelola semua user.
- `license_customers`: akun pembeli, status akun, dan remote popup per user.
- `subscription_plans`: paket, harga, durasi, limit device/transaksi/produk/user, dan feature flags.
- `feature_catalog`: master fitur premium.
- `customer_subscriptions`: riwayat langganan. Status: `active`, `inactive`, `expired`, `suspended`, `blocked`.
- `customer_devices`: device tracking berbasis `device_id` unik. Status: `active`, `inactive`, `blocked`, `revoked`.
- `subscription_usage`: log pemakaian fitur/limit.
- `popup_rules`: popup upgrade, expired, blocked, dan force popup dari admin.
- `payments`: invoice/transaksi pembayaran. Status: `pending`, `paid`, `failed`, `expired`.
- `payment_events`: payload webhook gateway untuk audit/idempotency.
- `license_activity_logs`: audit aktivitas user, admin, device, license, popup, dan payment.

Migration lengkap ada di:

- `supabase/migrations/20260521143000_mediasoft_license_schema.sql`
- `supabase/migrations/20260521162000_popup_image_url.sql`
- `supabase/migrations/20260528120000_license_realtime_payment_gateway.sql`

## RLS

RLS aktif untuk semua tabel lisensi. Prinsipnya:

- Customer hanya bisa membaca data miliknya melalui `auth.uid() = license_customers.auth_user_id`.
- Customer tidak diberi policy untuk mengubah status premium, subscription, payment, atau device.
- Admin/developer yang ada di `license_admins` bisa mengelola seluruh data melalui policy `public.is_license_admin()`.
- Edge Function memakai `SUPABASE_SERVICE_ROLE_KEY` hanya di server. Jangan pernah memasukkan service role key ke frontend.

## Payment Flow Manual WhatsApp

```text
User pilih paket
  -> POST /payments/manual-request
  -> Edge Function membuat payment pending provider manual_whatsapp
  -> App membuka WhatsApp developer berisi invoice + detail paket
  -> Developer menerima pembayaran manual
  -> Developer approve di License Center
  -> payments.status = paid
  -> customer_subscriptions auto-extend dari expiry aktif terakhir
  -> POS sync /check-license dan langsung menerima expiry/fitur terbaru
```

Endpoint Midtrans `/payments/create` dan `/payments/midtrans/webhook` tetap tersedia untuk fase berikutnya ketika akun merchant sudah siap, tetapi UI user saat ini memakai pembayaran manual WhatsApp.

Jika Supabase atau internet offline, POS memakai cache sesi lokal hanya dalam grace period. Default grace period adalah 72 jam dan bisa diubah lewat `VITE_LICENSE_OFFLINE_GRACE_HOURS`.

## Realtime

App selalu sync tiap 30 detik. Untuk push realtime tambahan, isi env build:

```bash
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Jika env ini kosong, sistem tetap jalan dengan sync interval.

## Admin Panel

Di POS buka `License Center`:

- `Dashboard`: user, subscription aktif, revenue, device online.
- `Pembeli`: search/filter user, ubah status, block, reset password, ubah paket.
- `Device`: lihat device aktif/online, block/unblock device dari pusat.
- `Paket`: harga, durasi, fitur, dan limit paket.
- `Fitur`: master feature flag.
- `Popup`: isi popup dan `force_popup` ke semua device.
- `Pembayaran`: riwayat transaksi, status `pending/paid/failed/expired`, approve manual.

## Endpoint Penting

Public/customer:

- `GET /health`
- `GET /plans`
- `POST /register-trial`
- `POST /customer/login`
- `POST /check-license`
- `POST /sync`
- `POST /payments/manual-request`
- `GET /payments/status`
- `POST /payments/create`
- `POST /payments/midtrans/webhook`

Admin:

- `POST /auth/login`
- `GET /admin/stats`
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/devices`
- `POST /admin/devices/:id/block`
- `POST /admin/devices/:id/unblock`
- `GET /admin/payments`
- `POST /admin/payments/:id/approve`
