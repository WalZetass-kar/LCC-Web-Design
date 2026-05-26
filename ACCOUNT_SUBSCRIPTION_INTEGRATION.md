# Integrasi Akun Pembeli, Subscription, Lisensi, Device, dan Feature Control

Dokumen ini memetakan integrasi ke aplikasi POS yang sudah ada. Tidak ada aplikasi baru, menu baru, atau pemindahan semua fungsi ke License Center.

## 1. Analisis struktur aplikasi lama

- Frontend POS: `src/renderer/pages/*`, layout sidebar di `src/renderer/layouts/Sidebar.tsx`.
- Backend lokal: controller/model di `src/backend`, IPC di `src/main/ipcHandlers.ts`.
- Database SQLite lokal: schema Drizzle di `src/database/schema.ts`, migrasi runtime idempotent di `src/database/connection.ts`.
- Menu yang sudah tersedia dan dipakai: Pengguna, License Center, Paket Langganan, E-commerce API, Keamanan, Activity Log, Backup.
- Tabel lama yang direuse: `mediasoft_pengguna`, `mediasoft_grup_pengguna_hak_akses`, `mediasoft_subscription_plans`, `mediasoft_activity_log`, `mediasoft_identitas`, `mediasoft_auth_sessions`, `mediasoft_ecommerce_api`.
- Tabel baru yang memang diperlukan: `mediasoft_user_devices` untuk device per user dan `mediasoft_popup_rules` untuk aturan popup upgrade.

## 2. Mapping fitur lama ke fungsi final

| Fungsi final | Menu/file existing | Catatan |
|---|---|---|
| Akun pembeli, role, status, masa akses, hak akses | `src/renderer/pages/Users.tsx` | Reuse `mediasoft_pengguna` dan permission lama. |
| Device user, OS, platform, IP, revoke | `Users.tsx`, `DeviceController.ts`, `Security.tsx` | Pengguna menampilkan riwayat device, Keamanan untuk session/remote logout. |
| Koneksi dan validasi API lisensi | `LicenseCenter.tsx`, `LicenseServerConfig.tsx`, `LicenseController.ts` | Hanya config, test, sync, validasi aplikasi. |
| Paket, harga, masa aktif, limit, fitur premium | `SubscriptionPlans.tsx`, `PlanController.ts` | Reuse `mediasoft_subscription_plans`. |
| Payment gateway, webhook, link pembayaran, auto aktivasi | `EcommerceApi.tsx`, `EcommerceApiController.ts` | Popup upgrade mengambil CTA dari konfigurasi ini. |
| Session control, revoke, remote logout, token | `Security.tsx`, `AuthSessionModel.ts`, `DeviceController.ts` | IPC device dibuat admin-only. |
| Log login/device/subscription/payment/API | `ActivityLog.tsx`, `ActivityLogModel.ts` | `event_type` dipakai untuk filter audit. |
| Backup/restore/import/export | `Backup.tsx`, `BackupController.ts` | Tidak dipindahkan ke License Center. |
| Popup upgrade | `PricingPopup.tsx` | Dikontrol paket, ecommerce payment link, popup rules, dan frontend POS. |

## 3. Struktur sidebar final tanpa menu duplicate

Administrasi tetap berisi:

- `Pengguna`: user, akun pembeli, role, status, hak akses, masa akses, device.
- `License Center`: koneksi API lisensi, endpoint, token/API key, test, sync, validasi.
- `Paket Langganan`: paket, harga, durasi, limit, fitur premium.
- `Activity Log`: semua audit event.
- `Backup`: backup/restore/import/export lokal.
- `Keamanan`: session, token, revoke device/session, remote logout.
- `E-commerce API`: payment gateway, webhook, payment link, auto aktivasi.

Tidak ada menu utama baru untuk popup upgrade atau device management utama.

## 4. Struktur database final

Reuse:

- `mediasoft_pengguna`: user, akun pembeli, status, role, masa akses, subscription.
- `mediasoft_grup_pengguna_hak_akses`: hak akses/menu lama.
- `mediasoft_subscription_plans`: paket, harga, durasi, limit, feature flags.
- `mediasoft_activity_log`: log penting lintas modul.
- `mediasoft_identitas`: config license API.
- `mediasoft_auth_sessions`: token/session aktif.
- `mediasoft_ecommerce_api`: payment link, WA payment, auto activation.

Tabel tambahan:

- `mediasoft_user_devices`: device per user, platform, OS, IP, status, revoke.
- `mediasoft_popup_rules`: konten dan CTA popup upgrade.

Tidak dibuat `feature_permissions` karena `feature_flags` pada paket dan permission lama sudah cukup.
Tidak dibuat `subscription_usage` karena limit transaksi harian dihitung dari `mediasoft_penjualan`.

## 5. Field tambahan yang diperlukan

`mediasoft_pengguna`:

- `subscription_plan_id`
- `subscription_expires_at`
- `is_buyer`

`mediasoft_subscription_plans`:

- `max_devices`
- `max_transactions_per_day`
- `max_products`
- `max_users`
- `feature_flags`

`mediasoft_auth_sessions`:

- `platform`
- `os_name`
- `app_version`
- `is_revoked`

`mediasoft_activity_log`:

- `device_id`
- `user_agent`
- `detail`
- `event_type`

`mediasoft_ecommerce_api`:

- `whatsapp_number`
- `payment_link`
- `auto_activate`
- `activation_plan_id`

## 6. Migration SQL aman

Runtime app sudah melakukan `ALTER TABLE` secara idempotent melalui `src/database/connection.ts` dengan cek `PRAGMA table_info` sebelum menambah kolom. Untuk SQL yang aman dijalankan berulang, gunakan:

```sql
CREATE INDEX IF NOT EXISTS idx_user_devices_status
  ON mediasoft_user_devices(status);

CREATE INDEX IF NOT EXISTS idx_activity_log_event_type
  ON mediasoft_activity_log(event_type, tgl_aktivitas);

INSERT OR IGNORE INTO mediasoft_popup_rules
  (code, title, description, cta_text, trigger_on)
VALUES
  ('TRANSACTION_LIMIT', 'Limit Transaksi Tercapai',
   'Limit transaksi harian paket Anda sudah habis. Upgrade paket untuk melanjutkan transaksi.',
   'Upgrade Paket', '{"trigger":"transaction_limit"}');
```

File tambahan: `migrations/002_access_control_hardening.sql`.

## 7. Struktur API final

License Center:

- `license:getConfig`
- `license:testConnection`
- `license:testAndSave`
- `license:validateApplication`
- `license:syncFromServer`

Pengguna/device:

- `user:getAll`, `user:create`, `user:update`, `user:block`, `user:extendAccess`
- `user:getPermissions`, `user:savePermissions`
- `device:getAll`, `device:getByUser`, `device:revoke`, `device:revokeAll`

Subscription/feature/popup:

- `plan:getAll`, `plan:getActive`, `plan:create`, `plan:update`, `plan:deactivate`
- `subscription:getStatus`
- `subscription:checkTransactionLimit`
- `subscription:isFeatureEnabled`
- `subscription:getActiveFeatures`
- `subscription:getPopupRule`
- `subscription:getUpgradePopup`
- `popup:getAll`, `popup:update`

E-commerce/payment:

- `ecommerce:get`
- `ecommerce:save`

Security:

- `security:get`, `security:save`
- `device:getAllSessions`, `device:revokeSession`

Activity/backup:

- `activityLog:getAll`, `activityLog:search`
- `backup:getAll`, `backup:create`, `backup:restore`, `backup:import`, `backup:download`

## 8. Contoh middleware subscription

```ts
const username = demoSession.getUsername()
const feature = requiredFeatureForChannel(channel)

if (feature && username && !isFeatureEnabled(username, feature)) {
  return {
    success: false,
    error_code: 'FEATURE_LOCKED',
    message: 'Fitur ini tidak aktif untuk paket langganan akun Anda.',
    data: { feature, popup: getUpgradePopup(username, feature) },
  }
}
```

Implementasi: `src/backend/middleware/demoGuardV2.ts` dan `src/backend/middleware/subscriptionGuard.ts`.

## 9. Contoh middleware device validation

```ts
const deviceCheck = DeviceController.validateLogin(username, device.deviceId)
if (!deviceCheck.allowed) {
  return {
    success: false,
    error_code: deviceCheck.reason === 'device_limit' ? 'DEVICE_LIMIT' : 'DEVICE_REVOKED',
    message: 'Device tidak valid untuk login.',
    data: deviceCheck,
  }
}
```

Implementasi: `AuthController.login`, `AuthController.loginWithPin`, `DeviceController.validateLogin`.

## 10. Contoh logic popup upgrade

```ts
if (['TRANSACTION_LIMIT', 'FEATURE_LOCKED', 'EXPIRED'].includes(response.error_code ?? '')) {
  showPricing()
}
```

Popup mengambil:

- daftar paket aktif dari `plan:getActive`
- copy/CTA dari `subscription:getPopupRule`
- link pembayaran/WA dari `ecommerce:get`

## 11. Contoh logic deteksi platform device

```ts
export function collectAuthDeviceInfo() {
  const userAgent = navigator.userAgent || 'unknown'
  return {
    deviceId: getAuthDeviceId(),
    deviceName: navigator.platform || 'unknown',
    userAgent,
    platform: /Android/i.test(userAgent) ? 'android' : /Electron/i.test(userAgent) ? 'electron' : 'web',
    osName: /Windows/i.test(userAgent) ? 'Windows' : /Android/i.test(userAgent) ? 'Android' : 'Unknown',
    appVersion: '2.0.0',
  }
}
```

Implementasi: `src/renderer/utils/authDevice.ts` dan fallback backend `detectPlatformOS`.

## 12. Contoh logic kontrol fitur berdasarkan paket

```ts
if ('feature' in item && item.feature && featureFlags[item.feature] === false) {
  return false
}
```

Frontend menyembunyikan menu. Backend tetap menolak channel yang fitur paketnya tidak aktif.

## 13. Contoh query mengambil fitur aktif user

```sql
SELECT p.feature_flags
FROM mediasoft_pengguna u
LEFT JOIN mediasoft_subscription_plans p ON p.id = u.subscription_plan_id
WHERE u.nama_pengguna = ?;
```

Di TypeScript:

```ts
getActiveFeatures(username)
```

## 14. Contoh dashboard admin untuk mengatur akun pembeli

Dashboard berada di `Menu Pengguna`:

- tab `Pengguna`: username, nama, email, telepon, role, status, masa akses, paket, device count, PIN, last login.
- modal add/edit: akun pembeli, paket langganan, masa langganan, masa akses, role, izin menu.
- tab `Riwayat Device User`: username, device id/name, desktop/mobile, OS, app version, IP, last seen, status active/revoked/blocked, tombol revoke.

## 15. Checklist anti duplicate

- Tidak membuat aplikasi baru.
- Tidak membuat menu popup upgrade.
- Tidak membuat menu device management baru.
- Tidak memindahkan user/paket/payment/popup/device ke License Center.
- License Center hanya koneksi, test, sync, validasi API lisensi.
- Paket Langganan tetap mengatur paket, harga, durasi, limit, fitur.
- E-commerce API tetap mengatur payment gateway, webhook, link payment, auto aktivasi.
- Keamanan tetap mengatur session, token, revoke/remote logout.
- Activity Log tetap menjadi tempat audit.
- Backup tetap menjadi tempat backup/restore.
- Reuse tabel lama sebelum membuat tabel baru.
- Backend tetap menjadi enforcement utama, frontend hanya UX.

