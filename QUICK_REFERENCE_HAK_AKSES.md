# 🚀 Quick Reference: Hak Akses MediaSoft POS

## 📋 Struktur Hak Akses

| Hak Akses | Level | Deskripsi | Akses |
|-----------|-------|-----------|-------|
| `developer` | 5 | Developer/Programmer | Full access + development tools |
| `superadmin` | 4 | Super Administrator | Full access to all features |
| `admin` | 3 | Administrator | Manage users, products, reports |
| `operator` | 2 | Operator | Manage products, transactions |
| `kasir` | 1 | Kasir (Default) | Basic POS operations |

## 🔐 Login Credentials

### User yang Tersedia

| Username | Password | Hak Akses | Nama Lengkap |
|----------|----------|-----------|--------------|
| `admin` | `admin123` | admin | Admin Super |
| `Developer` | (reset dulu) | developer | Jean Riko Kurniawan Putra |
| `OP` | (reset dulu) | operator | OPERATOR |
| `KASIR` | (reset dulu) | kasir | KASIR |
| `superadmin` | (reset dulu) | superadmin | SUPERMAN |

## 🛠️ Kiro CLI Commands

### Lihat User
```bash
node kiro-cli.cjs list
```

### Reset Password
```bash
node kiro-cli.cjs reset <username> <password>

# Contoh
node kiro-cli.cjs reset admin admin123
node kiro-cli.cjs reset Developer dev123
```

### Buat User Baru
```bash
node kiro-cli.cjs create <username> <password> <nama> [hak_akses]

# Contoh
node kiro-cli.cjs create kasir1 kasir123 "Kasir Satu" kasir
node kiro-cli.cjs create admin2 admin123 "Admin Dua" admin
node kiro-cli.cjs create dev1 dev123 "Developer" developer
```

### Info Database
```bash
node kiro-cli.cjs info
```

## 💻 Code Examples

### Check Hak Akses di Frontend

```typescript
// AuthContext atau komponen lain
const { user } = useAuth()

// Check admin
if (user.hak_akses === 'admin' || user.hak_akses === 'superadmin') {
  // Admin features
}

// Check kasir
if (user.hak_akses === 'kasir') {
  // Kasir features only
}

// Check developer
if (user.hak_akses === 'developer') {
  // Development tools
}
```

### Authorization Helper

```typescript
// utils/auth.ts
export const hasAccess = (userHakAkses: string, requiredLevel: string[]) => {
  return requiredLevel.includes(userHakAkses)
}

// Usage
if (hasAccess(user.hak_akses, ['admin', 'superadmin'])) {
  // Show admin menu
}
```

### Protected Route

```typescript
// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredHakAkses?: string[]
}

export const ProtectedRoute = ({ children, requiredHakAkses }: ProtectedRouteProps) => {
  const { user } = useAuth()
  
  if (requiredHakAkses && !requiredHakAkses.includes(user.hak_akses)) {
    return <Navigate to="/unauthorized" />
  }
  
  return <>{children}</>
}

// Usage
<Route path="/users" element={
  <ProtectedRoute requiredHakAkses={['admin', 'superadmin']}>
    <UsersPage />
  </ProtectedRoute>
} />
```

## 🗄️ Database Query

### Select dengan Hak Akses

```sql
-- Semua user dengan hak akses admin
SELECT * FROM mediasoft_pengguna WHERE hak_akses = 'admin';

-- User aktif dengan hak akses kasir
SELECT * FROM mediasoft_pengguna 
WHERE hak_akses = 'kasir' AND status_user = 'Aktif';

-- Count per hak akses
SELECT hak_akses, COUNT(*) as total 
FROM mediasoft_pengguna 
GROUP BY hak_akses;
```

### Update Hak Akses

```sql
-- Upgrade kasir ke operator
UPDATE mediasoft_pengguna 
SET hak_akses = 'operator' 
WHERE nama_pengguna = 'kasir1';

-- Downgrade admin ke kasir
UPDATE mediasoft_pengguna 
SET hak_akses = 'kasir' 
WHERE nama_pengguna = 'admin2';
```

## 🎯 Best Practices

### 1. **Principle of Least Privilege**
Berikan hak akses minimal yang dibutuhkan:
- Kasir baru → `kasir`
- Staff inventory → `operator`
- Manager → `admin`
- Owner → `superadmin`

### 2. **Password Policy**
- Minimal 8 karakter
- Kombinasi huruf, angka, simbol
- Ganti password secara berkala
- Jangan share password

### 3. **Audit Trail**
Semua aktivitas user dicatat di `mediasoft_activity_log`:
```sql
SELECT * FROM mediasoft_activity_log 
WHERE username = 'admin' 
ORDER BY tgl_aktivitas DESC 
LIMIT 10;
```

### 4. **Session Management**
- Session timeout: 30 menit
- Warning: 29 menit (1 menit sebelum timeout)
- Auto logout saat inactive

## 🔄 Migration Checklist

Jika Anda migrasi dari `role` ke `hak_akses`:

- [x] Run `MIGRATE_TO_HAK_AKSES.sql`
- [x] Update backend code
- [x] Update Kiro CLI
- [ ] Update frontend components
- [ ] Update AuthContext
- [ ] Update Sidebar/Navigation
- [ ] Update ProtectedRoute
- [ ] Test login flow
- [ ] Test authorization
- [ ] Update documentation

## 📚 Related Files

- `HAK_AKSES_MIGRATION_SUMMARY.md` - Detailed migration guide
- `KIRO_CLI_README.md` - Kiro CLI documentation
- `LOGIN_FIX_GUIDE.md` - Login troubleshooting
- `MIGRATE_TO_HAK_AKSES.sql` - Migration script

---

**Last Updated**: 2026-05-01
**Version**: 1.0
**Status**: ✅ Backend Complete, Frontend Pending
