# Arsitektur Build dan Sinkronisasi Cross-Platform

Dokumen ini menjelaskan kondisi project POS saat ini dan perubahan build/sync
yang dipakai untuk Desktop, Android, iPhone/iPad, tablet Android, dan iPad.
Project tetap satu aplikasi; tidak ada rewrite dari nol dan tidak ada fitur POS
lama yang dihapus.

## Analisis Struktur Saat Ini

- UI utama memakai React + Vite di `src/renderer`.
- Desktop memakai Electron di `src/main`, `src/main/preload.cjs`, dan IPC di `src/main/ipcHandlers.ts`.
- Backend lokal desktop memakai controller/model di `src/backend` dan SQLite melalui `src/database/connection.ts`.
- Mobile memakai Capacitor Android/iOS dengan adapter data di `src/renderer/utils/mobileApi.ts`.
- Sync LAN desktop/mobile memakai `src/main/syncServer.ts`, `src/main/syncClient.ts`, dan channel `sync:*`.
- Lisensi/paket pusat memakai Supabase Edge Function `supabase/functions/mediasoft-license`.
- Migration Supabase ada di `supabase/migrations`.

## Arsitektur Desktop + Mobile + Sync

Desktop tetap menjadi runtime paling lengkap:

- Electron main process menjalankan SQLite lokal, IPC, print struk, export PDF/Excel, backup, dan sync server.
- Database packaged disalin ke folder `app.getPath('userData')` saat pertama dijalankan agar aman ditulis di production.
- Electron Builder membuat installer Windows, Linux, dan macOS dari konfigurasi `build` di `package.json`.

Mobile memakai runtime yang sama di React:

- Capacitor membungkus hasil `vite build`.
- `mobileApi.ts` menyimpan data offline di storage mobile dan meneruskan channel ke sync server desktop jika mode client aktif.
- Layout responsif tetap menggunakan komponen dan route yang sama, dengan navigasi mobile yang sudah ada di `src/renderer/layouts/MobileBottomNav.tsx`.

Sync data:

- Desktop/server membuka HTTP LAN di port default `38573` dengan token.
- Mobile/desktop client menyimpan `baseUrl` dan `token`, lalu invoke channel yang diizinkan melalui `/api/invoke`.
- Health check ada di `/health`; test CLI memakai `system:checkDb`.
- Data penting tetap punya ID unik dari layer masing-masing. Untuk transaksi, ID utama tetap `kd_tansaksi_jual`; sinkronisasi memakai channel controller yang sudah ada sehingga validasi stok, pembayaran, pajak, diskon, retur, laporan, backup, activity log, lisensi, dan pengaturan tetap melalui logic existing.

## Conflict Handling

- Semua perubahan lewat controller existing, bukan write langsung dari mobile ke SQLite desktop.
- Jika device offline, data mobile disimpan lokal dulu.
- Saat online, client meneruskan operasi ke server desktop dengan token.
- Update data memakai primary key existing dan timestamp existing (`tgl_wkt_*`, `created_at`, `updated_at`, atau `synced_at` ketika tersedia).
- Jika data remote lebih baru, controller desktop menjadi sumber kebenaran untuk hasil akhir.
- TODO: untuk sync cloud POS penuh lintas toko tanpa desktop LAN, tambahkan tabel outbox Supabase khusus POS dengan `record_id`, `entity`, `operation`, `updated_at`, `synced_at`, dan `device_id`. Saat ini Supabase production sudah menjadi sumber kebenaran lisensi/paket, sedangkan sync POS operasional memakai server desktop existing.

## Paket Lifetime

- Paket baru Supabase: `LIFETIME`.
- Nama UI: `Sekali Beli Seumur Hidup`.
- `duration_days = 0` berarti subscription tidak punya tanggal habis.
- `customer_subscriptions.expires_at` dibuat nullable lewat migration.
- Saat payment lifetime diset paid/approved, subscription aktif disimpan dengan `expires_at = null`.
- Desktop dan mobile menganggap `expires_at = null` sebagai aktif permanen selama status subscription `active`.

## Script Build Wajib

```bash
npm run dev
npm run dev:desktop
npm run build
npm run build:win
npm run build:linux
npm run build:mac
npm run dev:mobile
npm run build:android
npm run build:ios
npm run sync:test
```

Alias tambahan yang tetap tersedia:

```bash
npm run build:desktop:windows
npm run build:desktop:linux
npm run build:desktop:mac
npm run build:mobile:android
npm run build:mobile:ios
npm run android:debug
npm run ios:open
```

## Cara Menjalankan

Development desktop:

```bash
npm run dev:desktop
```

Development mobile web preview:

```bash
npm run dev:mobile
```

Test sync tanpa server:

```bash
npm run sync:test
```

Test sync ke server desktop nyata:

```bash
SYNC_SERVER_URL=http://127.0.0.1:38573 SYNC_SERVER_TOKEN=<token> npm run sync:test
```

## Cara Build

Windows:

```bash
npm run build:win
```

Linux:

```bash
npm run build:linux
```

macOS:

```bash
npm run build:mac
```

Android APK + AAB:

```bash
npm run build:android
```

iOS/iPadOS Xcode sync:

```bash
npm run build:ios
npm run ios:open
```

TODO: IPA final harus dibuat di macOS melalui Xcode Archive dengan Apple
Developer Account, signing, dan provisioning profile.

## Checklist Testing

- `npm run verify:build-resources` sukses.
- `npm run typecheck` sukses.
- `npm test` sukses.
- Login developer tidak masuk mode demo.
- Login pembeli trial tetap 3 hari.
- Paket `LIFETIME` tampil di Developer Panel -> Paket dan popup upgrade.
- Pembayaran/approval paket `LIFETIME` membuat subscription aktif dengan `expires_at = null`.
- Desktop dapat membuat transaksi, stok berkurang, struk bisa dicetak, dan laporan bisa export PDF/Excel.
- Android dapat login, transaksi/form POS tetap nyaman di layar kecil, dan sync LAN lewat `sync:testConnection`.
- iPhone/iPad dapat sync Capacitor lewat `npm run build:ios`.
- Backup/restore desktop tetap menulis ke folder data aplikasi, bukan folder instalasi.
- License status desktop/mobile membaca Supabase Edge Function yang sama.
