import React, { lazy, Suspense, useEffect } from 'react'
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
    <div className="space-y-4 p-3 sm:p-5 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-44 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-9 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
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
            <Route path="/payment-automation" element={<RequireOperationalAdmin><PaymentAutomation /></RequireOperationalAdmin>} />
            <Route path="/license-admin" element={<RequireDeveloperPanel><LicenseCenter /></RequireDeveloperPanel>} />
            <Route path="/settings" element={<Settings />} />
          </Route>
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
