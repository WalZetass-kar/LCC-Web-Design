# Developer/Admin Supabase

Fitur ini memakai Supabase sebagai pusat akun developer/admin, lisensi, device, popup, dan activity log. Aplikasi tetap memakai layar login yang sama.

## File utama

- SQL schema dan RLS: `supabase/migrations/20260529100000_developer_account_system.sql`
- Edge Function license API: `supabase/functions/mediasoft-license/index.ts`
- Login role desktop: `src/backend/controllers/AuthController.ts`
- Login role Android/iOS fallback: `src/renderer/utils/mobileApi.ts`
- Device tracking payload: `src/renderer/utils/authDevice.ts`
- Developer Panel: `src/renderer/pages/LicenseCenter.tsx`
- User/license control: `src/renderer/pages/license/LicenseUsers.tsx`
- Device block/unblock: `src/renderer/pages/license/LicenseDevices.tsx`
- Remote popup content: `src/renderer/pages/license/LicensePopups.tsx`

## Role

Supabase memakai role berikut:

- `user`: pembeli/pengguna aplikasi biasa.
- `admin`: admin lisensi yang boleh membuka Developer Panel.
- `developer`: developer utama, akses penuh.

Untuk kompatibilitas aplikasi lokal:

- Supabase `developer`, `super_admin`, dan `admin` login sebagai role lokal `developer`.
- Pembeli tetap login sebagai role lokal `admin`, tetapi tidak mendapat Developer Panel karena bukan `license_admins`.

## Apply database

Jalankan semua migration Supabase:

```bash
supabase db push
supabase functions deploy mediasoft-license
```

Pastikan Edge Function punya secrets:

```bash
supabase secrets set SUPABASE_URL="https://PROJECT_ID.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"
supabase secrets set SUPABASE_ANON_KEY="ANON_KEY"
```

`SERVICE_ROLE_KEY` hanya berada di Supabase Edge Function, tidak di frontend.

## Membuat akun developer pertama

1. Buat user di Supabase Auth lewat Dashboard: Authentication -> Users -> Add user.
2. Gunakan email developer yang ditentukan dan set password.
3. Ambil `id` user tersebut:

```sql
select id, email
from auth.users
where email = 'developer@example.com';
```

4. Grant role developer:

```sql
insert into public.license_admins (user_id, role, is_active)
values ('AUTH_USER_ID_DARI_QUERY', 'developer', true)
on conflict (user_id) do update
set role = 'developer',
    is_active = true,
    updated_at = now();
```

5. Login dari aplikasi memakai email dan password Supabase tadi. Menu `Developer Panel` akan tampil.

## Keamanan

- User biasa hanya membaca data miliknya melalui RLS.
- Admin/developer membaca dan mengelola semua data melalui `license_admins`.
- User biasa tidak bisa mengubah role sendiri; trigger `protect_profile_role` mengunci `role`, `status`, `auth_user_id`, dan `customer_id`.
- User biasa tidak bisa mengaktifkan lisensi sendiri; tabel `subscriptions` hanya bisa dimanage admin/developer.
- Device tracking hanya boleh update data tracking milik sendiri; status lisensi dan status block dikunci oleh trigger.

## Device tracking

Setiap login dan sync lisensi mengirim:

- `user_id` / `customer_id`
- `device_id`
- `device_name`
- `platform`: Windows, Linux, macOS, Android, iOS
- `app_version`
- `last_seen`
- `license_status`

Data utama dipakai aplikasi dari tabel legacy (`customer_devices`, `customer_subscriptions`) dan disinkronkan ke tabel kompatibel `app_devices` dan `subscriptions`.
