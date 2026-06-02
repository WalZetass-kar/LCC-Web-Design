import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import LicenseGuard from './components/LicenseGuard';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import Produk from './pages/Produk';
import Kategori from './pages/Kategori';
import Satuan from './pages/Satuan';
import Supplier from './pages/Supplier';
import Customer from './pages/Customer';
import Pembelian from './pages/Pembelian';
import Riwayat from './pages/Riwayat';
import Returns from './pages/Returns';
import Kas from './pages/Kas';
import Shifts from './pages/Shifts';
import Debts from './pages/Debts';
import StockOpname from './pages/StockOpname';
import Laporan from './pages/Laporan';
import Hpp from './pages/Hpp';
import WhatsApp from './pages/WhatsApp';
import PrintQueue from './pages/PrintQueue';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import Users from './pages/Users';
import ActivityLog from './pages/ActivityLog';
import Promo from './pages/Promo';
import Tax from './pages/Tax';
import Loyalty from './pages/Loyalty';
import Branch from './pages/Branch';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <LicenseGuard>
            <BrowserRouter>
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
          </BrowserRouter>
          </LicenseGuard>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
