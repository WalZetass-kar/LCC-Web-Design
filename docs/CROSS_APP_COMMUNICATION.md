# Komunikasi Developer Panel ↔ User Panel

## Arsitektur

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  Developer Panel (Desktop)  │         │  User Panel (Desktop +   │
│                             │         │  Mobile)                 │
│  - License Management       │         │                          │
│  - User Management          │         │  - POS/Kasir             │
│  - Plan Management          │◄────────┤  - Produk                │
│  - Suspend/Revoke License   │  Shared │  - Laporan               │
│  - Activate/Deactivate User │  Database│  - dll                  │
│                             │         │                          │
│  Port: 5174                 │         │  Port: 5173              │
└─────────────────────────────┘         └──────────────────────────┘
                │                                    │
                │                                    │
                └────────────┬───────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared Database│
                    │  sistem_pos.db  │
                    │                 │
                    │  - Users        │
                    │  - License Info │
                    │  - Store Info   │
                    └─────────────────┘
```

## Fitur Developer Panel

### 1. License Management
**Path:** `/license-management`

**Fungsi:**
- Aktivasi lisensi baru
- Suspend lisensi (block user app)
- Revoke lisensi (permanent)
- Update plan (free, basic, pro, enterprise)
- View license status & expiry

**API:**
- `developer:getLicenseInfo` - Get current license
- `developer:updateLicense` - Update license status
- `developer:revokeLicense` - Revoke license
- `developer:updateLicensePlan` - Change plan

### 2. User Management
**Path:** `/user-management`

**Fungsi:**
- View all user accounts
- Suspend user (block login)
- Activate user
- View user roles & status

**API:**
- `developer:getAllUsers` - Get all users
- `developer:updateUserStatus` - Suspend/activate user

### 3. Store Management
**Fungsi:**
- View store information
- View license key
- View license status

**API:**
- `developer:getStoreInfo` - Get store details

## Fitur User Panel

### License Guard
**Component:** `LicenseGuard.tsx`

**Fungsi:**
- Check license saat app start
- Auto-check setiap 5 menit
- Block app jika license invalid/expired/suspended
- Show license info & expiry

**API:**
- `user:checkLicense` - Validate license
- `user:getUserLimits` - Get max users/products

## License Plans

### Free
- Max Users: 1
- Max Products: 100
- Features: basic

### Basic
- Max Users: 3
- Max Products: 500
- Features: basic, reports

### Pro
- Max Users: 10
- Max Products: 5,000
- Features: basic, reports, api, whatsapp

### Enterprise
- Max Users: Unlimited
- Max Products: Unlimited
- Features: all

## Database Schema

### mediasoft_identitas
```sql
- license_key: string
- license_status: 'active' | 'expired' | 'suspended' | 'revoked'
- license_plan: 'free' | 'basic' | 'pro' | 'enterprise'
- license_expires_at: datetime
- max_users: number
- max_products: number
- features: json
```

### mediasoft_pengguna
```sql
- status: 'active' | 'inactive' | 'suspended'
```

## Flow Penggunaan

### 1. Aktivasi License (Developer Panel)
1. Buka Developer Panel
2. Go to License Management
3. Click "Activate License"
4. Enter license key
5. License activated untuk 1 tahun

### 2. Suspend User (Developer Panel)
1. Buka Developer Panel
2. Go to User Management
3. Click suspend icon pada user
4. User tidak bisa login di User Panel

### 3. Change Plan (Developer Panel)
1. Buka Developer Panel
2. Go to License Management
3. Click plan yang diinginkan (free/basic/pro/enterprise)
4. Limits updated otomatis

### 4. User Panel Check License
1. User Panel start
2. LicenseGuard check license
3. Jika valid: app berjalan normal
4. Jika invalid/expired/suspended: show error screen
5. Auto re-check setiap 5 menit

## Security

- Developer Panel hanya bisa diakses oleh role `developer` dan `super_admin`
- User Panel akan ter-block jika license invalid
- Semua perubahan license langsung affect User Panel
- Shared database dengan access control di level aplikasi

## Testing

### Test License Flow
1. Start Developer Panel: `pnpm dev:developer`
2. Start User Panel: `pnpm dev:user`
3. Di Developer Panel, suspend license
4. User Panel akan show error screen
5. Di Developer Panel, activate license
6. User Panel bisa digunakan lagi (setelah 5 menit atau restart)

### Test User Suspend
1. Di Developer Panel, suspend user
2. User tidak bisa login di User Panel
3. Di Developer Panel, activate user
4. User bisa login lagi
