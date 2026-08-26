# Zetass POS

> **Aplikasi Point of Sale Desktop & Mobile** yang dibangun dengan Electron, React, dan Capacitor.

**Developer:** [WalZetass-Kar](https://github.com/WalZetass-kar)  
**Platform:** Windows · Linux · macOS · Android · iOS  
**Versi:** 2.0.1

---

## 📸 Screenshot

| Login | Dashboard | POS / Kasir |
|-------|-----------|-------------|
| ![Login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![POS](docs/screenshots/pos.png) |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS |
| Desktop | Electron 31, Vite 5 |
| Mobile | Capacitor 8 (Android & iOS) |
| Database | SQLite (better-sqlite3), Drizzle ORM |
| Build | Vite, electron-builder |
| CI/CD | GitHub Actions |

---

## ⚙️ Prasyarat Sistem

Pastikan semua tools berikut sudah terinstal sebelum menjalankan proyek:

| Tool | Versi Minimum | Perintah Cek |
|------|--------------|--------------|
| **Node.js** | 20+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **pnpm** *(direkomendasikan)* | 9+ | `pnpm --version` |
| **Git** | Any | `git --version` |
| **JDK** | 17+ *(untuk Android)* | `java --version` |
| **Android Studio** | Ladybug+ *(untuk Android)* | — |

### Instal pnpm (jika belum ada)
```bash
npm install -g pnpm
```

---

## 🚀 Cara Menjalankan — Desktop (Electron)

### 1. Clone repository
```bash
git clone https://github.com/WalZetass-kar/LCC-Web-Design.git
cd LCC-Web-Design
```

### 2. Install dependencies
```bash
pnpm install
# atau jika tidak ada pnpm:
npm install
```

### 3. Jalankan aplikasi desktop
```bash
npm run dev
```

Aplikasi Electron akan terbuka otomatis. Jika baru pertama kali, akan muncul form **Setup Akun Admin** — isi username, nama lengkap, dan password untuk membuat akun pertama.

> **Login Default (jika database sudah ada):**
> - Username & Password: sesuai yang dibuat saat setup pertama
> - Atau gunakan akun **Demo** untuk melihat-lihat tanpa akun

---

## 📱 Cara Menjalankan — Android

Ada **3 cara** untuk menjalankan di Android:

---

### Cara 1: Android Studio + Emulator (Tanpa HP Fisik)

#### Langkah 1 — Buat Emulator di Android Studio
1. Buka **Android Studio**
2. Klik **Device Manager** (ikon HP di toolbar kanan)
3. Klik **Create Device**
4. Pilih device: **Pixel 7** atau **Galaxy Nexus**
5. Pilih System Image: **API 33 (Android 13)** atau lebih tinggi — unduh jika belum ada
6. Klik **Finish** → emulator siap

#### Langkah 2 — Build & Sync ke Android
```bash
# Build web frontend dulu
npm run build:vite

# Sync hasil build ke folder android/
npm run android:sync
```

#### Langkah 3 — Buka di Android Studio
```bash
npm run android:open
```
> Android Studio akan terbuka secara otomatis mengarah ke folder `android/`

#### Langkah 4 — Jalankan dari Android Studio
1. Tunggu proses **Gradle Sync** selesai (lihat indikator progress di bagian bawah)
2. Pilih **emulator** dari dropdown device di toolbar atas
3. Klik tombol ▶️ **Run 'app'**
4. Tunggu proses build & install (~1–3 menit pertama kali)

---

### Cara 2: HP Fisik via USB (Paling Cepat & Direkomendasikan)

#### Langkah 1 — Aktifkan Developer Mode di HP Android
1. Buka **Pengaturan** → **Tentang Ponsel**
2. Ketuk **Nomor Build** sebanyak **7 kali** hingga muncul notif "Anda sekarang adalah developer"
3. Kembali ke **Pengaturan** → **Opsi Pengembang**
4. Aktifkan **USB Debugging** ✅

#### Langkah 2 — Sambungkan HP ke Laptop
1. Hubungkan HP dengan kabel USB ke laptop
2. Di HP, pilih **"Transfer File"** (MTP) saat muncul dialog USB
3. Di HP, ketuk **"Izinkan"** saat muncul dialog **USB Debugging**
4. Verifikasi HP terdeteksi:
   ```bash
   adb devices
   ```
   Harus muncul nomor serial HP.

#### Langkah 3 — Build & Jalankan
```bash
# Build web frontend
npm run build:vite

# Sync ke android
npm run android:sync

# Buka Android Studio
npm run android:open
```

Di Android Studio:
1. Tunggu Gradle sync selesai
2. Pilih **nama HP kamu** dari dropdown device (bukan emulator)
3. Klik ▶️ **Run** → aplikasi akan terinstal langsung di HP

---

### Cara 3: Live Dev Mode (Hot Reload)

Mode ini cocok untuk development — perubahan kode langsung terlihat di HP tanpa perlu build ulang.

#### Terminal 1 — Jalankan Dev Server
```bash
npm run dev:mobile
```
> Server berjalan di `http://localhost:5173`

#### Terminal 2 — Buka Android Studio
```bash
npm run android:open
```

---

## 🌐 Preview di Browser (Mobile View)

Cara termudah dan tercepat untuk melihat tampilan mobile tanpa HP/emulator:

```bash
npm run dev:mobile
```

Lalu buka browser → tekan **F12** → klik ikon **📱 Toggle Device Toolbar** → pilih perangkat seperti `Pixel 7`, `Galaxy S20`, dll.

---

## 🏗️ Build untuk Distribusi

### Build Windows (.exe Installer)
```bash
npm run build:desktop:windows
```
Output: `release/Zetass Pos-2.0.1-x64.exe`

### Build Linux (.deb / .AppImage)
```bash
npm run build:desktop:linux
```
Output: `release/zetass-pos_2.0.1_amd64.deb`

### Build Android Debug APK
```bash
npm run android:debug
```
Output: `release/ZetassPOS-debug.apk`

### Build Android Release APK
```bash
npm run android:release
```
Output: `release/ZetassPOS.apk`

---

## 🔑 Login Pertama Kali

Saat database **kosong / baru**, aplikasi akan menampilkan halaman **Setup Akun**.

Isi form berikut:
- **Username:** bebas (misal: `admin`)
- **Nama Lengkap:** nama Anda
- **Email:** opsional
- **Password:** minimal 8 karakter

Setelah setup, gunakan username & password tersebut untuk login.

---

## 📁 Struktur Proyek

```
LCC-Web-Design/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   ├── renderer/          # React frontend (UI)
│   │   ├── pages/         # Halaman-halaman aplikasi
│   │   ├── components/    # Komponen reusable
│   │   ├── contexts/      # React Context (Auth, Theme, dll)
│   │   └── utils/         # Utilities & API wrapper
│   ├── backend/           # Business logic & controllers
│   └── database/          # Schema & koneksi SQLite
├── android/               # Capacitor Android project
├── ios/                   # Capacitor iOS project
├── scripts/               # Build & utility scripts
├── tests/                 # Unit tests (Vitest)
├── .github/workflows/     # CI/CD GitHub Actions
├── capacitor.config.ts    # Konfigurasi Capacitor
├── vite.config.ts         # Konfigurasi Vite
└── package.json
```

---

## 📋 Daftar Script

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan aplikasi Desktop (Electron) |
| `npm run dev:mobile` | Jalankan dev server untuk Mobile |
| `npm run android:open` | Buka project Android di Android Studio |
| `npm run android:sync` | Sync web build ke Android |
| `npm run android:debug` | Build APK debug |
| `npm run android:release` | Build APK release |
| `npm run build:desktop:windows` | Build installer Windows |
| `npm run build:desktop:linux` | Build installer Linux |
| `npm run typecheck` | Cek TypeScript |
| `npm run test` | Jalankan unit tests |

---

## ❓ Troubleshooting

### Error: `pnpm: command not found`
```bash
npm install -g pnpm
```

### Error: `Gradle sync failed` di Android Studio
- Pastikan JDK 17+ terinstal: `java --version`
- Di Android Studio: **File → Project Structure → SDK Location** → cek JDK path
- Klik **Sync Project with Gradle Files** di toolbar

### HP tidak terdeteksi di Android Studio
- Pastikan **USB Debugging** aktif di HP
- Coba cabut dan pasang ulang kabel USB
- Ganti mode USB ke **"Transfer File (MTP)"**
- Jalankan: `adb devices` untuk cek koneksi

### Error: `INSTALL_FAILED_OLDER_SDK`
- HP Android minimum **Android 8.0 (API 26)**

### Aplikasi tidak bisa login / database error
- Hapus file `sistem_pos.db` di root folder proyek
- Restart aplikasi → akan muncul Setup Akun baru

---

## 🔒 Keamanan

- File `.env` dan `.keys/` tidak di-commit ke Git
- Database SQLite tersimpan lokal di perangkat pengguna
- Semua IPC channel Electron divalidasi via whitelist di `preload.cjs`
- Context isolation aktif di Electron

---

## 📄 Lisensi

MIT License © 2026 [WalZetass-Kar](https://github.com/WalZetass-kar)

---

## 👨‍💻 Developer

**WalZetass-Kar**
- GitHub: [@WalZetass-kar](https://github.com/WalZetass-kar)
- Repository: [LCC-Web-Design](https://github.com/WalZetass-kar/LCC-Web-Design)
