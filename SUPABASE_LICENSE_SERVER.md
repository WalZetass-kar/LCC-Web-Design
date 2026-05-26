# Supabase License Server

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
  -> POST /check-license
  -> POST /validate-device
  -> GET /active-features
  -> GET /popup/:code
```

Data transaksi POS tetap lokal di SQLite. Supabase hanya menjadi pusat akun, lisensi, paket, device, popup, dan log aktivitas lisensi.
