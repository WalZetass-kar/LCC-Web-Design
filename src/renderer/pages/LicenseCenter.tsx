import { useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  ServerCog,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LicenseServerConfig from './license/LicenseServerConfig'
import LicenseUsersPage from './license/LicenseUsers'
import LicensePlansPage from './license/LicensePlans'
import LicenseFeaturesPage from './license/LicenseFeatures'
import LicensePopupsPage from './license/LicensePopups'
import LicensePaymentsPage from './license/LicensePayments'

type LicenseTab = 'connection' | 'users' | 'plans' | 'features' | 'popups' | 'payments'

const TABS: Array<{
  id: LicenseTab
  label: string
  hint: string
  icon: typeof ServerCog
}> = [
  { id: 'connection', label: 'Koneksi', hint: 'Server, validasi, sync', icon: ServerCog },
  { id: 'users', label: 'Pembeli', hint: 'Akun, password, paket', icon: Users },
  { id: 'plans', label: 'Paket', hint: 'Harga dan fitur paket', icon: BadgeDollarSign },
  { id: 'features', label: 'Fitur', hint: 'Master fitur premium', icon: ListChecks },
  { id: 'popups', label: 'Popup', hint: 'Pesan upgrade POS', icon: Megaphone },
  { id: 'payments', label: 'Pembayaran', hint: 'Manual dan approve', icon: CreditCard },
]

export default function LicenseCenter() {
  const { user } = useAuth()
  const [tab, setTab] = useState<LicenseTab>('connection')
  const activeTab = useMemo(() => TABS.find(item => item.id === tab) ?? TABS[0], [tab])

  if (!user || (user.hak_akses !== 'developer' && user.hak_akses !== 'superadmin')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <div className="text-4xl mb-3">!</div>
          <h2 className="heading-2 mb-1">Akses Ditolak</h2>
          <p className="text-body">Halaman ini hanya untuk akun developer / super admin.</p>
        </div>
      </div>
    )
  }

  const ActiveIcon = activeTab.icon

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="heading-1">License Center</h1>
            <p className="text-caption">Pusat akun pembeli, lisensi, paket, popup, dan pembayaran Supabase.</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <LayoutDashboard className="w-4 h-4 text-primary-500" />
          <span>Mode developer</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-1">
            {TABS.map(item => {
              const Icon = item.icon
              const active = item.id === tab
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/25 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-[11px] opacity-70">{item.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary-600 dark:bg-slate-800 dark:text-primary-300">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">{activeTab.label}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeTab.hint}</p>
            </div>
          </div>

          {tab === 'connection' && <LicenseServerConfig />}
          {tab === 'users' && <LicenseUsersPage />}
          {tab === 'plans' && <LicensePlansPage />}
          {tab === 'features' && <LicenseFeaturesPage />}
          {tab === 'popups' && <LicensePopupsPage />}
          {tab === 'payments' && <LicensePaymentsPage />}
        </section>
      </div>
    </div>
  )
}
