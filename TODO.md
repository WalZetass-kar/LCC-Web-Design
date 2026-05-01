# 📝 TODO List - MediaSoft POS

## 🔴 CRITICAL (Do First)

### 1. Database Migrations
- [ ] Run `sqlite3 sistem_pos.db < SETUP_DATABASE.sql` (all-in-one)
  OR run separately:
  - [ ] Run `sqlite3 sistem_pos.db < MIGRATION_PASSWORD_HASH_TYPE.sql`
  - [ ] Run `sqlite3 sistem_pos.db < CREATE_INDEXES.sql`
- [ ] Verify migrations with `SELECT * FROM mediasoft_pengguna LIMIT 1;`

**Easy Way (Recommended):**
```bash
# Linux/Mac
chmod +x setup.sh
./setup.sh

# Windows
setup.bat
```

### 2. Update IPC Handlers
File: `src/main/ipcHandlers.ts`

Add these handlers:
```typescript
// Enhanced auth handlers
ipcMain.handle('auth:login', async (event, username, password) => {
  return await AuthController.login(username, password, '127.0.0.1')
})

ipcMain.handle('auth:logout', async (event, username) => {
  return AuthController.logout(username, '127.0.0.1')
})

ipcMain.handle('auth:change-password', async (event, username, oldPassword, newPassword) => {
  return await AuthController.changePassword(username, oldPassword, newPassword, '127.0.0.1')
})

ipcMain.handle('auth:migration-status', async () => {
  return AuthController.getMigrationStatus()
})

// Error logging
ipcMain.handle('log-error', async (event, errorData) => {
  errorHandler.log(
    new Error(errorData.message),
    ErrorSeverity.ERROR,
    'RENDERER',
    undefined,
    errorData
  )
  return { success: true }
})

// Session management
ipcMain.handle('session:create', async (event, username, role) => {
  const sessionId = sessionManager.createSession(username, role)
  return { success: true, data: { sessionId } }
})

ipcMain.handle('session:validate', async (event, sessionId) => {
  const validation = sessionManager.validateSession(sessionId)
  return { success: true, data: validation }
})

ipcMain.handle('session:update-activity', async (event, sessionId) => {
  const updated = sessionManager.updateActivity(sessionId)
  return { success: updated }
})

ipcMain.handle('session:destroy', async (event, sessionId) => {
  sessionManager.destroySession(sessionId)
  return { success: true }
})
```

### 3. Update Frontend Login
File: `src/renderer/pages/Login.tsx`

- [ ] Show remaining attempts on failed login
- [ ] Display lockout message with countdown
- [ ] Show password migration success message
- [ ] Add password strength indicator for change password

### 4. Wrap App with ErrorBoundary
File: `src/renderer/main.tsx`

```tsx
import { ErrorBoundary } from './components/ErrorBoundary'

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

---

## 🟠 HIGH PRIORITY (This Week)

### 5. Complete Missing Frontend Pages

#### A. PembelianCreate Page
File: `src/renderer/pages/PembelianCreate.tsx`

Features needed:
- [ ] Supplier selection dropdown
- [ ] Product search and add to cart
- [ ] Quantity input
- [ ] Price input (harga beli)
- [ ] Total calculation
- [ ] Payment amount input
- [ ] Status selection (LUNAS/HUTANG)
- [ ] Notes field
- [ ] Save button
- [ ] Cancel button
- [ ] Validation

#### B. ActivityLog Page
File: `src/renderer/pages/ActivityLog.tsx`

Features needed:
- [ ] List all activities with pagination
- [ ] Filter by username dropdown
- [ ] Filter by module dropdown
- [ ] Filter by date range
- [ ] Search by keyword
- [ ] Export to Excel button
- [ ] Activity details modal
- [ ] Color-coded by activity type
- [ ] Admin only access check

#### C. Notifikasi Page
File: `src/renderer/pages/Notifikasi.tsx`

Features needed:
- [ ] List all notifications with pagination
- [ ] Filter by type (STOK, EXPIRED, SYSTEM, INFO)
- [ ] Filter by read/unread
- [ ] Mark as read button
- [ ] Mark all as read button
- [ ] Delete notification button
- [ ] Notification details
- [ ] Link to related page (if applicable)
- [ ] Real-time updates

#### D. NotificationBell Component
File: `src/renderer/components/NotificationBell.tsx`

Features needed:
- [ ] Bell icon in topbar
- [ ] Unread count badge
- [ ] Dropdown on click
- [ ] Show recent 5 notifications
- [ ] Mark as read on click
- [ ] "View All" link to Notifikasi page
- [ ] Real-time updates
- [ ] Sound notification (optional)

### 6. Add Routes
File: `src/renderer/main.tsx` or router file

```tsx
<Route path="/pembelian" element={<Pembelian />} />
<Route path="/pembelian/create" element={<PembelianCreate />} />
<Route path="/backup" element={<Backup />} />
<Route path="/activity-log" element={<ActivityLog />} />
<Route path="/notifikasi" element={<Notifikasi />} />
```

### 7. Update Navigation Menu
Add menu items for:
- [ ] Pembelian
- [ ] Backup
- [ ] Activity Log (Admin only)
- [ ] Notifikasi (with badge)

---

## 🟡 MEDIUM PRIORITY (Next 2 Weeks)

### 8. Enhance Existing Pages

#### A. Customer Page Enhancement
File: `src/renderer/pages/Customer.tsx`

- [ ] Add loyalty points display in list
- [ ] Add birthday field in form
- [ ] Add total belanja display
- [ ] Add customer transaction history modal
- [ ] Add points redemption UI
- [ ] Add birthday reminder indicator
- [ ] Add birthday filter

#### B. Kas Page Enhancement
File: `src/renderer/pages/Kas.tsx`

- [ ] Add "Buka Kas" button and modal
- [ ] Add "Tutup Kas" button and modal
- [ ] Add reconciliation form in tutup kas
- [ ] Add pengeluaran/pemasukan form
- [ ] Add kas summary dashboard
- [ ] Add selisih kas indicator (red if negative)
- [ ] Add kas history table
- [ ] Add filter by date range

#### C. Laporan Page Enhancement
File: `src/renderer/pages/Laporan.tsx`

- [ ] Add report type selector
- [ ] Add date range picker
- [ ] Add Laporan Penjualan
- [ ] Add Laporan Laba Rugi
- [ ] Add Laporan Stok
- [ ] Add Laporan Kas
- [ ] Add Laporan Customer
- [ ] Add Produk Terlaris
- [ ] Add charts (using recharts)
- [ ] Add export buttons (Excel, PDF)
- [ ] Add print preview

#### D. Users Page Enhancement
File: `src/renderer/pages/Users.tsx`

- [ ] Add role selector in form (ADMIN, KASIR, OWNER)
- [ ] Add email and phone fields
- [ ] Add password change modal
- [ ] Add password reset button
- [ ] Add status toggle (Aktif/Nonaktif)
- [ ] Add last login display
- [ ] Add "View Activity Log" button per user
- [ ] Add password strength indicator

### 9. Session Management Frontend

#### A. Create useSession Hook
File: `src/renderer/hooks/useSession.ts`

```tsx
export function useSession() {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  useEffect(() => {
    // Update activity on user interaction
    // Check session every minute
    // Show warning if needed
  }, [])

  return { showWarning, remainingTime }
}
```

#### B. Create SessionWarning Component
File: `src/renderer/components/SessionWarning.tsx`

- [ ] Modal that shows before timeout
- [ ] Countdown timer
- [ ] "Stay Logged In" button
- [ ] "Logout" button

#### C. Integrate in App
- [ ] Use useSession hook in main layout
- [ ] Show SessionWarning when needed
- [ ] Auto-logout on timeout
- [ ] Redirect to login with timeout message

---

## 🟢 LOW PRIORITY (Next Month)

### 10. Testing Infrastructure

#### A. Setup Vitest
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
```

#### B. Write Unit Tests
- [ ] Test crypto service
- [ ] Test rateLimiter service
- [ ] Test sessionManager service
- [ ] Test sanitizer service
- [ ] Test errorHandler service
- [ ] Test AuthController
- [ ] Test all other controllers
- [ ] Test all models
- [ ] Test React components

Target: 70%+ code coverage

#### C. Setup E2E Tests
```bash
npm install --save-dev playwright @playwright/test
```

Write E2E tests for:
- [ ] Login flow
- [ ] Create product flow
- [ ] Create transaction flow
- [ ] Create purchase order flow
- [ ] Backup and restore flow

### 11. Performance Optimization

#### A. Code Splitting
File: `src/renderer/main.tsx`

```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transaksi = lazy(() => import('./pages/Transaksi'))
// ... other pages

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* routes */}
      </Routes>
    </Suspense>
  )
}
```

#### B. Setup React Query
```bash
npm install @tanstack/react-query
```

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
    },
  },
})

// Wrap app
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

#### C. Add Debouncing
File: `src/renderer/hooks/useDebounce.ts`

```tsx
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

Use in search inputs:
```tsx
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  fetchData(debouncedSearch)
}, [debouncedSearch])
```

#### D. Virtual Scrolling
```bash
npm install @tanstack/react-virtual
```

Use for large lists (>100 items)

### 12. Missing Features

#### A. Barcode Scanner Integration
- [ ] Create BarcodeScanner service
- [ ] Add USB scanner support
- [ ] Add Bluetooth scanner support
- [ ] Add manual barcode input
- [ ] Add barcode search in transactions
- [ ] Add barcode label generation
- [ ] Add print barcode labels

#### B. Expired Date Tracking
- [ ] Add expired date input in product form
- [ ] Add daily check in scheduler (already exists)
- [ ] Add expired products dashboard widget
- [ ] Add expiring products alert (7 days before)
- [ ] Prevent selling expired products
- [ ] Add expired products report

#### C. Tax Calculation
- [ ] Add tax percentage in settings
- [ ] Add tax calculation in transaction
- [ ] Display tax on receipt
- [ ] Add monthly tax report
- [ ] Add NPWP field in store identity

#### D. Email Notifications
```bash
npm install nodemailer
```

- [ ] Add SMTP configuration in settings
- [ ] Add email templates
- [ ] Send low stock alerts
- [ ] Send expiring products alerts
- [ ] Send daily sales summary
- [ ] Send birthday greetings
- [ ] Send backup failure alerts

#### E. Loyalty Points System
- [ ] Auto calculate points (1 point per Rp 10,000)
- [ ] Display points on customer profile
- [ ] Add points redemption in transaction
- [ ] Add loyalty points report
- [ ] Add points expiration (optional)

---

## 📚 Documentation Tasks

### 13. Code Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Add inline comments for complex logic
- [ ] Document all interfaces and types
- [ ] Document IPC handlers

### 14. Technical Documentation
- [ ] Create architecture diagram
- [ ] Create database schema diagram (ERD)
- [ ] Create API documentation
- [ ] Create developer onboarding guide
- [ ] Create deployment guide

### 15. User Documentation
- [ ] Create user manual with screenshots
- [ ] Create quick start guide
- [ ] Create feature tutorials
- [ ] Create troubleshooting guide
- [ ] Create FAQ

---

## ✅ Completed Tasks

- [x] Bcrypt password hashing
- [x] SHA1 to bcrypt migration
- [x] Rate limiting service
- [x] Session management service
- [x] Input sanitization service
- [x] Centralized error handler
- [x] React Error Boundary
- [x] AES-256 encryption
- [x] Enhanced AuthController
- [x] Database schema update
- [x] Migration scripts
- [x] Performance indexes
- [x] Security documentation
- [x] Implementation plan
- [x] Pembelian list page
- [x] Backup & Restore page

---

## 📊 Progress Tracking

### Overall Progress: 35%
- Security: 100% ✅
- Frontend: 40% ⏳
- Testing: 0% ⏳
- Performance: 10% ⏳
- Documentation: 60% ⏳

### This Week's Goal: 50%
Focus on completing all missing frontend pages

### This Month's Goal: 70%
Complete frontend, add testing, optimize performance

---

## 🎯 Definition of Done

A task is considered done when:
- [ ] Code is written and tested
- [ ] No console errors or warnings
- [ ] Works in both light and dark mode
- [ ] Responsive on different screen sizes
- [ ] Error handling is implemented
- [ ] Loading states are shown
- [ ] Empty states are shown
- [ ] Success/error messages are displayed
- [ ] Code is commented (if complex)
- [ ] Git commit is made with clear message

---

**Last Updated:** 2026-04-28
**Next Review:** Weekly
**Assignee:** Next Developer
