import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Package, Tag, ShoppingCart, History, Settings, Store, LogOut, Truck, X,
  Users, UserCircle, Wallet, FileText, BarChart2, Database, ShoppingBag, Activity,
  RotateCcw, Clock, DollarSign, ClipboardCheck, Rocket, BookOpen, Calculator, Ruler, Gift, Building2, Shield, Award, MessageCircle, Printer, Globe, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import { api } from '../utils/api'

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
      { to: '/satuan', icon: Ruler, label: 'Satuan', code: 'nav_barang' },
      { to: '/pembelian', icon: ShoppingBag, label: 'Pembelian', code: 'nav_pembelian' },
      { to: '/stock-opname', icon: ClipboardCheck, label: 'Stok Opname', code: 'nav_barang' },
      { to: '/branch', icon: Building2, label: 'Cabang/Gudang', code: 'nav_branch', adminOnly: true },
    ],
  },
  {
    label: 'Relasi',
    items: [
      { to: '/supplier', icon: Truck, label: 'Supplier', code: 'nav_supplier' },
      { to: '/customer', icon: UserCircle, label: 'Customer', code: 'nav_supplier' },
      { to: '/loyalty', icon: Award, label: 'Loyalty', code: 'nav_loyalty' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/kas', icon: Wallet, label: 'Kas', code: 'nav_pembelian' },
      { to: '/shifts', icon: Clock, label: 'Shift', code: 'nav_pembelian' },
      { to: '/debts', icon: DollarSign, label: 'Hutang/Piutang', code: 'nav_pembelian' },
      { to: '/returns', icon: RotateCcw, label: 'Return', code: 'nav_penjualan' },
      { to: '/promo', icon: Gift, label: 'Promo', code: 'nav_promo' },
      { to: '/laporan', icon: BarChart2, label: 'Laporan', code: 'nav_pembelian' },
    ],
  },
  {
    label: 'Alat Bantu',
    items: [
      { to: '/tutorials', icon: BookOpen, label: 'Tutorial', code: 'nav_tutorials' },
      { to: '/hpp', icon: Calculator, label: 'Kalkulator HPP', code: 'nav_hpp' },
      { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', code: 'nav_whatsapp' },
      { to: '/print-queue', icon: Printer, label: 'Antrian Print', code: 'nav_print_queue' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { to: '/users', icon: Users, label: 'Pengguna', code: 'nav_pengguna', adminOnly: true },
      { to: '/subscription-plans', icon: DollarSign, label: 'Paket Langganan', code: 'nav_plans', adminOnly: true },
      { to: '/activity-log', icon: Activity, label: 'Activity Log', code: 'nav_activity_log', adminOnly: true },
      { to: '/backup', icon: Database, label: 'Backup', code: 'nav_export_db', adminOnly: true },
      { to: '/security', icon: Shield, label: 'Keamanan', code: 'nav_security', adminOnly: true },
      { to: '/ecommerce-api', icon: Globe, label: 'E-commerce API', code: 'nav_ecommerce_api', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Pengaturan', code: 'nav_identitas' },
    ],
  },
]

type MenuItem = typeof MENU_GROUPS[number]['items'][number]

const QUICK_MENU_PATHS = ['/', '/transaksi', '/produk', '/laporan', '/settings']

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isDemo: isDemoGuard, showPricing, remainingUsage } = useDemoGuard()
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    if (user?.nama_pengguna) {
      api<Record<string, boolean>>('user:getPermissions', user.nama_pengguna).then(r => {
        if (r.success && r.data && Object.keys(r.data).length > 0) {
          setPermissions(r.data)
        }
      })
    }
  }, [user?.nama_pengguna])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose()
  }

  const isDemo = user?.hak_akses === 'demo'
  const isAdmin = ['developer', 'superadmin'].includes(user?.hak_akses ?? '')
  const canShowRenewal = !isDemo && !['developer', 'superadmin'].includes(user?.hak_akses ?? '')
  const accessDaysRemaining = user?.access_days_remaining ?? (() => {
    if (!user?.access_expires_at) return null
    const expires = new Date(user.access_expires_at)
    if (Number.isNaN(expires.getTime())) return null
    return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000))
  })()
  const canShowItem = (item: MenuItem) => {
    if (item.adminOnly && !isAdmin) return false
    if (permissions && !isAdmin && item.code && permissions[item.code] === false) return false
    return true
  }
  const quickItems = MENU_GROUPS
    .flatMap(group => group.items)
    .filter(item => QUICK_MENU_PATHS.includes(item.to) && canShowItem(item))

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 ${isCollapsed ? 'lg:w-20' : 'lg:w-60'} h-screen flex flex-col
        glass border-r border-white/30 dark:border-slate-700/30
        transform transition-[width,transform] duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center justify-between gap-3 border-b border-white/30 dark:border-slate-700/30 ${isCollapsed ? 'lg:px-3 px-5' : 'px-5'} py-5`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center lg:flex-1 gap-0' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Store size={18} className="text-white" />
          </div>
          <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">MediaSoft POS</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">by Zetass</p>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          title={isCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 overflow-y-auto scrollbar-thin ${isCollapsed ? 'lg:px-2 px-3 lg:space-y-2' : 'px-3 space-y-4'}`}>
        {quickItems.length > 0 && (
          <div>
            <p className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 ${isCollapsed ? 'lg:hidden' : ''}`}>
              Cepat
            </p>
            <div className="space-y-0.5">
              {quickItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={`quick-${to}`}
                  to={to}
                  end={to === '/'}
                  onClick={handleNavClick}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                    ${isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span className={`${isCollapsed ? 'lg:hidden' : ''}`}>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
        {MENU_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canShowItem(item) && !QUICK_MENU_PATHS.includes(item.to))
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 ${isCollapsed ? 'lg:hidden' : ''}`}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={handleNavClick}
                    title={isCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                      ${isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400'
                      }`
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className={`${isCollapsed ? 'lg:hidden' : ''}`}>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={`px-3 py-4 border-t border-white/30 dark:border-slate-700/30 space-y-2 ${isCollapsed ? 'lg:px-2' : ''}`}>
        {isDemo && (
          <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
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
          </div>
        )}
        {canShowRenewal && (
          <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={showPricing}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                bg-gradient-to-r from-emerald-600 to-teal-500
                hover:from-emerald-700 hover:to-teal-600
                text-white text-xs font-bold
                shadow-lg shadow-emerald-500/25
                transition-all duration-300 active:scale-[0.97] mb-1"
            >
              <Rocket size={14} />
              <span className="flex-1 text-left">Upgrade / Perpanjang</span>
            </button>
            {accessDaysRemaining !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                accessDaysRemaining <= 7
                  ? 'bg-amber-500/10 border-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}>
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {accessDaysRemaining === 0 ? 'Akses berakhir hari ini' : `${accessDaysRemaining} hari akses`}
                </span>
              </div>
            )}
          </div>
        )}
        <div className={`flex items-center gap-2 px-2 ${isCollapsed ? 'lg:justify-center' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isDemo ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-primary-500'}`}>
            {user?.nama_pengguna?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{user?.nama_lengkap ?? user?.nama_pengguna}</p>
            <p className={`text-xs truncate ${isDemo ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>{user?.hak_akses?.toUpperCase() ?? 'KASIR'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Keluar' : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          <span className={`${isCollapsed ? 'lg:hidden' : ''}`}>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
