import { useEffect, useState } from 'react'
import { Activity, CreditCard, DollarSign, MonitorSmartphone, ShieldAlert, TrendingUp, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface LicenseStats {
  users: number
  total_devices: number
  user_online: number
  active_subscriptions: number
  expired_subscriptions: number
  revenue_month: number
  revenue_year: number
  total_transactions: number
  device_online: number
  active_devices: number
  blocked_devices: number
  active_versions: Record<string, number>
  revenue_by_month: Array<{ month: string; total: number }>
  recent_activity: Array<{ id: string; event_type: string; action: string; created_at: string }>
  recent_errors: Array<{ id: string; error_type: string; error_message: string; created_at: string }>
  generated_at: string
}

function money(value: number) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`
}

export default function LicenseDashboardPage() {
  const toast = useToast()
  const [stats, setStats] = useState<LicenseStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api<LicenseStats>('license:getStats').then(r => {
      if (cancelled) return
      if (r.success) setStats(r.data ?? null)
      else toast(r.message || 'Gagal memuat statistik lisensi', 'error')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [toast])

  const versions = Object.entries(stats?.active_versions ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([version, count]) => `${version} (${count})`)
    .join(', ') || '-'
  const revenueRows = stats?.revenue_by_month ?? []

  const cards = [
    { label: 'Total User', value: stats?.users ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Total Device', value: stats?.total_devices ?? 0, icon: MonitorSmartphone, color: 'text-cyan-600' },
    { label: 'User Online', value: stats?.user_online ?? 0, icon: Activity, color: 'text-green-600' },
    { label: 'Lisensi Aktif', value: stats?.active_subscriptions ?? 0, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Lisensi Expired', value: stats?.expired_subscriptions ?? 0, icon: ShieldAlert, color: 'text-red-600' },
    { label: 'Revenue Bulan Ini', value: money(stats?.revenue_month ?? 0), icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Revenue Tahun Ini', value: money(stats?.revenue_year ?? 0), icon: CreditCard, color: 'text-indigo-600' },
    { label: 'Total Transaksi', value: stats?.total_transactions ?? 0, icon: Activity, color: 'text-primary-600' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ${card.color} dark:bg-slate-800`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                {loading ? '...' : card.value}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Revenue per Bulan</p>
              <p className="text-xs text-slate-500">Pembayaran paid tahun berjalan</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800">{versions}</span>
          </div>
          <div className="h-72 min-w-0">
            {revenueRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Number(v) / 1000}k`} />
                  <Tooltip formatter={(value: number) => money(value)} />
                  <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-800">
                Belum ada data revenue.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Monitoring Device</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-lg font-extrabold text-green-700 dark:text-green-300">{stats?.device_online ?? 0}</p>
              <p className="text-[11px] text-green-700 dark:text-green-300">Online</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-lg font-extrabold text-slate-700 dark:text-slate-200">{stats?.active_devices ?? 0}</p>
              <p className="text-[11px] text-slate-500">Aktif</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-lg font-extrabold text-red-700 dark:text-red-300">{stats?.blocked_devices ?? 0}</p>
              <p className="text-[11px] text-red-700 dark:text-red-300">Blocked</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Error Terbaru</p>
            <div className="space-y-2">
              {(stats?.recent_errors ?? []).slice(0, 5).map(error => (
                <div key={error.id} className="rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{error.error_type}</p>
                  <p className="truncate text-slate-500">{error.error_message}</p>
                </div>
              ))}
              {!stats?.recent_errors?.length && <p className="text-xs text-slate-400">Belum ada error tercatat.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Aktivitas Terbaru</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-2">Event</th><th>Action</th><th>Waktu</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(stats?.recent_activity ?? []).slice(0, 8).map(row => (
                <tr key={row.id}>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{row.event_type}</td>
                  <td className="text-slate-500">{row.action}</td>
                  <td className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats?.generated_at && <p className="mt-3 text-xs text-slate-400">Terakhir diperbarui: {new Date(stats.generated_at).toLocaleString('id-ID')}</p>}
      </div>
    </div>
  )
}
