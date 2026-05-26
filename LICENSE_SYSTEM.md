# MediaSoft License System

Catatan arsitektur: pembagian fungsi final untuk POS ada di
`ACCOUNT_SUBSCRIPTION_INTEGRATION.md`. License Center di aplikasi POS hanya
dipakai untuk koneksi, test, sync, dan validasi API lisensi. Manajemen user,
paket, pembayaran, popup, dan device tetap berada di menu utama masing-masing.

Sistem lisensi & feature flag terpusat untuk aplikasi MediaSoft POS multi-device.
Server lisensi tetap headless dan tidak membuat aplikasi POS baru.

```
┌─────────────────────────────────────────┐
│  Aplikasi POS (Electron / Capacitor)    │
│                                         │
│  • User biasa  → halaman POS            │
│  • Developer   → halaman POS + 🛡️       │
│                  Panel Developer        │
│                  (kelola user, plan,    │
│                   fitur, popup, payment)│
└────────────────┬────────────────────────┘
                 │ HTTPS + JWT
                 ▼
┌─────────────────────────────────────────┐
│        License Server (headless)        │
│  Express + better-sqlite3 + JWT         │
│  Tidak punya UI sendiri.                │
└─────────────────────────────────────────┘
```

---

## 📦 Struktur Komponen

| Lokasi | Isi |
|---|---|
| `license-server/` | Backend headless (Express + SQLite). Hanya menyediakan REST API. |
| `src/renderer/license/` | Modul integrasi POS (apiClient, FeatureContext, UpgradePopup, LoginScreen). |
| `src/renderer/license/admin/` | Panel admin dalam aplikasi (AdminPanel, AdminGate, halaman Users/Plans/Features/Popups/Payments). |

---

## 🚀 Setup Server (1× di VPS Anda)

```bash
cd license-server
cp .env.example .env       # ⚠️ ganti JWT_*_SECRET dan ADMIN_PASSWORD
npm install
npm run dev                # dev mode
# atau:
npm run build && npm start # production
```

Output:

```
🛡️  License Server listening on http://localhost:4000
🔌 API base: http://localhost:4000/api
👤 Manajemen dilakukan dari aplikasi POS (login sebagai super_admin/admin).

[seed] Super admin → admin@mediasoft.local / Admin#12345
[seed] Demo user   → demo@mediasoft.local / Demo#12345
```

> Database SQLite tersimpan di `license-server/data/license.db`.
> Tidak ada UI web — buka `/` hanya menampilkan info ringkas.

---

## 🔌 Integrasi ke Aplikasi POS

### 1. Tambah env variable

`.env.development`:

```env
VITE_LICENSE_SERVER_URL=http://localhost:4000/api
```

`.env.production`:

```env
VITE_LICENSE_SERVER_URL=https://license.your-domain.com/api
```

### 2. Init license client di entry renderer

Edit `src/renderer/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  initLicenseClient,
  LicenseProvider,
  LoginScreen,
  UpgradePopup,
  useLicense,
  AdminGate,
  AdminPanel,
  useIsAdmin,
} from './license';

const client = initLicenseClient({
  baseURL: import.meta.env.VITE_LICENSE_SERVER_URL || 'http://localhost:4000/api',
  appPlatform:
    typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
      ? 'android'
      : 'electron',
  appVersion: '2.0.0',
  onForceLogout: () => location.reload(),
});

function Root() {
  return (
    <LicenseProvider client={client}>
      <Gate />
      <UpgradePopup />
    </LicenseProvider>
  );
}

function Gate() {
  const { ready, user } = useLicense();
  const [showAdmin, setShowAdmin] = React.useState(false);

  if (!ready)
    return <div className="h-screen flex items-center justify-center">Memeriksa lisensi…</div>;
  if (!user) return <LoginScreen />;

  // Saat developer aktifkan mode admin
  if (showAdmin) {
    return (
      <AdminGate>
        <AdminPanel onExit={() => setShowAdmin(false)} />
      </AdminGate>
    );
  }

  return (
    <>
      <App />
      <AdminFloatButton onOpen={() => setShowAdmin(true)} />
    </>
  );
}

function AdminFloatButton({ onOpen }: { onOpen: () => void }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 py-3 shadow-lg"
    >
      🛡️ Panel Developer
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
```

Catatan UX:
- Jika user biasa login → cuma melihat aplikasi POS biasa, tombol panel **tidak muncul**.
- Jika developer (`super_admin`/`admin`) login → muncul tombol mengambang di kanan-bawah, klik untuk masuk panel.
- Dari dalam panel ada tombol "← Kembali ke aplikasi POS".

Alternatif lain: pasang `<AdminLink onOpen={...} />` di header aplikasi Anda. Komponen ini auto-hide untuk non-admin.

### 3. Sembunyikan menu sidebar berdasarkan fitur

```tsx
import { useLicense, FEATURES } from './license';

const MENU = [
  { code: FEATURES.PRODUCTS,     label: 'Produk',         to: '/products' },
  { code: FEATURES.TRANSACTIONS, label: 'Kasir',          to: '/pos' },
  { code: FEATURES.STOCK,        label: 'Stok',           to: '/stock' },
  { code: FEATURES.REPORTS,      label: 'Laporan',        to: '/reports' },
  { code: FEATURES.DEBT,         label: 'Hutang/Piutang', to: '/debt' },
  { code: FEATURES.MULTI_BRANCH, label: 'Cabang',         to: '/branch' },
  { code: FEATURES.BACKUP,       label: 'Backup',         to: '/backup' },
];

export function Sidebar() {
  const { hasFeature } = useLicense();
  return (
    <nav>
      {MENU.filter((m) => hasFeature(m.code)).map((m) => (
        <NavLink key={m.code} to={m.to}>{m.label}</NavLink>
      ))}
    </nav>
  );
}
```

### 4. Bungkus tombol/section dengan `FeatureGate`

```tsx
import { FeatureGate, FEATURES } from './license';

<FeatureGate code={FEATURES.EXPORT_EXCEL} softLock>
  <button className="btn-primary">Export ke Excel</button>
</FeatureGate>

<FeatureGate code={FEATURES.MULTI_CASHIER} hideWhenLocked>
  <UserManagementPanel />
</FeatureGate>
```

`softLock` = render abu-abu, klik munculkan popup upgrade.
`hideWhenLocked` = sembunyikan total kalau fitur tidak aktif.

### 5. Cek fitur secara programmatik

```ts
const { hasFeature, featureLimit, showUpgradePopup } = useLicense();

async function onCheckout() {
  if (!hasFeature(FEATURES.TRANSACTIONS)) {
    return showUpgradePopup('FEATURE_LOCKED');
  }
  await api.post('/transactions', cart);
}
```

### 6. (Opsional) Secure storage di Electron main process

Modul license menyimpan token di `localStorage` secara default. Untuk
keamanan lebih, expose helper terenkripsi dari main process.

`src/main/preload.cjs`:

```js
contextBridge.exposeInMainWorld('api', {
  // ... existing api ...
  license: {
    get: (key) => ipcRenderer.invoke('license:get', key),
    set: (key, value) => ipcRenderer.invoke('license:set', key, value),
    remove: (key) => ipcRenderer.invoke('license:remove', key),
  },
});
```

`src/main/ipcHandlers.ts`:

```ts
import Store from 'electron-store';
import CryptoJS from 'crypto-js';

const SECRET = process.env.LICENSE_STORE_KEY ?? 'change-me-in-prod';
const store = new Store({ name: 'license-store' });

ipcMain.handle('license:get', (_e, key: string) => {
  const enc = store.get(key) as string | undefined;
  if (!enc) return null;
  try { return CryptoJS.AES.decrypt(enc, SECRET).toString(CryptoJS.enc.Utf8); }
  catch { return null; }
});
ipcMain.handle('license:set', (_e, key: string, val: string) => {
  store.set(key, CryptoJS.AES.encrypt(val, SECRET).toString());
});
ipcMain.handle('license:remove', (_e, key: string) => store.delete(key));
```

`apiClient.ts` otomatis pakai bridge ini kalau tersedia (`window.api.license`).

---

## 👤 Cara Pakai (Anda sebagai Developer)

### Pertama kali

1. Build & install aplikasi POS Anda di komputer sendiri.
2. Login dengan akun super admin: `admin@mediasoft.local` / `Admin#12345`
   (kredensial dari `.env` license-server, ganti di production).
3. Tombol mengambang **🛡️ Panel Developer** akan muncul di kanan-bawah.
   Klik → masuk ke panel di dalam aplikasi.

### Workflow harian

| Tujuan | Tab di Panel | Aksi |
|---|---|---|
| Buat akun untuk pembeli baru | **Users** | + Buat Akun Pembeli → pilih paket & durasi |
| User sudah bayar, perpanjang | **Users** | Ubah Paket atau **Payments** + Catat Pembayaran (success) |
| Reset password user | **Users** | Tombol "Reset Pwd" → password random ditampilkan |
| Suspend user yang menunggak | **Users** | Tombol "Suspend" |
| Atur fitur per paket | **Plans** | Klik "Atur Fitur" → centang & isi limit |
| Tambah fitur baru di aplikasi | **Fitur** | + Tambah Fitur (kode harus snake_case) |
| Ganti teks/link popup upgrade | **Popup** | Edit langsung, simpan |
| Catat pembayaran manual | **Payments** | + Catat Pembayaran (status `success` auto perpanjang) |
| Approve pembayaran pending | **Payments** | Tombol "Approve" |

Aplikasi user akan auto-sinkron paling lambat 10 menit setelah perubahan,
atau langsung saat user melakukan aksi yang menyentuh server.

---

## 🔐 Endpoint API

Base URL: `http://your-server.com/api`. Semua kecuali `/auth/*` butuh
header `Authorization: Bearer <jwt>`.

### Public
- `POST /auth/login`
- `POST /auth/register-demo`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

### User
- `GET /user/features`
- `GET /user/account/status`
- `GET /user/popup/:code`
- `POST /user/usage/increment`

### Admin (role super_admin / admin)
- `GET /admin/users`, `GET /admin/users/:id`
- `POST /admin/users`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `PUT /admin/users/:id/plan`, `PATCH /admin/subscriptions/:id`
- `PUT /admin/users/:id/features/:code`, `DELETE /admin/users/:id/features/:code`
- `GET /admin/plans`, `POST /admin/plans`, `PATCH /admin/plans/:id`, `DELETE /admin/plans/:id`
- `GET /admin/plans/:id/features`, `PUT /admin/plans/:id/features`
- `GET /admin/features`, `POST /admin/features`, `PATCH /admin/features/:id`
- `GET /admin/popups`, `PATCH /admin/popups/:id`
- `GET /admin/payments`, `POST /admin/payments`, `POST /admin/payments/:id/approve`
- `POST /admin/devices/:id/revoke`

### Bentuk response baku

Sukses:
```json
{ "success": true, "data": { ... } }
```

Gagal (popup otomatis dipicu di client kalau ada `error_code`):
```json
{
  "success": false,
  "error_code": "FEATURE_LOCKED" | "EXPIRED" | "LIMIT_REACHED" | "NO_SUBSCRIPTION" | "ACCOUNT_SUSPENDED",
  "message": "...",
  "feature": "export_excel",
  "popup": { "title": "...", "cta_url": "..." }
}
```

---

## 🌐 Deploy Production

### Opsi A — Single VPS

1. Provision Ubuntu 22.04, install Node 20 + nginx + certbot.
2. Clone repo, `cd license-server && npm install && npm run build`.
3. Buat `/etc/systemd/system/license.service`:
   ```ini
   [Unit]
   Description=MediaSoft License Server
   After=network.target

   [Service]
   WorkingDirectory=/srv/license-server
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   EnvironmentFile=/srv/license-server/.env

   [Install]
   WantedBy=multi-user.target
   ```
4. `systemctl enable --now license`, reverse proxy via nginx + Let's Encrypt.

### Opsi B — Railway / Render / Fly.io

Push repo, set env dari `.env.example`, **mount persistent disk** ke folder `data/` (SQLite).

### Migrasi ke PostgreSQL (skala naik)

Schema di `src/migrations.ts` mudah diport: ganti `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL/UUID`, `datetime('now')` → `NOW()`, lalu tukar `better-sqlite3` dengan `pg`. Endpoint dan middleware tidak berubah.

---

## ✅ Checklist Anti-Bypass

- [x] Manajemen admin **hanya** lewat aplikasi POS asli yang sudah Anda obfuscate.
- [x] Endpoint `/admin/*` di server tetap memvalidasi role di setiap request.
- [x] Token disimpan di main process (electron-store + AES) — bukan localStorage saat production.
- [x] Refresh token hash di DB; jika reuse terdeteksi → semua device direvoke.
- [x] Setiap aksi penting di POS pakai `featureGuard()` di server (bukan hanya UI).
- [x] Status & limit dihitung di server. Frontend hanya cache untuk UI hint.
- [x] Suspended user → semua device direvoke otomatis.
- [x] Aplikasi auto-refresh `/account/status` tiap 10 menit + saat aksi penting.
- [x] Rate limit endpoint auth (30/15 menit).

---

## 🧪 Smoke Test

```bash
cd license-server
bash scripts/smoke-test.sh
```

Harus muncul `==== ✅ ALL SMOKE TESTS PASSED ====` di akhir.

---

## 🐛 Troubleshooting

**Q: Tombol Panel Developer tidak muncul.**
A: Login dengan akun yang `role`-nya `super_admin` atau `admin`. Cek di `users` table di SQLite.

**Q: Akses ditolak saat masuk panel.**
A: Akun Anda role-nya `user`. Naikkan role lewat SQL langsung:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'you@domain.com';
```

**Q: User berhasil login tapi feature map kosong.**
A: User belum punya `user_subscriptions` aktif. Buka panel → Users → Ubah Paket.

**Q: Ingin reset semua data.**
A: Stop server, hapus `license-server/data/license.db*`, jalankan ulang.

**Q: Server gagal start dengan error CORS dari aplikasi.**
A: Set `CORS_ORIGINS` di `.env`, contoh: `CORS_ORIGINS=http://localhost:5173,capacitor://localhost,file://`.

---

## 📂 Struktur File Akhir

```
license-server/                   # backend headless
├── package.json, tsconfig.json, .env.example
├── src/
│   ├── index.ts                  # Express, NO static admin
│   ├── config.ts, db.ts, auth.ts
│   ├── migrations.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── subscriptionGuard.ts
│   │   └── featureGuard.ts
│   └── routes/
│       ├── authRoutes.ts
│       ├── userRoutes.ts
│       └── adminRoutes.ts
└── scripts/smoke-test.sh

src/renderer/license/             # integrasi di aplikasi POS
├── index.ts                      # barrel + FEATURES constants
├── apiClient.ts                  # axios + secure storage
├── FeatureContext.tsx            # useLicense, useFeature
├── FeatureGate.tsx
├── UpgradePopup.tsx
├── LoginScreen.tsx
└── admin/                        # panel admin in-app
    ├── index.ts
    ├── AdminPanel.tsx            # main shell + nav sidebar
    ├── AdminGate.tsx             # role guard + AdminLink
    ├── components.tsx            # Modal, Field, Input, Button, ...
    ├── api.ts                    # admin API helpers
    └── pages/
        ├── DashboardPage.tsx
        ├── UsersPage.tsx
        ├── PlansPage.tsx
        ├── FeaturesPage.tsx
        ├── PopupsPage.tsx
        └── PaymentsPage.tsx

LICENSE_SYSTEM.md                 # dokumen ini
```

---

## 📞 TL;DR Workflow

1. **Anda (developer)** deploy `license-server` ke VPS.
2. **Aplikasi POS** diberi modul `src/renderer/license/`. Saat install, user pakai akun demo bawaan atau daftar sendiri.
3. Anda login di aplikasi POS Anda sendiri pakai akun super admin → tombol **🛡️ Panel Developer** muncul → klik untuk kelola semua user/plan/popup.
4. Saat user bayar, Anda update paketnya dari panel. Aplikasi user otomatis sync.
5. Tidak ada admin web yang bisa diakses publik — pintu masuk hanya lewat aplikasi POS asli Anda.
