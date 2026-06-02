# Analisis Refactor: Pemisahan User Panel dan Developer Panel

## Status Saat Ini

Project saat ini adalah **monolith application** dengan:
- Single `package.json` dengan semua dependencies
- Single build process untuk semua platform (Desktop: Windows/Linux/macOS, Mobile: Android/iOS)
- Routing berbasis `/app` (User Panel) dan `/developer` (Developer Panel)
- Shared source code di `src/renderer`, `src/main`, `src/backend`
- Struktur awal pemisahan di `src/apps/user-panel` dan `src/apps/developer-panel` (hanya routing)

## Arsitektur Target

### Struktur Folder Baru

```
LCC-Web-Design/
├── packages/
│   ├── shared-lib/                    # Shared library
│   │   ├── src/
│   │   │   ├── types/                 # Shared types
│   │   │   ├── utils/                 # Shared utilities
│   │   │   ├── components/            # Shared UI components
│   │   │   ├── database/              # Database schema & connection
│   │   │   ├── services/              # Shared services
│   │   │   └── config/                # Shared config (RBAC, etc)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mediasoft-pos-user/            # User Panel Application
│   │   ├── src/
│   │   │   ├── main/                  # Electron main process
│   │   │   ├── renderer/              # React frontend
│   │   │   │   ├── pages/             # User Panel pages
│   │   │   │   ├── components/        # User-specific components
│   │   │   │   ├── contexts/          # User contexts
│   │   │   │   ├── hooks/             # User hooks
│   │   │   │   └── utils/             # User utilities
│   │   │   ├── backend/               # Backend controllers for User Panel
│   │   │   │   ├── controllers/       # POS, Produk, Transaksi, dll
│   │   │   │   ├── services/          # User services
│   │   │   │   └── middleware/        # User middleware
│   │   │   └── platform/              # Platform-specific code
│   │   │       ├── desktop/           # Electron-specific
│   │   │       └── mobile/            # Capacitor-specific
│   │   ├── android/                   # Android project
│   │   ├── ios/                       # iOS project
│   │   ├── build/                     # Build resources
│   │   ├── public/                    # Public assets
│   │   ├── package.json               # User Panel dependencies
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── capacitor.config.ts
│   │   └── electron-builder.json
│   │
│   └── mediasoft-developer-panel/     # Developer Panel Application
│       ├── src/
│       │   ├── main/                  # Electron main process
│       │   ├── renderer/              # React frontend
│       │   │   ├── pages/             # Developer Panel pages
│       │   │   ├── components/        # Developer-specific components
│       │   │   ├── contexts/          # Developer contexts
│       │   │   ├── hooks/             # Developer hooks
│       │   │   └── utils/             # Developer utilities
│       │   └── backend/               # Backend controllers for Developer Panel
│       │       ├── controllers/       # License, Database, API Manager, dll
│       │       ├── services/          # Developer services
│       │       └── middleware/        # Developer middleware
│       ├── build/                     # Build resources
│       ├── public/                    # Public assets
│       ├── package.json               # Developer Panel dependencies
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── electron-builder.json
│
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml                # Workspace definition
└── README.md                          # Updated documentation
```

## Fitur per Aplikasi

### MediaSoft POS User (mediasoft-pos-user)

**Target Platform:** Desktop (Windows, Linux, macOS), Mobile (Android, iOS)

**Fitur:**
- Dashboard
- POS/Kasir
- Produk & Kategori
- Stok Barang
- Supplier & Pelanggan
- Pembelian & Penjualan
- Retur & Pengeluaran
- Laporan (Penjualan, Laba Rugi, Stok)
- Export (PDF, Excel)
- WhatsApp Integration
- Antrian Print
- Kalkulator HPP
- E-Commerce API (operasional)
- Pengaturan Toko
- Pengaturan Printer
- Backup Data (user-level)
- Profil Pengguna
- Aktivitas Pengguna

**Roles:** kasir, operator, admin, super_admin, developer, demo

### MediaSoft Developer Panel (mediasoft-developer-panel)

**Target Platform:** Desktop only (Windows, Linux, macOS)

**Fitur:**
- License Center
- Aktivasi Lisensi
- Paket Langganan
- Manajemen Lisensi
- Validasi Lisensi
- Database Management
- Server Configuration
- API Management
- Monitoring Error
- Monitoring Performa
- Activity Log Sistem
- Maintenance Mode
- Update Management
- Backup & Restore Sistem
- Security Management
- Role & Permission
- Developer Tools
- Debug Console
- API Logs
- Integrasi Sistem
- Pengaturan Global

**Roles:** developer, super_admin only

## Dependencies Strategy

### Shared Library
- `drizzle-orm`, `better-sqlite3` (database)
- `zod` (validation)
- `bcryptjs` (password hashing)
- `crypto-js` (encryption)
- `date-fns` (date utilities)
- Shared types, utilities, components

### User Panel Only
- `@capacitor/*` (mobile support)
- `react-to-print` (print struk)
- `jsbarcode`, `react-barcode` (barcode)
- `qrcode` (QR code)
- `recharts` (charts)
- `exceljs`, `xlsx` (Excel export)
- `jspdf`, `jspdf-autotable` (PDF export)
- `midtrans-client` (payment gateway)

### Developer Panel Only
- `express` (HTTP server untuk API management)
- `@supabase/supabase-js` (license server integration)
- `node-cron` (scheduler untuk monitoring)
- Advanced monitoring & debugging tools

## Database Strategy

**Opsi 1: Shared Database (Recommended)**
- Kedua aplikasi mengakses database yang sama
- Shared library menyediakan schema dan connection
- Lebih mudah untuk sinkronisasi data
- Developer Panel bisa monitoring data User Panel

**Opsi 2: Separate Database**
- User Panel: `mediasoft_pos.db`
- Developer Panel: `mediasoft_developer.db`
- Perlu sync mechanism untuk data yang shared
- Lebih isolated tapi lebih kompleks

**Rekomendasi:** Gunakan Opsi 1 (Shared Database) dengan access control di level aplikasi.

## Build Strategy

### User Panel
```bash
# Development
npm run dev:user

# Build Desktop
npm run build:user:desktop:windows
npm run build:user:desktop:linux
npm run build:user:desktop:mac

# Build Mobile
npm run build:user:mobile:android
npm run build:user:mobile:ios
```

### Developer Panel
```bash
# Development
npm run dev:developer

# Build Desktop
npm run build:developer:desktop:windows
npm run build:developer:desktop:linux
npm run build:developer:desktop:mac
```

## Migration Plan

### Phase 1: Setup Structure
1. Create workspace structure
2. Setup shared-lib package
3. Create empty user and developer packages

### Phase 2: Move Shared Code
1. Move types to shared-lib
2. Move database schema to shared-lib
3. Move shared utilities to shared-lib
4. Move shared components to shared-lib

### Phase 3: Split User Panel
1. Move user-specific pages
2. Move user-specific controllers
3. Setup user panel build config
4. Test user panel independently

### Phase 4: Split Developer Panel
1. Move developer-specific pages
2. Move developer-specific controllers
3. Setup developer panel build config
4. Test developer panel independently

### Phase 5: Testing & Documentation
1. Test both applications
2. Update documentation
3. Update CI/CD if any

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:** 
- Keep original project as backup
- Test thoroughly before removing old structure
- Use git branches for each phase

### Risk 2: Dependency Conflicts
**Mitigation:**
- Use workspace to manage dependencies
- Lock versions in package.json
- Test builds frequently

### Risk 3: Database Access Issues
**Mitigation:**
- Use shared-lib for database access
- Implement proper connection pooling
- Add error handling

### Risk 4: Build Time Increase
**Mitigation:**
- Use incremental builds
- Cache node_modules
- Optimize build configs

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours

**Total:** 14-19 hours

## Next Steps

1. ✅ Complete analysis (this document)
2. ⏳ Create workspace structure
3. ⏳ Setup shared-lib
4. ⏳ Begin migration phase by phase
