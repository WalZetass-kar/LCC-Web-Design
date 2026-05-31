import React, { lazy, Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './i18n' // initialize i18next
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { DemoProvider } from './contexts/DemoContext'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import RemoteLicensePopup from './components/RemoteLicensePopup'
import { validateProductionConfig } from './utils/productionConfig'
import { registerDeepLinkHandlers } from './utils/deepLinks'
import './styles/globals.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
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
const LicenseCenter = lazy(() => import('./pages/LicenseCenter'))
const PaymentInvoice = lazy(() => import('./pages/PaymentInvoice'))

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

/** Redirects to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redirects to / if user hak_akses is not allowed */
function RequireRole({ children, minRole }: { children: React.ReactNode; minRole: string }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  
  // Demo users can ACCESS role-gated operational pages (read-only) — security is in IPC layer
  if (user.hak_akses === 'demo') return <>{children}</>
  
  // Hierarchy: developer > admin > operator > kasir
  const hierarchy = ['developer', 'admin', 'operator', 'kasir']
  const userLevel = hierarchy.indexOf(user.hak_akses ?? 'kasir')
  const requiredLevel = hierarchy.indexOf(minRole)
  
  // Lower index = higher privilege
  if (userLevel > requiredLevel) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Redirects to / if user hak_akses is not in allowed roles (exact match) */
function RequireExactRoles({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.hak_akses === 'demo') return <Navigate to="/" replace />
  if (!allowedRoles.includes(user.hak_akses ?? '')) return <Navigate to="/" replace />
  return <>{children}</>
}

function DeepLinkBridge() {
  const navigate = useNavigate()

  useEffect(() => registerDeepLinkHandlers(route => navigate(route)), [navigate])

  return null
}

function RouteFallback() {
  return (
    <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Memuat halaman...
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
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/produk" element={<Produk />} />
            <Route path="/kategori" element={<Kategori />} />
            <Route path="/satuan" element={<Satuan />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="/supplier" element={<Supplier />} />
            <Route path="/customer" element={<Customer />} />
            <Route path="/kas" element={<Kas />} />
            <Route path="/laporan" element={<RequireRole minRole="admin"><Laporan /></RequireRole>} />
            <Route path="/pembelian" element={<Pembelian />} />
            <Route path="/users" element={<RequireExactRoles allowedRoles={['developer']}><Users /></RequireExactRoles>} />
            <Route path="/backup" element={<RequireExactRoles allowedRoles={['developer']}><Backup /></RequireExactRoles>} />
            <Route path="/activity-log" element={<RequireExactRoles allowedRoles={['developer']}><ActivityLog /></RequireExactRoles>} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/stock-opname" element={<StockOpname />} />
            <Route path="/subscription-plans" element={<Navigate to="/license-admin" replace />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/hpp" element={<Hpp />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/branch" element={<Branch />} />
            <Route path="/security" element={<Security />} />
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/print-queue" element={<PrintQueue />} />
            <Route path="/ecommerce-api" element={<EcommerceApi />} />
            <Route path="/payment" element={<PaymentInvoice />} />
            <Route path="/license-admin" element={<RequireExactRoles allowedRoles={['developer']}><LicenseCenter /></RequireExactRoles>} />
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
