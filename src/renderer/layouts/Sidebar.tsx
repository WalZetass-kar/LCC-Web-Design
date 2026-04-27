import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, ShoppingCart, History, Settings, Store, LogOut, Truck, X,
  Users, UserCircle, Wallet, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transaksi', icon: ShoppingCart, label: 'Kasir' },
  { to: '/produk', icon: Package, label: 'Produk' },
  { to: '/kategori', icon: Tag, label: 'Kategori' },
  { to: '/supplier', icon: Truck, label: 'Supplier' },
  { to: '/customer', icon: UserCircle, label: 'Customer' },
  { to: '/kas', icon: Wallet, label: 'Kas' },
  { to: '/riwayat', icon: History, label: 'Riwayat' },
  { to: '/laporan', icon: FileText, label: 'Laporan' },
  { to: '/users', icon: Users, label: 'Pengguna', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

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
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-md">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">MediaSoft POS</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">by Ihwal</p>
          </div>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems
          .filter(item => !item.adminOnly || user?.role === 'ADMIN')
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-700/50 hover:text-primary-600'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/30 dark:border-slate-700/30 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.nama_pengguna?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{user?.nama_lengkap ?? user?.nama_pengguna}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role ?? 'KASIR'}</p>
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
