import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../renderer/contexts/AuthContext'
import appLogo from '../../renderer/assets/app-logo.png'
import developerPanelIcon from '../../renderer/assets/developer-panel-icon.png'

export default function DeveloperPanelLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={developerPanelIcon} alt="Developer Panel" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">Developer Panel</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.nama_lengkap ?? user?.nama_pengguna ?? 'Developer'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/app"
              className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-flex"
            >
              <img src={appLogo} alt="" className="h-4 w-4 rounded object-cover" />
              POS App
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-5">
        <Outlet />
      </main>
    </div>
  )
}
