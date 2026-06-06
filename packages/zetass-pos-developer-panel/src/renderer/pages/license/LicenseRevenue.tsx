import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface RevenueData {
  total_revenue: number
  revenue_by_month: Array<{ month: string; total: number }>
  plan_revenue: Array<{ code: string; name: string; total: number; count: number }>
  active_customers: number
  expired_customers: number
  new_subscriptions: number
  renewals: number
}

function money(value: number) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`
}

export default function LicenseRevenuePage() {
  const toast = useToast()
  const [data, setData] = useState<RevenueData | null>(null)

  useEffect(() => {
    api<RevenueData>('license:getRevenue').then(r => {
      if (r.success) setData(r.data ?? null)
      else toast(r.message || 'Gagal memuat revenue', 'error')
    })
  }, [toast])

  const cards = [
    ['Total Pendapatan', money(data?.total_revenue ?? 0)],
    ['Pelanggan Aktif', data?.active_customers ?? 0],
    ['Pelanggan Expired', data?.expired_customers ?? 0],
    ['Lisensi Baru', data?.new_subscriptions ?? 0],
    ['Renewal Lisensi', data?.renewals ?? 0],
    ['Paket Terlaris', data?.plan_revenue?.[0]?.name ?? '-'],
  ]
  const revenueRows = data?.revenue_by_month ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Revenue per Bulan</p>
          <div className="mt-4 h-80 min-w-0">
            {revenueRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => money(value)} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
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
          <p className="text-sm font-bold text-slate-900 dark:text-white">Paket Terlaris</p>
          <div className="mt-4 space-y-3">
            {(data?.plan_revenue ?? []).map(plan => (
              <div key={plan.code} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{plan.name}</p>
                  <span className="text-xs text-slate-500">{plan.count} pembayaran</span>
                </div>
                <p className="mt-1 text-sm font-bold text-emerald-600">{money(plan.total)}</p>
              </div>
            ))}
            {!data?.plan_revenue?.length && <p className="text-sm text-slate-400">Belum ada pembayaran paid.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
