import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import LicenseGuard from './components/LicenseGuard';
import { SkeletonSpinner } from './components/Skeleton';
import { ensureNotificationPermission } from './utils/nativePermissions';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const AppLayout = lazy(() => import('./layouts/AppLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transaksi = lazy(() => import('./pages/Transaksi'));
const Produk = lazy(() => import('./pages/Produk'));
const Kategori = lazy(() => import('./pages/Kategori'));
const Satuan = lazy(() => import('./pages/Satuan'));
const Supplier = lazy(() => import('./pages/Supplier'));
const Customer = lazy(() => import('./pages/Customer'));
const Pembelian = lazy(() => import('./pages/Pembelian'));
const Riwayat = lazy(() => import('./pages/Riwayat'));
const Returns = lazy(() => import('./pages/Returns'));
const Kas = lazy(() => import('./pages/Kas'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Debts = lazy(() => import('./pages/Debts'));
const StockOpname = lazy(() => import('./pages/StockOpname'));
const Laporan = lazy(() => import('./pages/Laporan'));
const Hpp = lazy(() => import('./pages/Hpp'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const PrintQueue = lazy(() => import('./pages/PrintQueue'));
const Backup = lazy(() => import('./pages/Backup'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Promo = lazy(() => import('./pages/Promo'));
const Tax = lazy(() => import('./pages/Tax'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const Branch = lazy(() => import('./pages/Branch'));

function App() {
  useEffect(() => {
    // Request notification permission on app launch (Android 13+)
    ensureNotificationPermission();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <LicenseGuard>
            <BrowserRouter>
              <Suspense fallback={<SkeletonSpinner label="Memuat halaman..." />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="transaksi" element={<Transaksi />} />
                    <Route path="produk" element={<Produk />} />
                    <Route path="kategori" element={<Kategori />} />
                    <Route path="satuan" element={<Satuan />} />
                    <Route path="supplier" element={<Supplier />} />
                    <Route path="customer" element={<Customer />} />
                    <Route path="pembelian" element={<Pembelian />} />
                    <Route path="riwayat" element={<Riwayat />} />
                    <Route path="returns" element={<Returns />} />
                    <Route path="kas" element={<Kas />} />
                    <Route path="shifts" element={<Shifts />} />
                    <Route path="debts" element={<Debts />} />
                    <Route path="stock-opname" element={<StockOpname />} />
                    <Route path="laporan" element={<Laporan />} />
                    <Route path="hpp" element={<Hpp />} />
                    <Route path="whatsapp" element={<WhatsApp />} />
                    <Route path="print-queue" element={<PrintQueue />} />
                    <Route path="backup" element={<Backup />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="users" element={<Users />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="promo" element={<Promo />} />
                    <Route path="tax" element={<Tax />} />
                    <Route path="loyalty" element={<Loyalty />} />
                    <Route path="branch" element={<Branch />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </LicenseGuard>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
