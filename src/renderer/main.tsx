import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Produk from './pages/Produk'
import Kategori from './pages/Kategori'
import Transaksi from './pages/Transaksi'
import Riwayat from './pages/Riwayat'
import Settings from './pages/Settings'
import Supplier from './pages/Supplier'
import Users from './pages/Users'
import Customer from './pages/Customer'
import Kas from './pages/Kas'
import Laporan from './pages/Laporan'
import Backup from './pages/Backup'
import Pembelian from './pages/Pembelian'
import ActivityLog from './pages/ActivityLog'
import './styles/globals.css'

/** Redirects to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redirects to / if user hak_akses is not allowed */
function RequireRole({ children, minRole }: { children: React.ReactNode; minRole: string }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  
  // Hierarchy: developer > superadmin > admin > operator > kasir
  const hierarchy = ['developer', 'superadmin', 'admin', 'operator', 'kasir']
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
  if (!allowedRoles.includes(user.hak_akses ?? '')) return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <HashRouter>
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
          <Route path="/transaksi" element={<Transaksi />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="/supplier" element={<Supplier />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/kas" element={<Kas />} />
          <Route path="/laporan" element={<RequireRole minRole="admin"><Laporan /></RequireRole>} />
          <Route path="/pembelian" element={<Pembelian />} />
          <Route path="/users" element={<RequireExactRoles allowedRoles={['developer', 'superadmin']}><Users /></RequireExactRoles>} />
          <Route path="/backup" element={<RequireExactRoles allowedRoles={['developer', 'superadmin']}><Backup /></RequireExactRoles>} />
          <Route path="/activity-log" element={<RequireExactRoles allowedRoles={['developer', 'superadmin']}><ActivityLog /></RequireExactRoles>} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
)
