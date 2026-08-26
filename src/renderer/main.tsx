import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import './i18n' // initialize i18next
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { DemoProvider } from './contexts/DemoContext'
import AppLayout from './layouts/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import RemoteLicensePopup from './components/RemoteLicensePopup'
import SplashScreen from './components/SplashScreen'
import { validateProductionConfig } from './utils/productionConfig'
import { registerDeepLinkHandlers } from './utils/deepLinks'
import { RequireAuth, RequireDeveloperPanel, RequireMinRole, RequireOperationalAdmin, RequireRoles } from '../apps/routing/RouteGuards'
import './styles/globals.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Produk = lazy(() => import('./pages/Produk'))
const Kategori = lazy(() => import('./pages/Kategori'))
const Satuan = lazy(() => import('./pages/Satuan'))
const Transaksi = lazy(() => import('./pages/Transaksi'))
const Riwayat = lazy(() => import('./pages/Riwayat'))
const Settings = lazy(() => import('./pages/Settings'))
const Supplier = lazy(() => import('./pages/Supplier'))
const Users = lazy(() => import('./pages/Users'))
const Customer = lazy(() => import('./pages/Customer'))
const Kas = lazy(() => import('./pages/Kas'))
const Accounting = lazy(() => import('./pages/Accounting'))
const Laporan = lazy(() => import('./pages/Laporan'))
const Backup = lazy(() => import('./pages/Backup'))
const Pembelian = lazy(() => import('./pages/Pembelian'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const Returns = lazy(() => import('./pages/Returns'))
const Shifts = lazy(() => import('./pages/Shifts'))
const Debts = lazy(() => import('./pages/Debts'))
const StockOpname = lazy(() => import('./pages/StockOpname'))
const Tutorials = lazy(() => import('./pages/Tutorials'))
const Hpp = lazy(() => import('./pages/Hpp'))
const Promo = lazy(() => import('./pages/Promo'))
const Branch = lazy(() => import('./pages/Branch'))
const Security = lazy(() => import('./pages/Security'))
const Loyalty = lazy(() => import('./pages/Loyalty'))
const WhatsApp = lazy(() => import('./pages/WhatsApp'))
const PrintQueue = lazy(() => import('./pages/PrintQueue'))
const EcommerceApi = lazy(() => import('./pages/EcommerceApi'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const LicenseCenter = lazy(() => import('./pages/LicenseCenter'))
const PaymentInvoice = lazy(() => import('./pages/PaymentInvoice'))
const PaymentAutomation = lazy(() => import('./pages/PaymentAutomation'))
const CustomerDisplay = lazy(() => import('./pages/CustomerDisplay'))
const StockTransfer = lazy(() => import('./pages/StockTransfer'))
const CustomerDisplayPage = lazy(() => import('./pages/CustomerDisplayPage'))
const DailyNotes = lazy(() => import('./pages/DailyNotes'))
const PriceList = lazy(() => import('./pages/PriceList'))
const StockHistory = lazy(() => import('./pages/StockHistory'))
const SupplierRating = lazy(() => import('./pages/SupplierRating'))
const MembershipCard = lazy(() => import('./pages/MembershipCard'))
const SalesCommission = lazy(() => import('./pages/SalesCommission'))
const TaxReport = lazy(() => import('./pages/TaxReport'))
const PettyCash = lazy(() => import('./pages/PettyCash'))
const CashFlow = lazy(() => import('./pages/CashFlow'))
const LabelPrint = lazy(() => import('./pages/LabelPrint'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'))
const Integrations = lazy(() => import('./pages/Integrations'))
const AuditTrail = lazy(() => import('./pages/AuditTrail'))

// New Feature Pages
const Employee = lazy(() => import('./pages/Employee'))
const EmployeeContract = lazy(() => import('./pages/EmployeeContract'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Payroll = lazy(() => import('./pages/Payroll'))
const TipPooling = lazy(() => import('./pages/TipPooling'))
const ShiftSchedule = lazy(() => import('./pages/ShiftSchedule'))
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay'))
const TableManagement = lazy(() => import('./pages/TableManagement'))
const Reservation = lazy(() => import('./pages/Reservation'))
const Recipe = lazy(() => import('./pages/Recipe'))
const Delivery = lazy(() => import('./pages/Delivery'))
const BankAccount = lazy(() => import('./pages/BankAccount'))
const FixedAsset = lazy(() => import('./pages/FixedAsset'))
const Budget = lazy(() => import('./pages/Budget'))
const GiftCard = lazy(() => import('./pages/GiftCard'))
const CustomerFeedback = lazy(() => import('./pages/CustomerFeedback'))
const Campaign = lazy(() => import('./pages/Campaign'))
const Storefront = lazy(() => import('./pages/Storefront'))

function ProductionConfigGate({ children }: { children: React.ReactNode }) {
  const validation = validateProductionConfig()
  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-xl font-bold">Konfigurasi production belum valid</h1>
          <p className="mt-3 text-sm text-red-100">{validation.message}</p>
          <p className="mt-4 text-xs text-slate-300">
            Isi `.env.production` dengan endpoint HTTPS produksi dan certificate pin sebelum build production digunakan.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function DeepLinkBridge() {
  const navigate = useNavigate()

  useEffect(() => registerDeepLinkHandlers(route => navigate(route)), [navigate])

  return null
}

function LegacyAppRedirect() {
  const { pathname, search, hash } = useLocation()
  const targetPath = pathname.replace(/^\/app(?=\/|$)/, '') || '/'
  return <Navigate to={`${targetPath}${search}${hash}`} replace />
}

function RouteFallback() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 animate-pulse">
      {/* Sidebar placeholder */}
      <aside className="hidden lg:flex lg:w-60 h-screen flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4 shrink-0">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="space-y-1 flex-1">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar placeholder */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded lg:hidden" />
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-3.5 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + table area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="h-40 flex items-end gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t-lg" style={{ height: `${25 + Math.random() * 60}%` }} />
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <HashRouter>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <DeepLinkBridge />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app/*" element={<LegacyAppRedirect />} />
          <Route path="/developer/*" element={<Navigate to="/license-admin" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/license" element={<Navigate to="/payment" replace />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/owner-dashboard" element={<Navigate to="/" replace />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/produk" element={<Produk />} />
            <Route path="/kategori" element={<Kategori />} />
            <Route path="/satuan" element={<Satuan />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="/supplier" element={<Supplier />} />
            <Route path="/customer" element={<Customer />} />
            <Route path="/kas" element={<Kas />} />
            <Route path="/accounting" element={<RequireMinRole minRole="admin"><Accounting /></RequireMinRole>} />
            <Route path="/laporan" element={<RequireMinRole minRole="admin"><Laporan /></RequireMinRole>} />
            <Route path="/pembelian" element={<Pembelian />} />
            <Route path="/users" element={<RequireRoles allowedRoles={['developer', 'super_admin', 'admin']}><Users /></RequireRoles>} />
            <Route path="/backup" element={<RequireOperationalAdmin><Backup /></RequireOperationalAdmin>} />
            <Route path="/activity-log" element={<RequireOperationalAdmin><ActivityLog /></RequireOperationalAdmin>} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/stock-opname" element={<StockOpname />} />
            <Route path="/advanced-inventory" element={<Navigate to="/branch" replace />} />
            <Route path="/subscription-plans" element={<Navigate to="/license-admin" replace />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/hpp" element={<Hpp />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/branch" element={<RequireRoles allowedRoles={['developer', 'super_admin', 'admin']}><Branch /></RequireRoles>} />
            <Route path="/security" element={<RequireOperationalAdmin><Security /></RequireOperationalAdmin>} />
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/print-queue" element={<PrintQueue />} />
            <Route path="/ecommerce-api" element={<RequireOperationalAdmin><EcommerceApi /></RequireOperationalAdmin>} />
            <Route path="/marketplace" element={<RequireOperationalAdmin><Marketplace /></RequireOperationalAdmin>} />
            <Route path="/payment" element={<PaymentInvoice />} />
            <Route path="/subscription" element={<PaymentInvoice />} />
            <Route path="/my-subscription" element={<PaymentInvoice />} />
            <Route path="/payment-automation" element={<RequireOperationalAdmin><PaymentAutomation /></RequireOperationalAdmin>} />
            <Route path="/stock-transfer" element={<RequireRoles allowedRoles={['developer', 'super_admin', 'admin']}><StockTransfer /></RequireRoles>} />
            <Route path="/customer-display-page" element={<CustomerDisplayPage />} />
            <Route path="/daily-notes" element={<DailyNotes />} />
            <Route path="/price-list" element={<PriceList />} />
            <Route path="/stock-history" element={<StockHistory />} />
            <Route path="/supplier-rating" element={<SupplierRating />} />
            <Route path="/membership-card" element={<MembershipCard />} />
            <Route path="/sales-commission" element={<SalesCommission />} />
            <Route path="/tax-report" element={<RequireMinRole minRole="admin"><TaxReport /></RequireMinRole>} />
            <Route path="/petty-cash" element={<PettyCash />} />
            <Route path="/cash-flow" element={<RequireMinRole minRole="admin"><CashFlow /></RequireMinRole>} />
            <Route path="/label-print" element={<LabelPrint />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/audit-trail" element={<RequireOperationalAdmin><AuditTrail /></RequireOperationalAdmin>} />
            <Route path="/license-admin" element={<RequireDeveloperPanel><LicenseCenter /></RequireDeveloperPanel>} />
            <Route path="/settings" element={<Settings />} />
            {/* ─── NEW FEATURE ROUTES ─────────────────────────────────── */}
            {/* HR & Employee */}
            <Route path="/employee" element={<Employee />} />
            <Route path="/employee-contract" element={<EmployeeContract />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/tip-pooling" element={<TipPooling />} />
            <Route path="/shift-schedule" element={<ShiftSchedule />} />
            {/* KDS & F&B */}
            <Route path="/kitchen-display" element={<KitchenDisplay />} />
            <Route path="/table-management" element={<TableManagement />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/recipe" element={<Recipe />} />
            {/* Delivery */}
            <Route path="/delivery" element={<Delivery />} />
            {/* Finance */}
            <Route path="/bank-account" element={<RequireMinRole minRole="admin"><BankAccount /></RequireMinRole>} />
            <Route path="/fixed-asset" element={<RequireMinRole minRole="admin"><FixedAsset /></RequireMinRole>} />
            <Route path="/budget" element={<RequireMinRole minRole="admin"><Budget /></RequireMinRole>} />
            {/* Marketing */}
            <Route path="/gift-card" element={<GiftCard />} />
            <Route path="/customer-feedback" element={<CustomerFeedback />} />
            <Route path="/campaign" element={<RequireRoles allowedRoles={['developer', 'super_admin', 'admin']}><Campaign /></RequireRoles>} />
            <Route path="/storefront" element={<RequireOperationalAdmin><Storefront /></RequireOperationalAdmin>} />
          </Route>
          <Route path="/customer-display" element={<CustomerDisplay />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ProductionConfigGate>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <DemoProvider>
                <App />
                <RemoteLicensePopup />
              </DemoProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </ProductionConfigGate>
    </ErrorBoundary>
  </React.StrictMode>
)
