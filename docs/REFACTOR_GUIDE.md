# Panduan Refactor MediaSoft POS - Pemisahan Aplikasi

## Status: IN PROGRESS

Dokumen ini berisi panduan lengkap untuk memisahkan MediaSoft POS menjadi 2 aplikasi terpisah.

## ✅ Yang Sudah Selesai

1. **Struktur Workspace**
   - ✅ Created `pnpm-workspace.yaml`
   - ✅ Created `packages/` directory structure
   - ✅ Created `packages/shared-lib/`
   - ✅ Created `packages/mediasoft-pos-user/`
   - ✅ Created `packages/mediasoft-developer-panel/`

2. **Package Configuration**
   - ✅ `packages/shared-lib/package.json` - Shared dependencies
   - ✅ `packages/mediasoft-pos-user/package.json` - User app dependencies
   - ✅ `packages/mediasoft-developer-panel/package.json` - Developer app dependencies
   - ✅ Root `package.json` updated for workspace

3. **Shared Library Setup**
   - ✅ Database files copied to shared-lib
   - ✅ Types copied to shared-lib
   - ✅ Utils copied to shared-lib
   - ✅ Services copied to shared-lib
   - ✅ Config copied to shared-lib

## 🔄 Langkah Selanjutnya

### Step 1: Complete Shared Library

```bash
cd packages/shared-lib
```

Buat file index untuk exports:
- `src/services/index.ts`
- `src/utils/index.ts`
- `src/config/index.ts`
- `src/components/index.ts`

### Step 2: Setup MediaSoft POS User

**Struktur yang dibutuhkan:**

```
packages/mediasoft-pos-user/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts
│   │   ├── preload.cjs
│   │   └── ipcHandlers.ts
│   ├── renderer/                # React frontend
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/               # User pages only
│   │   ├── components/          # User components
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   └── utils/
│   ├── backend/                 # Backend for User features
│   │   ├── controllers/
│   │   ├── services/
│   │   └── middleware/
│   └── platform/
│       ├── desktop/
│       └── mobile/
├── android/                     # Android project
├── ios/                         # iOS project
├── build/                       # Build resources
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── capacitor.config.ts
└── tailwind.config.js
```

**Pages untuk User Panel:**
- Dashboard.tsx
- Transaksi.tsx (POS)
- Produk.tsx
- Kategori.tsx
- Satuan.tsx
- Supplier.tsx
- Customer.tsx
- Pembelian.tsx
- Riwayat.tsx (Penjualan)
- Returns.tsx
- Kas.tsx
- Shifts.tsx
- Debts.tsx
- StockOpname.tsx
- Laporan.tsx
- Hpp.tsx
- WhatsApp.tsx
- PrintQueue.tsx
- Backup.tsx (user-level)
- Settings.tsx (toko settings)
- Users.tsx (non-developer users)
- ActivityLog.tsx (user activities)

**Controllers untuk User Panel:**
- AuthController.ts
- DashboardController.ts
- BarangController.ts
- KategoriController.ts
- SatuanController.ts
- SupplierController.ts
- CustomerController.ts
- PembelianController.ts
- PenjualanController.ts
- ReturnController.ts
- KasController.ts
- ShiftController.ts
- DebtController.ts
- StockOpnameController.ts
- LaporanController.ts
- HppController.ts
- ExportController.ts
- WhatsAppController.ts
- BackupController.ts (user-level)
- StrukSettingsController.ts
- PaymentMethodController.ts
- NotifikasiController.ts
- InventoryController.ts
- BarcodeController.ts
- ProductImageController.ts
- TaxController.ts
- PromoController.ts
- LoyaltyController.ts
- BranchController.ts

### Step 3: Setup MediaSoft Developer Panel

**Struktur yang dibutuhkan:**

```
packages/mediasoft-developer-panel/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts
│   │   ├── preload.cjs
│   │   └── ipcHandlers.ts
│   ├── renderer/                # React frontend
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/               # Developer pages only
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   └── utils/
│   └── backend/                 # Backend for Developer features
│       ├── controllers/
│       ├── services/
│       └── middleware/
├── build/
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
└── tailwind.config.js
```

**Pages untuk Developer Panel:**
- DeveloperDashboard.tsx
- LicenseCenter.tsx
- LicenseAdmin.tsx
- SubscriptionPlans.tsx
- DatabaseManager.tsx
- ApiManager.tsx
- EcommerceApi.tsx
- ServerConfig.tsx
- Monitoring.tsx
- ErrorLogs.tsx
- PerformanceMonitor.tsx
- ActivityLog.tsx (system-level)
- MaintenanceMode.tsx
- UpdateManager.tsx
- BackupRestore.tsx (system-level)
- Security.tsx
- RolePermission.tsx
- Users.tsx (developer users)
- DevTools.tsx
- DebugConsole.tsx
- ApiLogs.tsx
- SystemSettings.tsx

**Controllers untuk Developer Panel:**
- LicenseController.ts
- PlanController.ts
- DeviceController.ts
- EcommerceApiController.ts
- SystemController.ts
- SecurityController.ts
- ActivityLogController.ts (system)
- BackupController.ts (system-level)
- UserController.ts (developer management)
- AssistantController.ts
- TutorialController.ts
- IndustrySettingsController.ts
- MobileAppController.ts
- NewFeaturesController.ts

### Step 4: Copy Files

**Script untuk copy files:**

```bash
# Copy ke User Panel
./scripts/copy-to-user-panel.sh

# Copy ke Developer Panel
./scripts/copy-to-developer-panel.sh
```

### Step 5: Update Imports

Semua import dari shared code harus diupdate:

**Before:**
```typescript
import { db } from '../../database/connection';
import { User } from '../../shared/types';
```

**After:**
```typescript
import { db, User } from '@mediasoft/shared-lib';
```

### Step 6: Create Vite Configs

**User Panel - vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'src/main/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron/main'
        }
      }
    })
  ],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});
```

**Developer Panel - vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'src/main/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron/main'
        }
      }
    })
  ],
  server: {
    port: 5174  // Different port!
  },
  build: {
    outDir: 'dist'
  }
});
```

### Step 7: Create Entry Points

**User Panel - src/renderer/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**User Panel - src/renderer/App.tsx:**
```typescript
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
// ... import other user pages

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/transaksi" element={<Transaksi />} />
          {/* ... other user routes */}
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

**Developer Panel - src/renderer/App.tsx:**
```typescript
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import DeveloperDashboard from './pages/DeveloperDashboard';
import LicenseCenter from './pages/LicenseCenter';
// ... import other developer pages

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<DeveloperDashboard />} />
          <Route path="/license" element={<LicenseCenter />} />
          {/* ... other developer routes */}
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

### Step 8: Install Dependencies

```bash
# Install all dependencies
npm install

# Or with pnpm
pnpm install
```

### Step 9: Build & Test

```bash
# Test User Panel
npm run dev:user

# Test Developer Panel
npm run dev:developer

# Build User Panel
npm run build:user

# Build Developer Panel
npm run build:developer
```

### Step 10: Update Documentation

Update README.md untuk menjelaskan struktur baru dan cara menjalankan masing-masing aplikasi.

## 🚨 Important Notes

1. **Database Access**: Kedua aplikasi menggunakan database yang sama (`sistem_pos.db`), tapi dengan access control berbeda di level aplikasi.

2. **Port Configuration**:
   - User Panel: `http://localhost:5173`
   - Developer Panel: `http://localhost:5174`

3. **Authentication**: Masing-masing aplikasi memiliki login terpisah dengan role-based access control.

4. **Build Output**:
   - User Panel: `packages/mediasoft-pos-user/release/`
   - Developer Panel: `packages/mediasoft-developer-panel/release/`

5. **Mobile Support**: Hanya User Panel yang support Android/iOS.

## 📝 Checklist

- [x] Create workspace structure
- [x] Setup shared-lib package
- [x] Create user panel package.json
- [x] Create developer panel package.json
- [ ] Complete shared-lib exports
- [ ] Copy files to user panel
- [ ] Copy files to developer panel
- [ ] Create vite configs
- [ ] Create entry points
- [ ] Update all imports
- [ ] Create separate IPC handlers
- [ ] Create separate layouts
- [ ] Create separate sidebars
- [ ] Test user panel
- [ ] Test developer panel
- [ ] Build user panel
- [ ] Build developer panel
- [ ] Update documentation

## 🔧 Scripts to Create

1. `scripts/copy-to-user-panel.sh` - Copy user files
2. `scripts/copy-to-developer-panel.sh` - Copy developer files
3. `scripts/update-imports.sh` - Update import statements
4. `scripts/verify-separation.sh` - Verify no cross-contamination

## 📚 Next Steps

Karena ini adalah refactor yang sangat besar, saya sarankan:

1. **Backup project saat ini** sebelum melanjutkan
2. **Buat branch baru** di git untuk refactor ini
3. **Test setiap step** sebelum lanjut ke step berikutnya
4. **Commit frequently** untuk memudahkan rollback jika ada masalah

Apakah Anda ingin saya lanjutkan dengan membuat script otomatis untuk copy files, atau Anda ingin melakukan manual step-by-step?
