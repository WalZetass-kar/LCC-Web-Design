# Build Report 2026-05-28

Project: Zetass Pos
Supabase license endpoint: `https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license`

## Artifact Final

Folder output: `release/`

| Platform | File | Status |
| --- | --- | --- |
| Linux | `Zetass Pos-2.0.0-linux-x86_64.AppImage` | Berhasil |
| Linux | `Zetass Pos-2.0.0-linux-amd64.deb` | Berhasil |
| Windows | `Zetass Pos-2.0.0-win-x64.exe` | Berhasil sebagai portable exe |
| Windows | `Zetass Pos-2.0.0-win-x64.zip` | Berhasil |
| Android | `Zetass Pos.apk` | Berhasil signed release APK |
| Android | `Zetass Pos.aab` | Berhasil signed release AAB |
| iOS | `ios/App/App.xcodeproj` | Berhasil sync untuk Xcode |

## Cara Install

### Windows

Gunakan `release/Zetass Pos-2.0.0-win-x64.exe` untuk menjalankan aplikasi portable, atau extract `release/Zetass Pos-2.0.0-win-x64.zip` lalu jalankan executable di dalamnya.

Catatan: target NSIS installer dan MSI sudah dikonfigurasi di `package.json`, tetapi final installer `.exe`/`.msi` perlu dibuild di Windows atau Linux dengan `wine32:i386` aktif.

### Linux

AppImage:

```bash
chmod +x "release/Zetass Pos-2.0.0-linux-x86_64.AppImage"
"release/Zetass Pos-2.0.0-linux-x86_64.AppImage"
```

Debian/Ubuntu:

```bash
sudo apt install "./release/Zetass Pos-2.0.0-linux-amd64.deb"
```

### Android

Install APK manual:

```bash
adb install -r "release/Zetass Pos.apk"
```

Untuk Google Play Store, upload `release/Zetass Pos.aab`.

### iPhone / iOS

Project iOS sudah tersinkron di `ios/App/App.xcodeproj` dengan deployment target iOS 15.0 dan bundle id `com.zetass.pos`.

Di macOS:

```bash
npm run ios:sync
npm run ios:open
```

Lalu di Xcode set Apple Team, signing certificate, provisioning profile, archive, dan export IPA atau upload ke App Store Connect.

## Cara Publish

- Supabase Edge Function `mediasoft-license` sudah dideploy ke project `azhkvmkmimepmflzqqty`.
- Android: upload AAB ke Play Console, simpan `.keys/android-release.env` dan keystore dengan aman.
- Windows: untuk installer final, jalankan `npx electron-builder --win nsis msi --publish never` di Windows atau Linux dengan Wine 32-bit lengkap, lalu code-sign installer.
- macOS: jalankan `npm run desktop:mac` di macOS, lalu code-sign dan notarize `.dmg`.
- iOS: archive dari Xcode dan upload ke App Store Connect/TestFlight.

## Verifikasi

Perintah yang sudah dijalankan:

```bash
npm run typecheck
npm run test
npx electron-builder --linux --publish never
npx electron-builder --win portable --publish never
node scripts/build-android.cjs assembleRelease
node scripts/build-android.cjs bundleRelease
npm run ios:sync
npm run smoke:supabase-license
```

Hasil smoke Supabase publik:

- `OK health`
- `OK public plans`

## Catatan Perbaikan

- Remote license popup dipasang di root React agar status expired/inactive/suspended/blocked dari Supabase benar-benar tampil.
- Mobile API fallback sekarang melakukan login trial, login buyer, sync license, public plans, payment request, dan payment status langsung ke Supabase.
- Client mobile tidak menyimpan status premium sebagai sumber kebenaran; status disinkronkan ke Supabase saat login, app open/restore, focus/visibility, dan interval AuthContext.
- Android release R8 diperbaiki dengan dependency anotasi `error_prone_annotations` dan `jsr305`.
- Android release memakai certificate pinning untuk `azhkvmkmimepmflzqqty.supabase.co` dan cleartext traffic nonaktif.
- Supabase Edge Function production dideploy ulang karena endpoint `/plans` belum tersedia di deployment sebelumnya.
- macOS `.dmg` dan iOS `.ipa` final belum bisa dibuat di host Linux ini; keduanya memerlukan macOS/Xcode.
- NSIS/MSI Windows final belum bisa dibuat di host Linux ini karena Wine 32-bit tidak terpasang. Portable `.exe` dan `.zip` Windows berhasil dibuat.
