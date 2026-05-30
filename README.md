# 🏪 MediaSoft POS - Point of Sale System

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/electron-30.0.6-47848F.svg)
![React](https://img.shields.io/badge/react-18.3.1-61DAFB.svg)

**MediaSoft POS** adalah aplikasi Point of Sale (POS) desktop modern yang dibangun dengan Electron, React, TypeScript, dan SQLite. Aplikasi ini dirancang untuk memudahkan pengelolaan toko retail dengan fitur lengkap dan UI yang modern.

---

## ✨ Fitur Utama

### 📊 Dashboard
- Statistik penjualan real-time (hari ini, minggu ini, bulan ini)
- Grafik penjualan 7 hari terakhir
- Alert stok menipis
- Total produk terdaftar
- Quick action ke transaksi

### 💰 Transaksi Penjualan (POS)
- Interface kasir yang intuitif
- **Barcode Scanner Support** ⭐ NEW
- Search produk real-time
- Keranjang belanja dengan qty control
- **Multi-Payment** (Tunai/Transfer/Kartu/E-Wallet/QRIS) ⭐ NEW
- Perhitungan otomatis (subtotal, diskon, pajak, kembalian)
- **Diskon per transaksi** ⭐ NEW
- Cetak struk transaksi
- Riwayat transaksi lengkap

### 📦 Manajemen Produk
- CRUD produk lengkap
- Kategori & satuan produk
- Harga jual & harga modal
- Diskon per produk
- Stok management
- **Barcode support** ⭐ NEW
- **Expired date tracking** ⭐ NEW
- **Image upload** ⭐ NEW
- Search & filter advanced

### 🚚 Supplier Management ⭐
- CRUD supplier
- Kontak supplier (telp, email, alamat)
- Status aktif/nonaktif
- Riwayat pembelian per supplier

### 👥 Customer Management ⭐
- CRUD customer
- Loyalty poin system
- Total belanja customer
- Riwayat pembelian
- Birthday reminder

### 💵 Kas Management ⭐
- Buka/tutup kas
- Modal awal kasir
- Pencatatan pengeluaran
- Rekonsiliasi kas
- Laporan selisih kas

### ⏰ Shift Management ⭐ NEW
- Buka/tutup shift kasir
- Modal awal & akhir shift
- Laporan penjualan per shift
- Tracking selisih kas
- Handover shift

### 💸 Hutang & Piutang ⭐ NEW
- Tracking hutang customer
- Tracking piutang supplier
- Cicilan & pembayaran
- Reminder jatuh tempo
- Laporan hutang/piutang

### 🔄 Return & Refund ⭐ NEW
- Return barang dari customer
- Refund uang (tunai/transfer/store credit)
- Approval system
- Retur ke supplier
- Laporan return

### 📋 Stok Opname ⭐ NEW
- Input stok fisik
- Selisih stok (system vs fisik)
- Adjustment otomatis
- Approval system
- Laporan opname

### 👤 User Management ⭐
- CRUD user
- Role-based access (ADMIN, KASIR, OWNER)
- Change password
- Reset password
- Status aktif/nonaktif
- Activity log

### 📈 Laporan & Export ⭐
- Laporan penjualan (harian, bulanan, tahunan)
- Laporan laba rugi
- Laporan stok barang
- Laporan kas
- Export to Excel
- Export to PDF
- Print laporan

### 🔔 Notifikasi System ⭐
- Notifikasi stok menipis
- Notifikasi produk expired
- Notifikasi system
- Badge unread count
- Mark as read

### 💾 Backup & Restore ⭐
- Backup database manual
- Auto backup scheduler
- Restore dari backup
- Download backup file
- Riwayat backup

### ⌨️ Keyboard Shortcuts ⭐ NEW
- F1-F10 untuk navigasi cepat
- Ctrl+K untuk quick search
- ESC untuk close modal
- Boost produktivitas kasir

### 🔍 Quick Search ⭐ NEW
- Command palette (Ctrl+K)
- Search menu & fitur
- Keyboard navigation
- Quick actions

### 🎓 Tutorial & Onboarding ⭐ NEW
- Welcome wizard
- Feature tour
- Help tooltips
- First-time user guide

### 🔄 Auto Update ⭐ NEW
- Check update otomatis
- Download & install update
- Release notes
- Critical update notification

### 📊 Dashboard Enhancements ⭐ NEW
- Real-time statistics
- Sales charts
- Low stock alerts
- Quick actions

### ⚙️ Settings
- Identitas toko
- Theme switcher (Light/Dark)
- Color themes (Indigo, Emerald, Rose, Amber, Sky)
- **Pengaturan pajak** ⭐ NEW
- **Barcode settings** ⭐ NEW
- **Sinkronisasi multi-device** ⭐ NEW
  - 1 aplikasi desktop developer sebagai server pusat
  - Android dan desktop Windows/macOS/Linux bisa menjadi client
  - Pairing via URL + token/QR
  - Daftar device terhubung, request terakhir, dan channel terakhir

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm atau yarn
- SQLite3

### Installation

1. **Clone repository**
```bash
git clone https://github.com/WalZetass-Kar/LCC-Web-Design
cd LCC-Web-Design
```

2. **Install dependencies**
```bash
npm install
```

3. **Rebuild native modules**
```bash
npx electron-rebuild
```

4. **Database**

Saat development, aplikasi memakai file `sistem_pos.db` di root project. Jika database belum ada, siapkan file SQLite tersebut terlebih dahulu atau jalankan migrasi/schema internal yang sesuai sebelum membuka aplikasi. File database, backup, export, log, dan build output sudah masuk `.gitignore`.

5. **Run development**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

### Build File Installer

Output build disimpan di folder `release/`.

```bash
# Windows app .exe + zip
npm run desktop:win

# Windows installer NSIS (.exe setup)
# Di Linux butuh wine32/i386; paling aman dijalankan di Windows.
npm run desktop:win:installer

# Linux AppImage
npm run desktop:linux

# macOS package (jalankan di macOS untuk hasil final terbaik)
npm run desktop:mac

# Android APK debug
npm run android:debug

# Android APK release
npm run android:release
```

File Windows hasil build utama:

```text
release/win-unpacked/MediaSoft POS Zetass v2.0.exe
release/MediaSoft POS Zetass v2.0-2.0.0-win.zip
```

### Mode Multi-Device

Gunakan 1 desktop sebagai **Server Developer** di halaman Settings > Sinkronisasi Multi-Device. Device lain memilih **Client Device**, lalu isi/paste data pairing dari server.

- Server developer menyimpan database utama dan membuka endpoint sync LAN.
- Client Android dan desktop mengirim operasi aplikasi ke server developer.
- URL sync mendukung `http://192.168.x.x:38573` untuk LAN privat atau HTTPS untuk domain produksi.
- Token sync harus disimpan seperti password.

---

## 🔐 Login Awal

Saat database belum memiliki pengguna, aplikasi menampilkan setup awal untuk membuat akun developer pertama. Tidak ada kredensial default yang disimpan di source code.

> ⚠️ **PENTING:**
> - Gunakan password kuat: minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol.
> - Password akun baru atau password hasil reset wajib diganti saat login pertama.
> - Jangan menyimpan password user di dokumentasi, source code, atau file konfigurasi.

---

## 📁 Project Structure

```
mediasoft-pos/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry point
│   │   ├── preload.cjs      # Preload script (CommonJS)
│   │   └── ipcHandlers.ts   # IPC handlers
│   ├── backend/             # Backend logic
│   │   ├── controllers/     # Business logic
│   │   ├── models/          # Database models
│   │   └── services/        # Services (crypto, etc)
│   ├── database/            # Database
│   │   ├── connection.ts    # SQLite connection
│   │   └── schema.ts        # Drizzle ORM schema
│   ├── renderer/            # React frontend
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   ├── styles/          # Global styles
│   │   ├── utils/           # Utility functions
│   │   └── main.tsx         # React entry point
│   └── shared/              # Shared types
│       └── types.ts         # TypeScript interfaces
├── dist/                    # Vite build output
├── dist-electron/           # Electron build output
├── sistem_pos.db            # SQLite database
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **React Router** - Routing
- **TanStack Table** - Data tables
- **Lucide React** - Icons
- **React to Print** - Print struk

### Backend
- **Electron 30** - Desktop framework
- **SQLite** - Database
- **Drizzle ORM** - Type-safe ORM
- **Better SQLite3** - SQLite driver

### Build Tools
- **Vite** - Build tool
- **Electron Builder** - Package app
- **TypeScript** - Compiler

---

## 📝 Development

### Available Scripts

```bash
# Development
npm run dev              # Run dev server (Vite + Electron)
npm run dev:vite         # Run Vite only
npm run dev:electron     # Run Electron only

# Build
npm run build            # Build for production
npm run build:vite       # Build Vite only
npm run build:electron   # Build Electron only

# Quality checks
npm run typecheck        # Type-check renderer and Electron/backend code
npm run test             # Run unit/security regression tests
npm run check            # Run typecheck and tests

# Database
npx drizzle-kit generate # Generate migrations
npx drizzle-kit push     # Push schema to database
```

### Rebuild Native Modules

Jika ada error `NODE_MODULE_VERSION` mismatch:

```bash
npm rebuild better-sqlite3
# atau
npx electron-rebuild
```

---

## 🎨 UI/UX Features

- ✅ Modern gradient design
- ✅ Glass morphism effect
- ✅ Smooth animations
- ✅ Responsive layout
- ✅ Dark mode support
- ✅ Multiple color themes
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling
- ✅ Toast notifications

---

## 🔒 Security

- ✅ **Bcrypt password hashing** (cost factor 12) with SHA1 migration
- ✅ **Rate limiting** - 5 attempts, 15-minute lockout
- ✅ **Session management** - 30-minute inactivity timeout
- ✅ **Input sanitization** - XSS & SQL injection prevention
- ✅ **Safe tutorial rendering** - Markdown-like content rendered without raw HTML injection
- ✅ **Password strength validation** - Min 8 chars, uppercase, lowercase, number
- ✅ **Encrypted local storage** - session, remember-me username, queues, and Android offline data are AES-256 encrypted
- ✅ **Centralized error handling** - Structured logging with severity levels
- ✅ **React Error Boundary** - Graceful error recovery
- ✅ **AES-256 encryption** - For sensitive data
- ✅ **Activity logging** - All auth attempts and data modifications
- ✅ **Protected routes & admin IPC guard** - Admin channels are blocked server-side for non-privileged users
- ✅ **Secure IPC communication** - Input validation on all channels
- ✅ **IPC whitelist regression test** - Registered handlers must also be exposed in preload whitelist

### Security Notes

- Jangan menyimpan password user di storage browser, file konfigurasi, atau dokumentasi.
- Channel IPC baru harus didaftarkan di `src/main/ipcHandlers.ts` dan `src/main/preload.cjs`; `tests/ipcChannels.test.ts` akan gagal jika keduanya tidak sinkron.
- Endpoint administrasi seperti user management, backup, security, ecommerce API, dan activity log dibatasi ke role lokal `developer` di main process.

---

## 📊 Database Schema

Aplikasi menggunakan SQLite dengan tabel-tabel berikut:

- `mediasoft_pengguna` - User accounts
- `mediasoft_barang` - Products
- `mediasoft_kategori_barang` - Categories
- `mediasoft_satuan` - Units
- `mediasoft_harga` - Prices
- `mediasoft_penjualan` - Sales transactions
- `mediasoft_penjualan_detail` - Sales details
- `mediasoft_supplier` - Suppliers
- `mediasoft_customer` - Customers
- `mediasoft_kas_drawer` - Cash drawer
- `mediasoft_kas_transaksi` - Cash transactions
- `mediasoft_notifikasi` - Notifications
- `mediasoft_backup` - Backup history
- `mediasoft_pembelian` - Purchases
- `mediasoft_pembelian_detail` - Purchase details
- `mediasoft_activity_log` - Activity logs
- `mediasoft_identitas` - Store identity

---

## 🐛 Troubleshooting

### Error: window.api is undefined
```bash
# Pastikan preload script menggunakan .cjs extension
# File: src/main/preload.cjs
```

### Error: NODE_MODULE_VERSION mismatch
```bash
npx electron-rebuild
```

### Error: Database locked
```bash
# Tutup semua koneksi database
# Restart aplikasi
```

---

## 📚 Documentation

- `README.md` - Dokumentasi utama project
- `src/database/schema.ts` - Definisi schema Drizzle
- `src/database/connection.ts` - Koneksi SQLite dan migrasi startup
- `src/main/ipcHandlers.ts` - Daftar handler IPC main process
- `src/main/preload.cjs` - Whitelist channel IPC yang boleh dipanggil renderer

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**MediaSoft POS by Zetass**

Developed with ❤️ by Zetass Development Team

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Lucide Icons](https://lucide.dev/)

---

## 📞 Support

Jika ada pertanyaan atau butuh bantuan, silakan buka issue di GitHub atau hubungi developer.

---

**⭐ Jangan lupa beri star jika project ini membantu!**
