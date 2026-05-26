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

## Desktop

Build desktop memakai Electron Builder.

```bash
npm run desktop:win
npm run desktop:win:installer
npm run desktop:linux
npm run desktop:mac
```

Catatan:

- Windows installer final paling aman dibuat di Windows.
- macOS `.dmg` final harus dibuat di macOS, lalu code signing dan notarization.
- Linux menghasilkan AppImage dan deb.
- `desktop:all:ci` disediakan untuk CI matrix, bukan pengganti signing per OS.

## Android

Debug APK:

```bash
npm run android:debug
```

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

## iOS

iOS menggunakan Capacitor. Platform iOS hanya dapat di-build final di macOS
dengan Xcode dan Apple Developer Account.

Pertama kali:

```bash
npm run ios:add
```

Sync web assets ke project iOS:

```bash
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
```

Untuk release Android, pastikan environment certificate pinning sudah diisi.
Untuk macOS dan iOS, jalankan build final di macOS.
