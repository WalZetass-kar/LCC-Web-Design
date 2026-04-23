# MediaSoft POS WalDevelop

Aplikasi Point of Sale (POS) desktop modern yang dibangun dengan Electron, React, dan SQLite.

![MediaSoft POS](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Fitur

- Authentication - Login dengan role-based access (Admin & Kasir)
- Dashboard - Statistik penjualan dan produk terlaris
- Manajemen Produk - CRUD produk dengan kategori
- Transaksi - Point of Sale dengan keranjang belanja
- Riwayat Transaksi - Daftar dan detail transaksi
- Theme Switcher - 6 pilihan tema profesional
- Search & Filter - Pencarian dan filter data
- Responsive Design - UI modern dengan glass effect

## Cara Menggunakan

### Untuk Developer (Development)

#### Mode Browser
```bash
npm install
npm run dev:vite
```
Akses di: http://localhost:5173/

#### Mode Electron Desktop
```bash
npm install
npm run dev
```
**Note:** Electron crash di headless Linux, gunakan mode browser.

### Untuk User Akhir (Production)

User tidak perlu install Node.js atau dependencies. Mereka hanya perlu:

1. **Download installer** sesuai OS mereka:
   - Windows: `MediaSoft POS Setup.exe`
   - macOS: `MediaSoft POS.dmg`
   - Linux: `MediaSoft POS.AppImage`

2. **Install/Jalankan aplikasi**
   - Windows: Double-click .exe
   - macOS: Drag ke Applications
   - Linux: chmod +x dan jalankan

3. **Login** dengan kredensial default

### Build untuk Production

#### Build Windows
```bash
npm run build:win
```

#### Build macOS
```bash
npm run build:mac
```

#### Build Linux
```bash
npm run build:linux
```

Output: `dist-electron/`

**Lihat PANDUAN_BUILD.md untuk panduan lengkap.**

## Login Default

**Admin:**
- Username: `admin`
- Password: `admin123`

**Kasir:**
- Username: `kasir1`
- Password: `kasir123`

## Tech Stack

### Frontend
- **React 18** - UI Library
- **React Router** - Routing
- **Tailwind CSS** - Styling dengan glass effect
- **TanStack Table** - Data table dengan sorting & filtering

### Backend
- **Electron** - Desktop wrapper
- **SQLite** - Database
- **Drizzle ORM** - Type-safe ORM
- **Better-SQLite3** - SQLite driver

### Architecture
- **MVC Pattern** - Model-View-Controller
- **OOP** - Object-Oriented Programming dengan static methods
- **IPC Communication** - Inter-Process Communication antara Electron & React

## 📁 Struktur Project

```
mediasoft-pos-waldevelop/
├── backend/
│   ├── controllers/          # Business logic (OOP Class static)
│   │   ├── AuthController.js
│   │   ├── ProductController.js
│   │   ├── CategoryController.js
│   │   └── TransactionController.js
│   ├── models/               # Database schema (Drizzle)
│   │   └── schema.js
│   └── database/             # Database config & seeding
│       ├── connection.js
│       ├── migrate.js
│       └── seed.js
├── main/                     # Electron main process
│   ├── ipc/                  # IPC handlers
│   │   ├── AuthHandler.js
│   │   ├── ProductHandler.js
│   │   ├── CategoryHandler.js
│   │   ├── TransactionHandler.js
│   │   └── DatabaseHandler.js
│   ├── main.js               # Main process entry
│   └── preload.js            # Preload script (context bridge)
├── src/                      # React frontend
│   ├── components/           # Reusable components
│   │   ├── ui/               # UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Table.jsx
│   │   └── layout/           # Layout components
│   │       ├── MainLayout.jsx
│   │       ├── Sidebar.jsx
│   │       └── Topbar.jsx
│   ├── pages/                # Application pages
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ProductsPage.jsx
│   │   ├── TransactionPage.jsx
│   │   ├── HistoryPage.jsx
│   │   └── SettingsPage.jsx
│   ├── context/              # React Context
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🗄️ Database Schema

### Users
- id, username, password, full_name, role, is_active, created_at, updated_at

### Categories
- id, name, description, is_active, created_at, updated_at

### Products
- id, category_id, code, name, description, price, stock, unit, is_active, created_at, updated_at

### Transactions
- id, invoice_number, user_id, total_amount, payment_amount, change_amount, payment_method, notes, transaction_date, created_at

### Transaction Details
- id, transaction_id, product_id, product_name, quantity, price, subtotal, created_at

## 🚀 Instalasi & Setup

### Prerequisites
- Node.js v18+ 
- npm v9+

### Langkah Instalasi

1. **Clone atau extract project**
```bash
cd mediasoft-pos-waldevelop
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
node backend/database/migrate.js
```

4. **Run development**
```bash
npm run dev
```

Aplikasi akan terbuka secara otomatis di Electron window.

## 👤 Demo Credentials

### Admin
- Username: `admin`
- Password: `admin123`

### Kasir
- Username: `kasir1`
- Password: `kasir123`

## 🎨 Fitur UI

### Glass Effect Design
- Background gradient dengan blur effect
- Transparent cards dengan backdrop filter
- Smooth animations dan transitions
- Modern color palette

### Theme Switcher
Tersedia 4 tema warna:
- 🔵 Biru (Default)
- 🟣 Ungu
- 🟢 Hijau
- 🔴 Merah

Ubah tema di menu **Pengaturan**.

## 📝 Cara Penggunaan

### 1. Login
- Masukkan username dan password
- Klik tombol Login

### 2. Dashboard
- Lihat statistik penjualan bulan ini
- Monitor produk terlaris

### 3. Manajemen Produk
- Tambah produk baru dengan kategori
- Edit atau hapus produk
- Search dan filter produk

### 4. Transaksi
- Pilih produk untuk ditambahkan ke keranjang
- Atur jumlah quantity
- Checkout dan input pembayaran
- Sistem otomatis menghitung kembalian

### 5. Riwayat Transaksi
- Lihat semua transaksi
- Filter dan search transaksi
- Lihat detail transaksi

### 6. Pengaturan
- Ubah tema warna aplikasi
- Reset database (hati-hati!)

## 🏗️ Arsitektur

### MVC Pattern

**Model** (`backend/models/`)
- Schema database menggunakan Drizzle ORM
- Representasi struktur data

**Controller** (`backend/controllers/`)
- Business logic dengan OOP (Class static methods)
- Handle CRUD operations
- Validasi data

**View** (`src/pages/` & `src/components/`)
- React components
- UI/UX layer

### IPC Communication

```
React (Renderer) → IPC → Electron Main → Controller → Database
                  ←     ←              ←            ←
```

1. React memanggil `window.electronAPI.*`
2. Preload script meneruskan ke IPC
3. IPC Handler memanggil Controller
4. Controller mengakses Database via Drizzle ORM
5. Response dikembalikan ke React

## 🔧 Development

### Build untuk Production
```bash
npm run build
npm run build:electron
```

### Struktur Build
```
dist-electron/
├── win-unpacked/          # Windows build
├── mac/                   # macOS build
└── linux-unpacked/        # Linux build
```

## 📦 Dependencies

### Production
- `@tanstack/react-table` - Data table
- `better-sqlite3` - SQLite driver
- `drizzle-orm` - ORM
- `react` & `react-dom` - UI library
- `react-router-dom` - Routing

### Development
- `electron` - Desktop framework
- `vite` - Build tool
- `tailwindcss` - CSS framework
- `drizzle-kit` - ORM toolkit
- `concurrently` - Run multiple commands

## 🎯 Best Practices

✅ **Clean Code**
- Modular components
- Reusable functions
- Clear naming conventions

✅ **Scalable Architecture**
- Separation of concerns (MVC)
- OOP principles
- Type-safe database queries

✅ **Modern Development**
- ES6+ syntax
- Async/await
- React Hooks

✅ **Security**
- Context isolation in Electron
- No direct Node.js access from renderer
- Secure IPC communication

## 🐛 Troubleshooting

### Database tidak terbuat
```bash
node backend/database/migrate.js
```

### Port 5173 sudah digunakan
Ubah port di `vite.config.js`:
```js
server: {
  port: 5174 // Ganti port
}
```

### Electron tidak terbuka
```bash
# Jalankan terpisah
npm run dev:vite
# Di terminal lain
npm run dev:electron
```

## 📄 License

MIT License - Copyright (c) 2026 WalZetass-Kar

## 👨‍💻 Developer

**WalZetass-Kar**
- Aplikasi POS modern dengan teknologi terkini
- Built with ❤️ using Electron + React

## 🙏 Credits

- **Electron** - Desktop framework
- **React** - UI library
- **Tailwind CSS** - Styling
- **Drizzle ORM** - Database ORM
- **TanStack Table** - Data table

---

**MediaSoft POS WalZetass-Kar v1.0.0**

Untuk pertanyaan atau dukungan, silakan hubungi developer.
