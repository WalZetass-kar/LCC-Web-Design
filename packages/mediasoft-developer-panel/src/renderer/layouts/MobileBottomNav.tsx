import { NavLink } from 'react-router-dom'
import { BarChart2, LayoutDashboard, Package, Settings, ShoppingCart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { hasMinRole } from '../../shared/config/rbac'

const MOBILE_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transaksi', label: 'Kasir', icon: ShoppingCart },
  { to: '/app/produk', label: 'Produk', icon: Package },
  { to: '/app/laporan', label: 'Laporan', icon: BarChart2, minRole: 'admin' as const },
  { to: '/app/settings', label: 'Setting', icon: Settings },
]

export default function MobileBottomNav() {
  const { user } = useAuth()
  const items = MOBILE_ITEMS.filter(item => {
    if (!item.minRole) return true
    if (user?.hak_akses === 'demo') return true
    return hasMinRole(user?.hak_akses, item.minRole)
  })

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
