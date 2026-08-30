import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Activity, Award, ArrowRightLeft, ArrowUpDown, BarChart2, Bell, BookOpen, BookOpenCheck, Bot, Building2,
  Calculator, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock, CreditCard,
  Crown, Database, DollarSign, FileText, Gift, Globe, History, LayoutDashboard, LogOut,
  Menu, MessageCircle, Monitor, Package, Plug, Printer, Rocket, RotateCcw, Ruler, Settings, Shield,
  ShieldCheck, ShoppingBag, ShoppingCart, Star, Store, Tag, Truck, TrendingUp, UserCircle, Users,
  Wallet, X, UtensilsCrossed, Grid3X3, CalendarCheck, ScrollText, Bike, Landmark, Hammer,
  PiggyBank, Ticket, MessageSquare, Megaphone, Globe2, FileSpreadsheet, LineChart, Percent,
  UserPlus, Briefcase, Clock4, HandCoins, Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import { api } from '../utils/api'
import appLogo from '../assets/app-logo.png'
import { canOpenDeveloperPanel, hasRole, type AppRole } from '../../shared/config/rbac'

export interface MenuItem {
  to: string
  icon: LucideIcon
  label: string
  code: string
  adminOnly?: boolean
  feature?: string
  roles?: AppRole[]
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Utama',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', code: 'nav_dashboard' },
      { to: '/assistant', icon: Bot, label: 'Asisten AI', code: 'nav_dashboard' },
      { to: '/transaksi', icon: ShoppingCart, label: 'Kasir', code: 'nav_penjualan' },
      { to: '/shifts', icon: Clock, label: 'Shift Kasir', code: 'nav_penjualan' },
      { to: '/riwayat', icon: History, label: 'Riwayat', code: 'nav_penjualan' },
      { to: '/customer-display-page', icon: Monitor, label: 'Customer Display', code: 'nav_dashboard' },
      { to: '/daily-notes', icon: FileText, label: 'Daily Notes', code: 'nav_dashboard' },
    ],
  },
  {
    label: 'Inventaris',
    items: [
      { to: '/produk', icon: Package, label: 'Produk', code: 'nav_barang' },
      { to: '/kategori', icon: Tag, label: 'Kategori', code: 'nav_barang' },
      { to: '/satuan', icon: Ruler, label: 'Satuan', code: 'nav_barang' },
      { to: '/pembelian', icon: ShoppingBag, label: 'Pembelian', code: 'nav_pembelian' },
      { to: '/stock-opname', icon: ClipboardCheck, label: 'Stok Opname', code: 'nav_barang', feature: 'stock_opname' },
      { to: '/branch', icon: Building2, label: 'Cabang/Gudang', code: 'nav_branch', roles: ['developer', 'super_admin', 'admin'], feature: 'multi_branch' },
      { to: '/stock-transfer', icon: ArrowRightLeft, label: 'Transfer Stok', code: 'nav_branch', roles: ['developer', 'super_admin', 'admin'], feature: 'multi_branch' },
      { to: '/price-list', icon: ClipboardList, label: 'Price List', code: 'nav_barang' },
      { to: '/stock-history', icon: History, label: 'Riwayat Stok', code: 'nav_barang' },
      { to: '/supplier-rating', icon: Star, label: 'Supplier Rating', code: 'nav_supplier' },
    ],
  },
  {
    label: 'Relasi',
    items: [
      { to: '/supplier', icon: Truck, label: 'Supplier', code: 'nav_supplier' },
      { to: '/customer', icon: UserCircle, label: 'Customer', code: 'nav_supplier' },
      { to: '/loyalty', icon: Award, label: 'Loyalty', code: 'nav_loyalty' },
      { to: '/membership-card', icon: CreditCard, label: 'Membership Card', code: 'nav_supplier' },
      { to: '/sales-commission', icon: TrendingUp, label: 'Komisi Sales', code: 'nav_pengguna' },
    ],
  },
  {
    label: 'SDM & HR',
    items: [
      { to: '/employee', icon: UserPlus, label: 'Karyawan', code: 'nav_pengguna' },
      { to: '/employee-contract', icon: ScrollText, label: 'Kontrak Karyawan', code: 'nav_pengguna' },
      { to: '/attendance', icon: Clock, label: 'Absensi', code: 'nav_pengguna' },
      { to: '/payroll', icon: Briefcase, label: 'Penggajian', code: 'nav_pengguna', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/tip-pooling', icon: HandCoins, label: 'Tip Pooling', code: 'nav_pengguna' },
      { to: '/shift-schedule', icon: Clock4, label: 'Jadwal Shift', code: 'nav_pengguna' },
    ],
  },
  {
    label: 'F&B / Operational',
    items: [
      { to: '/kitchen-display', icon: UtensilsCrossed, label: 'KDS Dapur', code: 'nav_penjualan' },
      { to: '/table-management', icon: Grid3X3, label: 'Meja & Layout', code: 'nav_penjualan' },
      { to: '/reservation', icon: CalendarCheck, label: 'Reservasi', code: 'nav_penjualan' },
      { to: '/recipe', icon: ScrollText, label: 'Resep & BOM', code: 'nav_barang' },
    ],
  },
  {
    label: 'Logistik',
    items: [
      { to: '/delivery', icon: Bike, label: 'Pengiriman', code: 'nav_pembelian' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/kas', icon: Wallet, label: 'Kas', code: 'nav_pembelian' },
      { to: '/accounting', icon: BookOpenCheck, label: 'Akuntansi', code: 'nav_pembelian', roles: ['developer', 'super_admin', 'admin'], feature: 'reports' },
      { to: '/shifts', icon: Clock, label: 'Shift', code: 'nav_pembelian', feature: 'shift_management' },
      { to: '/debts', icon: DollarSign, label: 'Hutang/Piutang', code: 'nav_pembelian', feature: 'debt_management' },
      { to: '/bank-account', icon: Landmark, label: 'Rekening Bank', code: 'nav_pembelian', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/fixed-asset', icon: Hammer, label: 'Aset Tetap', code: 'nav_pembelian', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/budget', icon: PiggyBank, label: 'Anggaran', code: 'nav_pembelian', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/payment', icon: Crown, label: 'Status & Langganan', code: 'nav_plans' },
      { to: '/payment-automation', icon: CreditCard, label: 'Pembayaran Digital', code: 'nav_pembelian', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/returns', icon: RotateCcw, label: 'Return', code: 'nav_penjualan', feature: 'return_refund' },
      { to: '/promo', icon: Gift, label: 'Promo', code: 'nav_promo' },
      { to: '/laporan', icon: BarChart2, label: 'Laporan', code: 'nav_pembelian', feature: 'reports' },
      { to: '/tax-report', icon: FileText, label: 'Laporan Pajak', code: 'nav_pembelian', feature: 'reports' },
      { to: '/petty-cash', icon: Wallet, label: 'Petty Cash', code: 'nav_pembelian' },
      { to: '/cash-flow', icon: ArrowUpDown, label: 'Arus Kas', code: 'nav_pembelian', feature: 'reports' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/gift-card', icon: Ticket, label: 'Gift Card', code: 'nav_promo' },
      { to: '/customer-feedback', icon: MessageSquare, label: 'Feedback', code: 'nav_promo' },
      { to: '/campaign', icon: Megaphone, label: 'Kampanye', code: 'nav_promo', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/storefront', icon: Globe2, label: 'Toko Online', code: 'nav_promo', roles: ['developer', 'super_admin', 'admin'] },
    ],
  },
  {
    label: 'Alat Bantu',
    items: [
      { to: '/tutorials', icon: BookOpen, label: 'Tutorial', code: 'nav_tutorials' },
      { to: '/hpp', icon: Calculator, label: 'Kalkulator HPP', code: 'nav_hpp' },
      { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', code: 'nav_whatsapp' },
      { to: '/print-queue', icon: Printer, label: 'Antrian Print', code: 'nav_print_queue' },
      { to: '/label-print', icon: Tag, label: 'Label Cetak', code: 'nav_print_queue' },
      { to: '/notification-settings', icon: Bell, label: 'Notifikasi', code: 'nav_identitas' },
      { to: '/integrations', icon: Plug, label: 'Integrasi', code: 'nav_identitas' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { to: '/users', icon: Users, label: 'Pengguna', code: 'nav_pengguna', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/backup', icon: Database, label: 'Backup', code: 'nav_export_db', roles: ['developer', 'super_admin', 'admin'], feature: 'backup' },
      { to: '/activity-log', icon: Activity, label: 'Aktivitas Pengguna', code: 'nav_activity_log', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/security', icon: Shield, label: 'Keamanan', code: 'nav_security', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/ecommerce-api', icon: Globe, label: 'E-commerce API', code: 'nav_ecommerce_api', roles: ['developer', 'super_admin', 'admin'], feature: 'api_access' },
      { to: '/marketplace', icon: Store, label: 'Marketplace', code: 'nav_ecommerce_api', roles: ['developer', 'super_admin', 'admin'], feature: 'api_access' },
      { to: '/audit-trail', icon: Shield, label: 'Audit Trail', code: 'nav_activity_log', roles: ['developer', 'super_admin', 'admin'] },
      { to: '/license-admin', icon: ShieldCheck, label: 'Developer Panel', code: 'nav_license_admin', roles: ['developer', 'super_admin'] },
      { to: '/settings', icon: Settings, label: 'Pengaturan', code: 'nav_identitas' },
    ],
  },
]

const QUICK_MENU_PATHS = ['/', '/transaksi', '/produk', '/laporan', '/settings']
const SIMPLE_MENU_PATHS = new Set(['/', '/assistant', '/transaksi', '/riwayat', '/produk', '/customer', '/kas', '/shifts', '/settings'])

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
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user?.nama_pengguna) {
      api<Record<string, boolean>>('user:getPermissions', user.nama_pengguna).then(r => {
        if (r.success && r.data && Object.keys(r.data).length > 0) {
          setPermissions(r.data)
        }
      })
      api<{ feature_flags?: Record<string, boolean>; is_expired?: boolean }>('subscription:getStatus', user.nama_pengguna).then(r => {
        if (r.success && r.data?.feature_flags) setFeatureFlags(r.data.feature_flags)
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
  const isSimpleMode = user?.hak_akses === 'kasir'
  const isDeveloper = canOpenDeveloperPanel(user?.hak_akses)
  const canShowRenewal = !isDemo && !isDeveloper
  const accessDaysRemaining = user?.access_days_remaining ?? (() => {
    if (!user?.access_expires_at) return null
    const expires = new Date(user.access_expires_at)
    if (Number.isNaN(expires.getTime())) return null
    return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000))
  })()
  const canShowItem = (item: MenuItem) => {
    if (item.adminOnly && !isDeveloper) return false
    if (item.roles && !hasRole(user?.hak_akses, item.roles)) return false
    if (isSimpleMode && !SIMPLE_MENU_PATHS.has(item.to)) return false
    if (permissions && !isDeveloper && item.code && permissions[item.code] === false) return false
    if ('feature' in item && item.feature && featureFlags[item.feature] === false) return false
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
      {/* Header with Logo & Burger Menu Button */}
      <div className={`border-b border-white/30 dark:border-slate-700/30 ${isCollapsed ? 'lg:flex lg:flex-col lg:items-center lg:gap-2.5 lg:px-2 lg:py-3.5 px-4 py-4' : 'flex items-center justify-between gap-3 px-4 py-4'}`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}>
          <img src={appLogo} alt="Zetass Pos" className={`${isCollapsed ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 rounded-xl object-cover shadow-sm`} />
          <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Zetass Pos</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Point of Sale</p>
          </div>
        </div>
        <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'shrink-0'}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title={isCollapsed ? 'Buka sidebar penuh' : 'Ciutkan sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Tutup sidebar"
          >
            <X size={20} />
          </button>
        </div>
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
                      ? 'bg-primary-600 text-white'
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
                        ? 'bg-primary-600 text-white'
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
                bg-primary-600 hover:bg-primary-700
                text-white text-xs font-bold
                transition-colors active:scale-[0.98]
                demo-upgrade-badge mb-1"
            >
              <Rocket size={14} />
              <span className="flex-1 text-left">Upgrade Sekarang</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px]">
                {remainingUsage} sisa
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
              <Shield size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Demo Mode</span>
            </div>
          </div>
        )}
        {canShowRenewal && (
          <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={showPricing}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                bg-emerald-600 hover:bg-emerald-700
                text-white text-xs font-bold
                transition-colors active:scale-[0.98] mb-1"
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
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ${isDemo ? 'bg-red-500' : 'bg-primary-600'}`}>
            {user?.foto ? (
              <img src={user.foto} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.nama_pengguna?.[0]?.toUpperCase() ?? 'U'
            )}
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
