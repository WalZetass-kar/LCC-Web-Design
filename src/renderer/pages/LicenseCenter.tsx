import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeDollarSign,
  Bell,
  CreditCard,
  Database,
  FileWarning,
  Globe,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Menu,
  MonitorSmartphone,
  ServerCog,
  Shield,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LicenseServerConfig from './license/LicenseServerConfig'
import LicenseUsersPage from './license/LicenseUsers'
import LicensePlansPage from './license/LicensePlans'
import LicenseFeaturesPage from './license/LicenseFeatures'
import LicensePopupsPage from './license/LicensePopups'
import LicensePaymentsPage from './license/LicensePayments'
import LicenseDashboardPage from './license/LicenseDashboard'
import LicenseDevicesPage from './license/LicenseDevices'
import LicenseUpdatesPage from './license/LicenseUpdates'
import LicenseErrorsPage from './license/LicenseErrors'
import LicenseAnnouncementsPage from './license/LicenseAnnouncements'
import LicenseRevenuePage from './license/LicenseRevenue'
import ActivityLogPage from './ActivityLog'
import BackupPage from './Backup'
import EcommerceApiPage from './EcommerceApi'
import SecurityPage from './Security'
import LocalUsersPage from './Users'
import { api } from '../utils/api'
import developerPanelIcon from '../assets/developer-panel-icon.png'
import { SkeletonPage } from '../components/Skeleton'

type LicenseTab = 'dashboard' | 'connection' | 'users' | 'devices' | 'updates' | 'errors' | 'announcements' | 'revenue' | 'plans' | 'features' | 'popups' | 'payments' | 'localUsers' | 'backup' | 'security' | 'activityLog' | 'ecommerceApi'

const TABS: Array<{
  id: LicenseTab
  label: string
  hint: string
  icon: typeof ServerCog
}> = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Statistik dan revenue', icon: LayoutDashboard },
  { id: 'connection', label: 'Koneksi', hint: 'Server, validasi, sync', icon: ServerCog },
  { id: 'users', label: 'Pembeli', hint: 'Akun, password, paket', icon: Users },
  { id: 'devices', label: 'Device', hint: 'Online, block, unblock', icon: MonitorSmartphone },
  { id: 'updates', label: 'Update', hint: 'Optional dan force update', icon: Wrench },
  { id: 'errors', label: 'Error', hint: 'Crash dan app error', icon: FileWarning },
  { id: 'announcements', label: 'Broadcast', hint: 'Maintenance, promo, warning', icon: Bell },
  { id: 'revenue', label: 'Revenue', hint: 'Pendapatan dan growth', icon: TrendingUp },
  { id: 'plans', label: 'Paket', hint: 'Harga dan fitur paket', icon: BadgeDollarSign },
  { id: 'features', label: 'Fitur', hint: 'Master fitur premium', icon: ListChecks },
  { id: 'popups', label: 'Popup', hint: 'Pesan upgrade POS', icon: Megaphone },
  { id: 'payments', label: 'Persetujuan Lisensi', hint: 'Setujui pembelian dari popup', icon: CreditCard },
  { id: 'localUsers', label: 'Pengguna Lokal', hint: 'Akun POS dan hak akses', icon: Users },
  { id: 'backup', label: 'Backup Database', hint: 'Backup, restore, import', icon: Database },
  { id: 'security', label: 'Keamanan', hint: 'Login dan session aplikasi', icon: Shield },
  { id: 'activityLog', label: 'Activity Log', hint: 'Audit aktivitas aplikasi', icon: Activity },
  { id: 'ecommerceApi', label: 'E-commerce API', hint: 'Integrasi WooCommerce', icon: Globe },
]

const TAB_GROUPS: Array<{ label: string; tabs: LicenseTab[] }> = [
  { label: 'Kontrol', tabs: ['dashboard', 'connection'] },
  { label: 'Pembeli', tabs: ['users', 'devices', 'payments'] },
  { label: 'Produk Lisensi', tabs: ['plans', 'features', 'popups'] },
  { label: 'Operasional', tabs: ['updates', 'announcements', 'errors', 'revenue'] },
  { label: 'Tool Developer', tabs: ['localUsers', 'backup', 'security', 'activityLog', 'ecommerceApi'] },
]

const TAB_BY_ID = Object.fromEntries(TABS.map(tab => [tab.id, tab])) as Record<LicenseTab, typeof TABS[number]>

export default function LicenseCenter() {
  const { user } = useAuth()
  const [tab, setTab] = useState<LicenseTab>('connection')
  const [panelNavOpen, setPanelNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const activeTab = useMemo(() => TAB_BY_ID[tab] ?? TABS[0], [tab])

  const selectTab = (nextTab: LicenseTab) => {
    setTab(nextTab)
    setPanelNavOpen(false)
  }

  useEffect(() => {
    let cancelled = false
    api<{ connected: boolean; hasRefreshToken?: boolean }>('license:getConfig').then(result => {
      if (cancelled) return
      if (result.success && result.data?.connected && result.data.hasRefreshToken) {
        setTab('dashboard')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (!user || user.hak_akses !== 'developer') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <div className="text-4xl mb-3">!</div>
          <h2 className="heading-2 mb-1">Akses Ditolak</h2>
          <p className="text-body">Halaman ini hanya untuk akun developer.</p>
        </div>
      </div>
    )
  }

  if (loading) return <SkeletonPage rows={6} />

  const ActiveIcon = activeTab.icon

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <img src={developerPanelIcon} alt="Developer Panel" className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-primary-500/25" />
          <div>
            <h1 className="heading-1">Developer Panel</h1>
            <p className="text-caption">Pusat akun pembeli, lisensi, paket, popup, dan persetujuan lisensi Supabase.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 xl:hidden"
          >
            <Menu className="w-4 h-4 text-primary-500" />
            <span>Menu Panel</span>
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <LayoutDashboard className="w-4 h-4 text-primary-500" />
            <span>Mode developer</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        {panelNavOpen && (
          <div
            className="fixed inset-0 z-[65] bg-slate-950/50 backdrop-blur-sm xl:hidden"
            onClick={() => setPanelNavOpen(false)}
          />
        )}
        <aside className={`fixed inset-y-0 left-0 z-[70] w-72 transform overflow-y-auto border-r border-slate-200 bg-white p-3 shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-0 xl:z-auto xl:w-auto xl:translate-x-0 xl:self-start xl:rounded-xl xl:border xl:p-2 xl:shadow-none xl:max-h-[calc(100vh-7rem)] scrollbar-thin ${panelNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 xl:hidden">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Developer Panel</p>
              <p className="text-xs text-slate-400">Menu administrasi lisensi</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelNavOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            {TAB_GROUPS.map(group => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.tabs.map(id => {
                    const item = TAB_BY_ID[id]
                    const Icon = item.icon
                    const active = item.id === tab
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectTab(item.id)}
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
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setPanelNavOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800 xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary-600 dark:bg-slate-800 dark:text-primary-300">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">{activeTab.label}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeTab.hint}</p>
            </div>
          </div>

          {tab === 'dashboard' && <LicenseDashboardPage />}
          {tab === 'connection' && <LicenseServerConfig />}
          {tab === 'users' && <LicenseUsersPage />}
          {tab === 'devices' && <LicenseDevicesPage />}
          {tab === 'updates' && <LicenseUpdatesPage />}
          {tab === 'errors' && <LicenseErrorsPage />}
          {tab === 'announcements' && <LicenseAnnouncementsPage />}
          {tab === 'revenue' && <LicenseRevenuePage />}
          {tab === 'plans' && <LicensePlansPage />}
          {tab === 'features' && <LicenseFeaturesPage />}
          {tab === 'popups' && <LicensePopupsPage />}
          {tab === 'payments' && <LicensePaymentsPage />}
          {tab === 'localUsers' && <LocalUsersPage />}
          {tab === 'backup' && <BackupPage />}
          {tab === 'security' && <SecurityPage />}
          {tab === 'activityLog' && <ActivityLogPage />}
          {tab === 'ecommerceApi' && <EcommerceApiPage />}
        </section>
      </div>
    </div>
  )
}
