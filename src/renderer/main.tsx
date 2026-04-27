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
import './styles/globals.css'

/** Redirects to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
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
          <Route path="/users" element={<Users />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/kas" element={<Kas />} />
          <Route path="/laporan" element={<Laporan />} />
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
