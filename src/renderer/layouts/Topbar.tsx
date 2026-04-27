import { useLocation } from 'react-router-dom'
import { Sun, Moon, Bell, Menu } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/transaksi': 'Kasir / Transaksi',
  '/produk': 'Manajemen Produk',
  '/kategori': 'Manajemen Kategori',
  '/supplier': 'Manajemen Supplier',
  '/riwayat': 'Riwayat Transaksi',
  '/settings': 'Pengaturan',
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation()
  const { mode, toggleMode } = useTheme()

  return (
    <header className="h-14 glass border-b border-white/30 dark:border-slate-700/30 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu for Mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        <h1 className="font-semibold text-slate-700 dark:text-slate-200 text-sm sm:text-base truncate">
          {titles[pathname] ?? 'MediaSoft POS'}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={toggleMode}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          title="Toggle dark mode"
        >
          {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors relative">
          <Bell size={18} />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary-500 items-center justify-center text-white text-xs font-bold ml-1">
          K
        </div>
      </div>
    </header>
  )
}
