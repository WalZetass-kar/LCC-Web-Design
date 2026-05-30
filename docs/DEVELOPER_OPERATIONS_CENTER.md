# Developer Operations Center

Dokumen ini menjelaskan pengembangan lanjutan Developer Panel MediaSoft POS Zetass.

## Audit Masalah

- Access token Supabase admin disimpan tanpa refresh token, sehingga Developer Panel gagal setelah JWT expired.
- Device developer/admin belum tercatat sebagai device aplikasi, hanya device pembeli yang terlihat.
- Tabel operasional untuk force update, error monitoring, broadcast, dan revenue analytics belum lengkap.
- Endpoint admin belum menyediakan device detail, action lisensi per device, broadcast, error log, dan update management.
- Android dapat terdeteksi di Supabase sebagai aplikasi/device, tetapi akun developer tidak otomatis masuk ke monitoring device developer.

## Perbaikan Utama

- Login admin/developer sekarang menyimpan `access_token` dan `refresh_token`.
- Desktop dan Android akan melakukan refresh token otomatis saat server mengembalikan JWT expired.
- Supabase Edge Function menambah `/auth/refresh`, `/heartbeat`, `/errors`, `/app-update`, dan `/announcements`.
- Device developer/admin di-upsert ke `app_devices` saat login dan heartbeat.
- Developer Panel menambah tab:
  - Dashboard
  - Device Detail
  - Update
  - Error
  - Broadcast
  - Revenue
- Device dapat di-block, unblock, suspend lisensi, aktifkan lisensi, dan diperpanjang 30 hari.
- Error frontend otomatis dikirim ke Supabase melalui `error_logs`.
- Heartbeat aplikasi mengirim `last_seen`, device info, platform, OS, dan versi aplikasi.

## Tabel Supabase

Tabel utama yang digunakan:

- `profiles`
- `app_devices`
- `subscriptions`
- `transactions`
- `activity_logs`
- `error_logs`
- `announcements`
- `app_updates`
- `payments`
- `customer_devices`
- `customer_subscriptions`
- `license_activity_logs`

Migrasi utama:

- `supabase/migrations/20260529170000_developer_operations_center.sql`

## RLS dan Keamanan

- Service role key hanya dipakai di Supabase Edge Function.
- Frontend hanya menyimpan access token dan refresh token user yang login.
- User biasa tidak bisa menaikkan role sendiri.
- User biasa tidak bisa mengubah lisensi sendiri.
- User biasa tidak bisa membaca data user lain.
- Admin/developer dibatasi oleh `license_admins` dan helper `public.is_app_admin()`.
- Fitur premium tetap divalidasi server melalui endpoint license.

## Cara Pakai Developer Panel

1. Login ke aplikasi memakai email/password developer Supabase.
2. Buka menu `Developer Panel`.
3. Gunakan tab:
   - `Dashboard`: statistik user, device, revenue, activity, error.
   - `Device`: monitoring online/offline, platform filter, detail device, block/unblock, lisensi.
   - `Update`: set latest/minimum version dan mode optional/force.
   - `Error`: lihat crash/app/sync/login/subscription error.
   - `Broadcast`: kirim announcement, maintenance, promo, warning, update info.
   - `Revenue`: pantau pendapatan dan paket terlaris.
   - `Pembayaran`: approve pembayaran manual.

## Force Update

Isi:

- `latest_version`
- `minimum_version`
- `release_notes`
- `download_url`
- `mode`: `optional` atau `force`

Jika versi aplikasi di bawah `minimum_version`, API `/app-update` akan mengembalikan `update_required: true`.

## Build dan Deploy

Supabase:

```bash
supabase db push
supabase functions deploy mediasoft-license
```

Desktop/mobile:

```bash
npm run typecheck
npm run test
npm run desktop:linux
npm run desktop:win
npm run android:debug
```

Build macOS/iOS memerlukan macOS + Xcode. Dari Linux, artefak macOS/iOS tidak bisa dibuat secara valid.
