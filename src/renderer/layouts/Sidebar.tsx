import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, ShoppingCart, History, Settings, Store, LogOut, Truck, X,
  Users, UserCircle, Wallet, FileText, BarChart2, Database, ShoppingBag, Activity,
  RotateCcw, Clock, DollarSign, ClipboardCheck, Rocket
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'

export const MENU_GROUPS = [
  {
    label: 'Utama',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', code: 'nav_dashboard' },
      { to: '/transaksi', icon: ShoppingCart, label: 'Kasir', code: 'nav_penjualan' },
      { to: '/riwayat', icon: History, label: 'Riwayat', code: 'nav_penjualan' },
    ],
  },
  {
    label: 'Inventaris',
    items: [
      { to: '/produk', icon: Package, label: 'Produk', code: 'nav_barang' },
      { to: '/kategori', icon: Tag, label: 'Kategori', code: 'nav_barang' },
      { to: '/pembelian', icon: ShoppingBag, label: 'Pembelian', code: 'nav_pembelian' },
      { to: '/stock-opname', icon: ClipboardCheck, label: 'Stok Opname', code: 'nav_barang' },
    ],
  },
  {
    label: 'Relasi',
    items: [
      { to: '/supplier', icon: Truck, label: 'Supplier', code: 'nav_supplier' },
      { to: '/customer', icon: UserCircle, label: 'Customer', code: 'nav_supplier' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/kas', icon: Wallet, label: 'Kas', code: 'nav_pembelian' },
      { to: '/shifts', icon: Clock, label: 'Shift', code: 'nav_pembelian' },
      { to: '/debts', icon: DollarSign, label: 'Hutang/Piutang', code: 'nav_pembelian' },
      { to: '/returns', icon: RotateCcw, label: 'Return', code: 'nav_penjualan' },
      { to: '/laporan', icon: BarChart2, label: 'Laporan', code: 'nav_pembelian' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { to: '/users', icon: Users, label: 'Pengguna', code: 'nav_pengguna', adminOnly: true },
      { to: '/subscription-plans', icon: DollarSign, label: 'Paket Langganan', code: 'nav_plans', adminOnly: true },
      { to: '/activity-log', icon: Activity, label: 'Activity Log', code: 'nav_activity_log', adminOnly: true },
      { to: '/backup', icon: Database, label: 'Backup', code: 'nav_export_db', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Pengaturan', code: 'nav_identitas' },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isDemo: isDemoGuard, showPricing, remainingUsage } = useDemoGuard()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose()
  }

  const isDemo = user?.hak_akses === 'demo'
  // Demo users can SEE all menus (read-only exploration) — security is in IPC layer
  const isAdmin = isDemo || ['developer', 'superadmin'].includes(user?.hak_akses ?? '')

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 h-screen flex flex-col 
        glass border-r border-white/30 dark:border-slate-700/30 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/30 dark:border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">MediaSoft POS</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">by Ihwal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin space-y-4">
        {MENU_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => {
            if (item.adminOnly && !isAdmin) return false
            return true
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-lg shadow-primary-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 dark:hover:text-primary-400'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/30 dark:border-slate-700/30 space-y-2">
        {isDemo && (
          <>
            <button
              onClick={showPricing}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                bg-gradient-to-r from-violet-600 to-purple-500
                hover:from-violet-700 hover:to-purple-600
                text-white text-xs font-bold
                shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                transition-all duration-300 active:scale-[0.97]
                demo-upgrade-badge mb-1"
            >
              <Rocket size={14} />
              <span className="flex-1 text-left">Upgrade Sekarang</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px]">
                {remainingUsage} sisa
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
              <span className="text-[10px]">🔒</span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Demo Mode</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2 px-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isDemo ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-primary-500'}`}>
            {user?.nama_pengguna?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{user?.nama_lengkap ?? user?.nama_pengguna}</p>
            <p className={`text-xs truncate ${isDemo ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>{user?.hak_akses?.toUpperCase() ?? 'KASIR'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
