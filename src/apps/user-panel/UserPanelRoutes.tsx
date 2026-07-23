import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { RequireDeveloperPanel, RequireMinRole, RequireOperationalAdmin, RequireRoles } from '../routing/RouteGuards'

const Dashboard = lazy(() => import('../../renderer/pages/Dashboard'))
const OwnerDashboard = lazy(() => import('../../renderer/pages/OwnerDashboard'))
const Assistant = lazy(() => import('../../renderer/pages/Assistant'))
const Produk = lazy(() => import('../../renderer/pages/Produk'))
const Kategori = lazy(() => import('../../renderer/pages/Kategori'))
const Satuan = lazy(() => import('../../renderer/pages/Satuan'))
const Transaksi = lazy(() => import('../../renderer/pages/Transaksi'))
const Riwayat = lazy(() => import('../../renderer/pages/Riwayat'))
const Settings = lazy(() => import('../../renderer/pages/Settings'))
const Supplier = lazy(() => import('../../renderer/pages/Supplier'))
const Users = lazy(() => import('../../renderer/pages/Users'))
const Customer = lazy(() => import('../../renderer/pages/Customer'))
const Kas = lazy(() => import('../../renderer/pages/Kas'))
const Accounting = lazy(() => import('../../renderer/pages/Accounting'))
const Laporan = lazy(() => import('../../renderer/pages/Laporan'))
const Backup = lazy(() => import('../../renderer/pages/Backup'))
const Pembelian = lazy(() => import('../../renderer/pages/Pembelian'))
const ActivityLog = lazy(() => import('../../renderer/pages/ActivityLog'))
const Returns = lazy(() => import('../../renderer/pages/Returns'))
const Shifts = lazy(() => import('../../renderer/pages/Shifts'))
const Debts = lazy(() => import('../../renderer/pages/Debts'))
const StockOpname = lazy(() => import('../../renderer/pages/StockOpname'))
const Tutorials = lazy(() => import('../../renderer/pages/Tutorials'))
const Hpp = lazy(() => import('../../renderer/pages/Hpp'))
const Promo = lazy(() => import('../../renderer/pages/Promo'))
const Branch = lazy(() => import('../../renderer/pages/Branch'))
const Loyalty = lazy(() => import('../../renderer/pages/Loyalty'))
const WhatsApp = lazy(() => import('../../renderer/pages/WhatsApp'))
const PrintQueue = lazy(() => import('../../renderer/pages/PrintQueue'))
const EcommerceApi = lazy(() => import('../../renderer/pages/EcommerceApi'))
const Marketplace = lazy(() => import('../../renderer/pages/Marketplace'))
const PaymentInvoice = lazy(() => import('../../renderer/pages/PaymentInvoice'))
const PaymentAutomation = lazy(() => import('../../renderer/pages/PaymentAutomation'))

export const USER_PANEL_LEGACY_PATHS = [
  'assistant',
  'owner-dashboard',
  'produk',
  'kategori',
  'satuan',
  'transaksi',
  'riwayat',
  'supplier',
  'customer',
  'kas',
  'accounting',
  'laporan',
  'pembelian',
  'users',
  'backup',
  'activity-log',
  'returns',
  'shifts',
  'debts',
  'stock-opname',
  'tutorials',
  'hpp',
  'promo',
  'branch',
  'loyalty',
  'whatsapp',
  'print-queue',
  'ecommerce-api',
  'marketplace',
  'payment',
  'payment-automation',
  'settings',
]

export function UserPanelRoutes() {
  return (
    <>
      <Route index element={<Dashboard />} />
      <Route path="owner-dashboard" element={<RequireMinRole minRole="admin"><OwnerDashboard /></RequireMinRole>} />
      <Route path="assistant" element={<Assistant />} />
      <Route path="produk" element={<Produk />} />
      <Route path="kategori" element={<Kategori />} />
      <Route path="satuan" element={<Satuan />} />
      <Route path="transaksi" element={<Transaksi />} />
      <Route path="riwayat" element={<Riwayat />} />
      <Route path="supplier" element={<Supplier />} />
      <Route path="customer" element={<Customer />} />
      <Route path="kas" element={<Kas />} />
      <Route path="accounting" element={<RequireMinRole minRole="admin"><Accounting /></RequireMinRole>} />
      <Route path="laporan" element={<RequireMinRole minRole="admin"><Laporan /></RequireMinRole>} />
      <Route path="pembelian" element={<Pembelian />} />
      <Route path="users" element={<RequireDeveloperPanel><Users /></RequireDeveloperPanel>} />
      <Route path="backup" element={<RequireOperationalAdmin><Backup /></RequireOperationalAdmin>} />
      <Route path="activity-log" element={<RequireOperationalAdmin><ActivityLog /></RequireOperationalAdmin>} />
      <Route path="returns" element={<Returns />} />
      <Route path="shifts" element={<Shifts />} />
      <Route path="debts" element={<Debts />} />
      <Route path="stock-opname" element={<StockOpname />} />
      <Route path="advanced-inventory" element={<Navigate to="/branch" replace />} />
      <Route path="subscription-plans" element={<Navigate to="/license-admin" replace />} />
      <Route path="tutorials" element={<Tutorials />} />
      <Route path="hpp" element={<Hpp />} />
      <Route path="promo" element={<Promo />} />
      <Route path="branch" element={<RequireRoles allowedRoles={['developer', 'super_admin', 'admin']}><Branch /></RequireRoles>} />
      <Route path="loyalty" element={<Loyalty />} />
      <Route path="whatsapp" element={<WhatsApp />} />
      <Route path="print-queue" element={<PrintQueue />} />
      <Route path="ecommerce-api" element={<RequireOperationalAdmin><EcommerceApi /></RequireOperationalAdmin>} />
      <Route path="marketplace" element={<RequireOperationalAdmin><Marketplace /></RequireOperationalAdmin>} />
      <Route path="payment" element={<RequireRoles allowedRoles={['admin','super_admin']}><PaymentInvoice /></RequireRoles>} />
      <Route path="payment-automation" element={<RequireOperationalAdmin><PaymentAutomation /></RequireOperationalAdmin>} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  )
}
