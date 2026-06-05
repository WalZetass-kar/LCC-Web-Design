# Cross-Platform Build Guide

Panduan ini menjelaskan alur build MediaSoft POS Zetass untuk desktop,
Android, dan iOS tanpa mengubah fitur POS yang sudah ada.

## Runtime Database

Desktop packaged app membawa template `sistem_pos.db` sebagai resource.
Saat aplikasi pertama dibuka, database disalin otomatis ke folder writable:

- Windows: `%APPDATA%/MediaSoft POS Zetass v2.0/sistem_pos.db`
- Linux: `~/.config/MediaSoft POS Zetass v2.0/sistem_pos.db`
- macOS: `~/Library/Application Support/MediaSoft POS Zetass v2.0/sistem_pos.db`

Migrasi tetap dijalankan otomatis pada startup melalui `src/database/connection.ts`
dan `src/backend/utils/dbInit.ts`.

Backup desktop juga disimpan di folder data aplikasi saat packaged, bukan di
folder instalasi:

- Windows: `%APPDATA%/MediaSoft POS Zetass v2.0/backups`
- Linux: `~/.config/MediaSoft POS Zetass v2.0/backups`
- macOS: `~/Library/Application Support/MediaSoft POS Zetass v2.0/backups`

Mobile memakai Capacitor SQLite/local storage bridge di
`src/renderer/utils/sqlitePersistence.ts` dan file backup melalui Capacitor
Filesystem.

## Preflight Resource

Sebelum packaging, jalankan:

```bash
npm run verify:build-resources
```

Preflight ini memastikan resource wajib tersedia:

- `sistem_pos.db`
- `migrations/`
- `build/icon.png`
- `build/icon.ico`
- `src/renderer/assets/`
- konfigurasi Electron Builder di `package.json`
- konfigurasi Capacitor di `capacitor.config.ts`
- project Android dan iOS Capacitor

Electron Builder memasukkan resource berikut ke package desktop:

- `sistem_pos.db` ke `resources/sistem_pos.db`
- `migrations/` ke `resources/migrations`
- `build/icon.png` ke `resources/app-icon.png`
- `build/icon.ico` ke `resources/app-icon.ico`
- `src/renderer/assets/` ke `resources/renderer-assets`

## Desktop

Build desktop memakai Electron Builder.

```bash
npm run build:desktop:windows
npm run build:desktop:linux
npm run build:desktop:mac
```

Alias wajib yang setara:

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

Output:

- Windows: `release/*.exe` installer NSIS dari `build:win`; ZIP bisa dibuat dengan `desktop:win`; semua target Windows tersedia lewat `desktop:win:all`
- Linux: `release/*.AppImage` dan `release/*.deb`
- macOS: `release/*.dmg` dan `release/*.zip`

Alias lama masih tersedia:

```bash
npm run desktop:win
npm run desktop:win:installer
npm run desktop:win:all
npm run desktop:linux
npm run desktop:mac
```

Catatan:

- Windows installer final paling aman dibuat di Windows.
- macOS `.dmg` final harus dibuat di macOS, lalu code signing dan notarization.
- Linux menghasilkan AppImage dan deb.
- `desktop:all:ci` disediakan untuk CI matrix, bukan pengganti signing per OS.
- Setelah install, database runtime tetap berada di folder data aplikasi.
- Uninstall NSIS tidak menghapus app data karena `deleteAppDataOnUninstall`
  diset `false`.
- Desktop mendaftarkan deep link `mediasoftposzetass://...`, membatasi external link ke HTTPS,
  dan melakukan certificate pinning untuk endpoint Supabase/license utama.

Menjalankan hasil build:

- Windows: buka installer `.exe` dari `release/`, lalu jalankan dari Start Menu.
- Linux AppImage: beri izin eksekusi jika perlu, lalu jalankan file AppImage.
- Linux deb: install dengan package manager, lalu jalankan aplikasi dari launcher.
- macOS: buka `.dmg`, drag aplikasi ke Applications, lalu jalankan.

## Android

Debug APK:

```bash
npm run android:debug
```

Build mobile Android lengkap memakai alias:

```bash
npm run build:android
```

Alias tersebut menjalankan release APK dan AAB. Alias lama `build:mobile:android`
tetap tersedia. Jika hanya butuh salah satu:

Release APK:

```bash
MEDIASOFT_PINNED_DOMAIN=api.domain-anda.com \
MEDIASOFT_CERT_PIN_SHA256=BASE64_SHA256_PIN \
npm run android:release
```

Release AAB untuk Play Store:

```bash
MEDIASOFT_PINNED_DOMAIN=api.domain-anda.com \
MEDIASOFT_CERT_PIN_SHA256=BASE64_SHA256_PIN \
npm run android:aab
```

Jika build release memang harus mengizinkan HTTP LAN untuk pairing lokal:

```bash
MEDIASOFT_ALLOW_LAN_HTTP=true npm run android:release
```

Output release disalin ke folder `release/`.

Output native Gradle tetap tersedia di:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Script `scripts/build-android.cjs` menyalin hasil final menjadi:

- `release/MediaSoft POS Zetass v2.0.apk`
- `release/MediaSoft POS Zetass v2.0.aab`

## iOS

iOS menggunakan Capacitor. Platform iOS hanya dapat di-build final di macOS
dengan Xcode dan Apple Developer Account.

Pertama kali:

```bash
npm run ios:add
```

Sync web assets ke project iOS:

```bash
npm run build:ios
```

Alias lama:

```bash
npm run build:mobile:ios
npm run ios:sync
```

Buka Xcode:

```bash
npm run ios:open
```

Di Xcode:

1. Set Team dan Signing.
2. Set Bundle Identifier `com.mediasoft.pos.zetass`.
3. Archive.
4. Upload ke TestFlight atau export `.ipa`.

Konfigurasi iOS sudah memuat privacy usage text untuk kamera, Bluetooth printer,
file backup/export, local network sync, deep link `mediasoftposzetass://...`,
ATS HTTPS-only, dan pinning SPKI untuk endpoint Supabase/license utama.

Project Xcode berada di:

```bash
ios/App/App.xcodeproj
```

## Aplikasi Terpadu

Project tetap satu aplikasi. POS operasional, login pembeli, Developer Panel,
lisensi, paket, backup, laporan, dan pengaturan berjalan dalam satu flow React
yang sama melalui `src/renderer/main.tsx` dan layout aplikasi yang sudah ada.

Route Developer Panel dilindungi RBAC di frontend dan channel administrasi
dilindungi di backend IPC guard. Link menu Developer Panel hanya tampil untuk
role developer/super admin.

## Backend Production

Client harus memakai backend HTTPS publik untuk:

- login user
- device registration
- subscription/license check
- feature flags
- sync transaksi

Endpoint license Supabase bisa dipakai untuk lisensi, tetapi sinkronisasi transaksi
POS sebaiknya masuk ke backend pusat sendiri.

## Release Verification

Sebelum publish:

```bash
npm run typecheck
npm test
npm run desktop:linux
npm run android:debug
npm run sync:test
```

Untuk release Android, pastikan environment certificate pinning sudah diisi.
Untuk macOS dan iOS, jalankan build final di macOS.
