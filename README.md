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
- Search produk real-time
- Keranjang belanja dengan qty control
- Metode pembayaran (Tunai/Transfer)
- Perhitungan otomatis (subtotal, diskon, kembalian)
- Cetak struk transaksi
- Riwayat transaksi lengkap

### 📦 Manajemen Produk
- CRUD produk lengkap
- Kategori & satuan produk
- Harga jual & harga modal
- Diskon per produk
- Stok management
- Barcode support (coming soon)
- Expired date tracking (coming soon)
- Search & filter advanced

### 🚚 Supplier Management ⭐ NEW
- CRUD supplier
- Kontak supplier (telp, email, alamat)
- Status aktif/nonaktif
- Riwayat pembelian per supplier

### 👥 Customer Management ⭐ NEW (Coming Soon)
- CRUD customer
- Loyalty poin system
- Total belanja customer
- Riwayat pembelian
- Birthday reminder

### 💵 Kas Management ⭐ NEW (Coming Soon)
- Buka/tutup kas
- Modal awal kasir
- Pencatatan pengeluaran
- Rekonsiliasi kas
- Laporan selisih kas

### 👤 User Management ⭐ NEW (Coming Soon)
- CRUD user
- Role-based access (ADMIN, KASIR, OWNER)
- Change password
- Reset password
- Status aktif/nonaktif
- Activity log

### 📈 Laporan & Export ⭐ NEW (Coming Soon)
- Laporan penjualan (harian, bulanan, tahunan)
- Laporan laba rugi
- Laporan stok barang
- Laporan kas
- Export to Excel
- Export to PDF
- Print laporan

### 🔔 Notifikasi System ⭐ NEW (Coming Soon)
- Notifikasi stok menipis
- Notifikasi produk expired
- Notifikasi system
- Badge unread count
- Mark as read

### 💾 Backup & Restore ⭐ NEW (Coming Soon)
- Backup database manual
- Auto backup scheduler
- Restore dari backup
- Download backup file
- Riwayat backup

### ⚙️ Settings
- Identitas toko
- Theme switcher (Light/Dark)
- Color themes (Indigo, Emerald, Rose, Amber, Sky)
- Pengaturan pajak (coming soon)

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm atau yarn
- SQLite3

### Installation

1. **Clone repository**
```bash
git clone https://github.com/yourusername/mediasoft-pos.git
cd mediasoft-pos
```

2. **Install dependencies**
```bash
npm install
```

3. **Rebuild native modules**
```bash
npx electron-rebuild
```

4. **Setup database**
```bash
# Jalankan SQL script untuk membuat tabel baru
sqlite3 sistem_pos.db < CREATE_NEW_TABLES.sql
```

5. **Run development**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

---

## 🔐 Default Login

**Username:** `admin`  
**Password:** `admin`

> ⚠️ **PENTING:** Segera ubah password default setelah login pertama kali!

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

- Password hashing dengan SHA1
- Session management
- Protected routes
- Role-based access control
- Activity logging
- Secure IPC communication

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

- [FITUR_LENGKAP.md](./FITUR_LENGKAP.md) - Dokumentasi lengkap semua fitur
- [CHANGELOG.md](./CHANGELOG.md) - Changelog & update history
- [PASSWORD_INFO.md](./PASSWORD_INFO.md) - Info login & password
- [CREATE_NEW_TABLES.sql](./CREATE_NEW_TABLES.sql) - SQL script untuk tabel baru

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

**MediaSoft POS by Ihwal**

Developed with ❤️ using Kiro AI Assistant

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
