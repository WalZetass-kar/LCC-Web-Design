# Mobile License Test Plan

Gunakan checklist ini sebelum merilis Android/iOS.

## Android

1. Build:

```bash
npm run build:android
```

2. Buka Android Studio:

```bash
npm run android:open
```

3. Validasi di device fisik:

- Register trial membuat akun di Supabase.
- Login dengan email yang sama di device kedua.
- `device_id` tetap sama setelah app ditutup/dibuka.
- License sync berjalan saat app dibuka, login, refresh/focus, dan interval.
- Developer dapat melihat device di `License Center > Device`.
- Developer block device, lalu app user menampilkan popup blocked dan tidak bisa lanjut.
- Subscription expired menampilkan popup perpanjangan.
- Halaman `Pembayaran Lisensi` membuka WhatsApp developer.
- Setelah admin approve payment, app user berubah aktif setelah sync.
- Mode offline masih bisa berjalan hanya selama grace period.

## iOS

1. Build:

```bash
npm run build:ios
```

2. Buka Xcode:

```bash
npm run ios:open
```

3. Validasi poin yang sama seperti Android.

## Catatan

Realtime Supabase membutuhkan:

```bash
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Jika env ini kosong, aplikasi tetap memakai sync interval 30 detik.
