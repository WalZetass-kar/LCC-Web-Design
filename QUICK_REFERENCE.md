# 🚀 Quick Reference Guide - MediaSoft POS

## 📚 Documentation Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `README.md` | Project overview & setup | First time setup |
| `SECURITY_IMPLEMENTATION_GUIDE.md` | Security features & usage | Implementing security |
| `COMPLETE_IMPLEMENTATION_PLAN.md` | Full roadmap & timeline | Planning work |
| `IMPLEMENTATION_SUMMARY.md` | What's done & what's next | Quick status check |
| `TODO.md` | Detailed task list | Daily development |
| `CHANGELOG.md` | Version history | Understanding changes |
| `QUICK_REFERENCE.md` | This file | Quick lookups |

---

## 🔐 Security Quick Reference

### Password Requirements
```
Minimum: 8 characters
Required: Uppercase + Lowercase + Number
Recommended: Special characters
```

### Rate Limiting
```
Max Attempts: 5
Lockout Duration: 15 minutes
Attempt Window: 5 minutes
```

### Session Timeout
```
Inactivity Timeout: 30 minutes
Warning Time: 29 minutes (1 min before)
```

### Common Security Functions

```typescript
// Hash password
const hash = await hashPassword('MyPassword123')

// Verify password
const valid = await verifyPassword('MyPassword123', hash)

// Check if locked
const { locked, remainingTime } = rateLimiter.isLocked(username)

// Sanitize input
const safe = sanitizeString(userInput)

// Validate email
const { valid, email } = sanitizeEmail(emailInput)

// Validate password strength
const { valid, message, strength } = validatePasswordStrength(password)
```

---

## 🗄️ Database Quick Reference

### Run Migrations
```bash
# Add password_hash_type column
sqlite3 sistem_pos.db < MIGRATION_PASSWORD_HASH_TYPE.sql

# Create performance indexes
sqlite3 sistem_pos.db < CREATE_INDEXES.sql
```

### Common Queries
```sql
-- Check password hash types
SELECT nama_pengguna, password_hash_type FROM mediasoft_pengguna;

-- Check migration status
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN password_hash_type = 'bcrypt' THEN 1 ELSE 0 END) as migrated,
  SUM(CASE WHEN password_hash_type = 'sha1' THEN 1 ELSE 0 END) as pending
FROM mediasoft_pengguna;

-- View recent activity logs
SELECT * FROM mediasoft_activity_log 
ORDER BY tgl_aktivitas DESC 
LIMIT 10;

-- Check unread notifications
SELECT * FROM mediasoft_notifikasi 
WHERE dibaca = 0 
ORDER BY tgl_dibuat DESC;

-- View active kas
SELECT * FROM mediasoft_kas_drawer 
WHERE status = 'OPEN';
```

---

## 🔌 IPC Handlers Quick Reference

### Authentication
```typescript
// Login
await window.api.invoke('auth:login', username, password)

// Logout
await window.api.invoke('auth:logout', username)

// Change password
await window.api.invoke('auth:change-password', username, oldPassword, newPassword)

// Migration status
await window.api.invoke('auth:migration-status')
```

### Customer
```typescript
// Get all customers
await window.api.invoke('customer:get-all')

// Create customer
await window.api.invoke('customer:create', customerData)

// Add loyalty points
await window.api.invoke('customer:add-poin', kdCustomer, poin)
```

### Notifikasi
```typescript
// Get unread count
await window.api.invoke('notifikasi:get-unread-count', username)

// Mark as read
await window.api.invoke('notifikasi:mark-as-read', kdNotifikasi)

// Mark all as read
await window.api.invoke('notifikasi:mark-all-as-read', username)
```

### Kas
```typescript
// Buka kas
await window.api.invoke('kas:buka', { username, modal_awal })

// Tutup kas
await window.api.invoke('kas:tutup', { kd_kas, saldo_akhir, catatan })

// Get kas aktif
await window.api.invoke('kas:get-aktif', username)
```

### Pembelian
```typescript
// Get all purchase orders
await window.api.invoke('pembelian:get-all')

// Create PO
await window.api.invoke('pembelian:create', poData)

// Get detail
await window.api.invoke('pembelian:get-detail', kdPembelian)
```

### Backup
```typescript
// Create backup
await window.api.invoke('backup:create', { keterangan })

// Restore backup
await window.api.invoke('backup:restore', namaFile)

// Download backup
await window.api.invoke('backup:download', namaFile)
```

### Laporan
```typescript
// Laporan penjualan
await window.api.invoke('laporan:penjualan', { startDate, endDate, periode })

// Laporan laba rugi
await window.api.invoke('laporan:laba-rugi', { startDate, endDate })

// Produk terlaris
await window.api.invoke('laporan:produk-terlaris', { startDate, endDate, limit })
```

### Export
```typescript
// Export to Excel
await window.api.invoke('export:excel', { data, filename })

// Export to PDF
await window.api.invoke('export:pdf', { data, filename })
```

---

## 🎨 Component Usage Quick Reference

### Button
```tsx
import { Button } from '../components/Button'

<Button onClick={handleClick}>Click Me</Button>
<Button variant="primary" icon={Plus}>Add</Button>
<Button variant="danger" loading={isLoading}>Delete</Button>
<Button variant="outline" disabled>Disabled</Button>
```

### Modal
```tsx
import { Modal } from '../components/Modal'

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="large"
>
  <div>Modal content</div>
</Modal>
```

### Input
```tsx
import { Input } from '../components/Input'

<Input
  icon={Search}
  placeholder="Search..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
```

### DataTable
```tsx
import { DataTable } from '../components/DataTable'

<DataTable
  columns={columns}
  data={data}
  loading={loading}
  emptyMessage="No data"
/>
```

### Badge
```tsx
import { Badge } from '../components/Badge'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Inactive</Badge>
```

### ErrorBoundary
```tsx
import { ErrorBoundary } from '../components/ErrorBoundary'

<ErrorBoundary>
  <App />
</ErrorBoundary>

// Or with HOC
const SafeComponent = withErrorBoundary(MyComponent)
```

---

## 🛠️ Common Development Tasks

### Add New Page
1. Create page file: `src/renderer/pages/MyPage.tsx`
2. Add route in router
3. Add menu item in navigation
4. Test in browser

### Add New IPC Handler
1. Add handler in `src/main/ipcHandlers.ts`
2. Call from frontend: `window.api.invoke('handler-name', ...args)`
3. Test functionality

### Add New Controller Method
1. Add method in controller
2. Add IPC handler
3. Call from frontend
4. Test end-to-end

### Debug Issues
```bash
# Check logs
tail -f logs/error-$(date +%Y-%m-%d).log

# Check database
sqlite3 sistem_pos.db
> SELECT * FROM mediasoft_activity_log ORDER BY tgl_aktivitas DESC LIMIT 10;

# Check console
# Open DevTools in Electron app (Ctrl+Shift+I)
```

---

## 📊 Project Structure Quick Reference

```
mediasoft-pos/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # Main entry
│   │   ├── preload.cjs         # Preload script
│   │   └── ipcHandlers.ts      # IPC handlers
│   ├── backend/                # Backend logic
│   │   ├── controllers/        # Business logic
│   │   ├── models/             # Database models
│   │   └── services/           # Services
│   │       ├── crypto.ts       # Password hashing, encryption
│   │       ├── rateLimiter.ts  # Brute force protection
│   │       ├── sessionManager.ts # Session timeout
│   │       ├── sanitizer.ts    # Input sanitization
│   │       ├── errorHandler.ts # Error handling
│   │       ├── scheduler.ts    # Cron jobs
│   │       ├── export.ts       # Excel/PDF export
│   │       └── validation.ts   # Zod validation
│   ├── database/               # Database
│   │   ├── connection.ts       # SQLite connection
│   │   └── schema.ts           # Drizzle schema
│   ├── renderer/               # React frontend
│   │   ├── components/         # Reusable components
│   │   ├── contexts/           # React contexts
│   │   ├── pages/              # Page components
│   │   ├── styles/             # Global styles
│   │   └── utils/              # Utility functions
│   └── shared/                 # Shared types
│       └── types.ts            # TypeScript interfaces
├── logs/                       # Error logs
├── sistem_pos.db               # SQLite database
├── MIGRATION_PASSWORD_HASH_TYPE.sql  # Migration script
├── CREATE_INDEXES.sql          # Index creation script
└── Documentation files
```

---

## 🚀 Quick Setup

### Automated Setup (Recommended)
```bash
# Linux/Mac
chmod +x setup.sh
./setup.sh

# Windows
setup.bat
```

### Manual Setup
```bash
# 1. Backup database
cp sistem_pos.db sistem_pos_backup.db

# 2. Run database setup (all-in-one)
sqlite3 sistem_pos.db < SETUP_DATABASE.sql

# 3. Install dependencies
npm install

# 4. Rebuild native modules
npx electron-rebuild

# 5. Start application
npm run dev
```

### Troubleshooting Setup
See `SETUP_GUIDE.md` for detailed troubleshooting.

---

### Login Issues
```
Problem: Can't login
Check:
1. Is password correct?
2. Is account active? (status_user = 'Aktif')
3. Is account locked? (check rate limiter)
4. Check activity logs for failed attempts
```

### Database Issues
```
Problem: Database locked
Solution:
1. Close all connections
2. Restart application
3. Check for long-running queries
```

### Build Issues
```
Problem: NODE_MODULE_VERSION mismatch
Solution:
npx electron-rebuild
```

### Performance Issues
```
Problem: Slow queries
Solution:
1. Run CREATE_INDEXES.sql
2. Run ANALYZE
3. Check query execution plan
```

---

## 📞 Getting Help

1. **Check Documentation**
   - Read relevant .md files
   - Check code comments
   - Review examples

2. **Check Logs**
   - Error logs: `logs/error-YYYY-MM-DD.log`
   - Activity logs: Database table
   - Console logs: DevTools

3. **Check Database**
   - Activity logs
   - Notification table
   - User status

4. **Search Code**
   - Use grep/search for similar code
   - Check existing implementations
   - Follow patterns

---

## 🎯 Quick Commands

```bash
# Development
npm run dev              # Run dev server
npm run build            # Build for production

# Database
sqlite3 sistem_pos.db    # Open database
sqlite3 sistem_pos.db < script.sql  # Run SQL script

# Dependencies
npm install              # Install dependencies
npx electron-rebuild     # Rebuild native modules

# Testing (when implemented)
npm test                 # Run tests
npm run test:coverage    # Run with coverage

# Linting (when implemented)
npm run lint             # Run linter
npm run lint:fix         # Fix linting issues
```

---

## 📈 Progress Tracking

### Current Status
- ✅ Security: 100%
- ⏳ Frontend: 40%
- ⏳ Testing: 0%
- ⏳ Performance: 10%
- ⏳ Documentation: 60%

### Next Priorities
1. Complete missing frontend pages
2. Add session management to frontend
3. Write unit tests
4. Optimize performance

---

**Last Updated:** 2026-04-28
**Version:** 4.0.0
**Maintainer:** Development Team
