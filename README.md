# MediaSoft POS Workspace

Workspace monorepo untuk MediaSoft POS yang terdiri dari 2 aplikasi terpisah:

## 📦 Aplikasi

### 1. MediaSoft POS User (`packages/mediasoft-pos-user/`)
Aplikasi Point of Sale untuk kasir, admin toko, dan pemilik usaha.

**Platform:** Desktop (Windows, Linux, macOS) + Mobile (Android, iOS)

**Port:** `5173`

**Fitur:**
- Dashboard & Statistik
- POS/Kasir
- Manajemen Produk & Kategori
- Stok Barang
- Supplier & Pelanggan
- Pembelian & Penjualan
- Retur & Pengeluaran
- Laporan & Export
- WhatsApp Integration
- Print Queue
- Backup Data

### 2. MediaSoft Developer Panel (`packages/mediasoft-developer-panel/`)
Aplikasi khusus untuk developer dan super admin sistem.

**Platform:** Desktop only (Windows, Linux, macOS)

**Port:** `5174`

**Fitur:**
- **License Management** - Aktivasi, suspend, revoke license
- **User Management** - Suspend/activate user accounts
- **Plan Management** - Change subscription plans
- Database Management
- API Management
- E-Commerce API Integration
- Security Management
- System Monitoring
- Activity Logs
- Backup & Restore
- Developer Tools

## 🔗 Komunikasi Antar Aplikasi

Developer Panel dapat **mengontrol** User Panel melalui:

1. **License Control**
   - Aktivasi/suspend/revoke license
   - User Panel akan ter-block jika license invalid
   - Auto-check license setiap 5 menit

2. **User Control**
   - Suspend/activate user accounts
   - User yang di-suspend tidak bisa login

3. **Plan Management**
   - Change plan (free, basic, pro, enterprise)
   - Set limits (max users, max products)
   - Enable/disable features

Lihat dokumentasi lengkap di [`docs/CROSS_APP_COMMUNICATION.md`](docs/CROSS_APP_COMMUNICATION.md)

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
# Run User Panel
pnpm dev:user

# Run Developer Panel
pnpm dev:developer
```

### Build

```bash
# Build User Panel
pnpm build:user

# Build Developer Panel
pnpm build:developer
```

### Build Desktop

```bash
# User Panel - Windows
pnpm build:user:windows

# User Panel - Linux
pnpm build:user:linux

# User Panel - macOS
pnpm build:user:mac

# Developer Panel - Windows
pnpm build:developer:windows

# Developer Panel - Linux
pnpm build:developer:linux

# Developer Panel - macOS
pnpm build:developer:mac
```

## 📁 Struktur Project

```
mediasoft-pos-workspace/
├── packages/
│   ├── shared-lib/              # Shared code (database, types, utils)
│   ├── mediasoft-pos-user/      # User Panel application
│   └── mediasoft-developer-panel/ # Developer Panel application
├── docs/
│   ├── REFACTOR_ANALYSIS.md     # Analisis refactor
│   ├── REFACTOR_GUIDE.md        # Panduan refactor
│   └── CROSS_APP_COMMUNICATION.md # Komunikasi antar aplikasi
├── pnpm-workspace.yaml
└── package.json
```

## 🔐 Security

- Developer Panel hanya bisa diakses oleh role `developer` dan `super_admin`
- User Panel ter-block otomatis jika license invalid/expired/suspended
- Shared database dengan access control di level aplikasi
- Semua perubahan dari Developer Panel langsung affect User Panel

## 📚 Dokumentasi

- [Analisis Refactor](docs/REFACTOR_ANALYSIS.md)
- [Panduan Refactor](docs/REFACTOR_GUIDE.md)
- [Komunikasi Antar Aplikasi](docs/CROSS_APP_COMMUNICATION.md)
- [User Panel README](packages/mediasoft-pos-user/README.md)
- [Developer Panel README](packages/mediasoft-developer-panel/README.md)

## 🎯 Use Cases

### Developer/Super Admin
1. Install & run **Developer Panel**
2. Manage licenses untuk semua user
3. Suspend/activate user accounts
4. Change subscription plans
5. Monitor system & activity logs

### Kasir/Admin Toko
1. Install & run **User Panel**
2. Login dengan akun yang diberikan admin
3. Gunakan fitur POS, produk, laporan, dll
4. License akan di-check otomatis

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS
- **Backend:** Electron 31, SQLite, Drizzle ORM
- **Build:** Vite, Electron Builder
- **Mobile:** Capacitor (User Panel only)
- **Workspace:** pnpm workspaces

## 📄 License

MIT License

## 👨‍💻 Author

MediaSoft POS by Zetass
