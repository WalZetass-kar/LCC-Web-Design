# Panduan Build Aplikasi Desktop

## Untuk Developer (Development Mode)

### Menjalankan Aplikasi di Browser
```bash
npm run dev:vite
```
Akses di: http://localhost:5173/

### Menjalankan Aplikasi Electron (Desktop)
```bash
npm run dev
```
Ini akan menjalankan Vite + Electron secara bersamaan.

**Note:** Di environment headless Linux, Electron akan crash. Gunakan browser mode untuk development.

---

## Untuk User Akhir (Production Build)

User akhir akan mendapatkan file installer (.exe, .dmg, .AppImage) yang bisa langsung dijalankan sebagai aplikasi desktop.

### Build untuk Windows (.exe)
```bash
npm run build:win
```
Output: `dist-electron/MediaSoft POS Setup 1.0.0.exe`

### Build untuk macOS (.dmg)
```bash
npm run build:mac
```
Output: `dist-electron/MediaSoft POS-1.0.0.dmg`

### Build untuk Linux (.AppImage)
```bash
npm run build:linux
```
Output: `dist-electron/MediaSoft POS-1.0.0.AppImage`

### Build untuk Semua Platform
```bash
npm run build:electron
```

---

## Struktur Build

### Yang Ter-include dalam Build:
1. **Frontend (React)** - Sudah di-compile ke `dist/`
2. **Backend (Controllers, Models)** - Folder `backend/`
3. **Electron Main Process** - Folder `main/`
4. **Database** - File `sistem_pos.db`
5. **Node Modules** - Dependencies yang diperlukan

### File yang Dihasilkan:

#### Windows:
- `MediaSoft POS Setup 1.0.0.exe` - Installer
- User tinggal double-click untuk install
- Aplikasi akan muncul di Start Menu

#### macOS:
- `MediaSoft POS-1.0.0.dmg` - Disk Image
- User drag & drop ke Applications folder
- Aplikasi muncul di Launchpad

#### Linux:
- `MediaSoft POS-1.0.0.AppImage` - Portable executable
- User tinggal chmod +x dan jalankan
- Atau install .deb package

---

## Cara Distribusi ke User

### Opsi 1: Direct Download
1. Build aplikasi sesuai platform target
2. Upload file installer ke server/cloud storage
3. Berikan link download ke user
4. User download dan install

### Opsi 2: USB/Flash Drive
1. Build aplikasi
2. Copy file installer ke USB
3. Berikan USB ke user
4. User install dari USB

### Opsi 3: Network Share
1. Build aplikasi
2. Simpan di network share/folder bersama
3. User akses dan install dari network

---

## Perbedaan Development vs Production

### Development Mode (Browser)
- URL: http://localhost:5173/
- Hot reload aktif
- Mock API (data in-memory)
- Developer tools terbuka
- Tidak perlu install

### Production Mode (Electron Desktop)
- Aplikasi standalone (.exe/.dmg/.AppImage)
- Database SQLite real
- Tidak perlu browser
- Tidak perlu internet
- Data persistent
- Performa lebih baik

---

## Instalasi untuk User Akhir

### Windows:
1. Double-click `MediaSoft POS Setup 1.0.0.exe`
2. Ikuti wizard instalasi
3. Aplikasi akan muncul di Start Menu
4. Klik untuk menjalankan

### macOS:
1. Double-click `MediaSoft POS-1.0.0.dmg`
2. Drag icon ke Applications folder
3. Buka Applications
4. Klik MediaSoft POS untuk menjalankan

### Linux:
1. Download `MediaSoft POS-1.0.0.AppImage`
2. Buka terminal di folder download
3. Jalankan: `chmod +x MediaSoft\ POS-1.0.0.AppImage`
4. Double-click atau jalankan: `./MediaSoft\ POS-1.0.0.AppImage`

---

## Login Default

Setelah aplikasi terbuka, gunakan kredensial berikut:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Kasir:**
- Username: `kasir1`
- Password: `kasir123`

---

## Troubleshooting Build

### Error: electron-builder not found
```bash
npm install
```

### Error: Cannot find module
Pastikan semua dependencies ter-install:
```bash
rm -rf node_modules
npm install
```

### Build gagal di Linux
Install dependencies:
```bash
sudo apt-get install -y rpm
```

### Build gagal di macOS
Pastikan Xcode Command Line Tools ter-install:
```bash
xcode-select --install
```

---

## Ukuran File

Estimasi ukuran installer:
- Windows: ~150-200 MB
- macOS: ~150-200 MB
- Linux: ~150-200 MB

Ukuran besar karena include:
- Electron runtime
- Chromium engine
- Node.js runtime
- React libraries
- SQLite database

---

## Update Aplikasi

Untuk update aplikasi:
1. Build versi baru dengan version number lebih tinggi
2. Distribusikan installer baru ke user
3. User uninstall versi lama (opsional)
4. User install versi baru

**Note:** Database akan tetap ada jika user tidak uninstall.

---

## Keamanan

### Data User:
- Database disimpan lokal di komputer user
- Tidak ada koneksi internet yang diperlukan
- Data tidak dikirim ke server manapun
- Password di-hash dengan bcrypt

### Distribusi:
- Pastikan download dari sumber terpercaya
- Verifikasi checksum file jika diperlukan
- Scan dengan antivirus sebelum install

---

## Support

Jika user mengalami masalah:
1. Pastikan sistem memenuhi minimum requirements
2. Coba restart aplikasi
3. Coba reinstall aplikasi
4. Hubungi developer (WalDevelop)

## Minimum Requirements

- **OS**: Windows 10+, macOS 10.13+, Ubuntu 18.04+
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space
- **Display**: 1024x768 minimum resolution
