import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Crown, RefreshCw, TrendingUp, Clock } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'

interface InsightData {
  kpis: {
    salesToday: number
    salesMonth: number
    grossProfitMonth: number
    avgDailySales: number
    projectedMonth: number
  }
  peakHours: Array<{ hour: string; count: number; total: number }>
  cashierPerformance: Array<{ username: string; count: number; total: number }>
  slowMoving: Array<{ kd_barang: string; nama_barang: string; stok: number; last_sold_at: string }>
  reorder: Array<{ kd_barang: string; nama_barang: string; stok: number; stok_minimum: number }>
  marginByCategory: Array<{ category: string; margin: number; revenue: number }>
  customerSegments: { vip: number; active: number; inactive: number }
}

const EMPTY_INSIGHTS: InsightData = {
  kpis: {
    salesToday: 0,
    salesMonth: 0,
    grossProfitMonth: 0,
    avgDailySales: 0,
    projectedMonth: 0,
  },
  peakHours: [],
  cashierPerformance: [],
  slowMoving: [],
  reorder: [],
  marginByCategory: [],
  customerSegments: { vip: 0, active: 0, inactive: 0 },
}

export default function OwnerDashboard() {
  const [data, setData] = useState<InsightData>(EMPTY_INSIGHTS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const r = await api<InsightData>('ownerDashboard:getInsights')
    if (r.success && r.data) {
      setData(r.data)
      setError('')
    } else {
      setData(EMPTY_INSIGHTS)
      setError(r.message || 'Dashboard owner belum bisa memuat data')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Crown className="text-primary-500" size={28} />
            Dashboard Owner
          </h1>
          <p className="text-sm text-slate-500">Insight stok, margin, kasir, jam ramai, dan proyeksi omzet.</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw size={16} />}>Refresh</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Kpi label="Hari Ini" value={formatRupiah(data.kpis.salesToday)} icon={<TrendingUp size={18} />} />
        <Kpi label="Bulan Ini" value={formatRupiah(data.kpis.salesMonth)} icon={<TrendingUp size={18} />} />
        <Kpi label="Laba Kotor" value={formatRupiah(data.kpis.grossProfitMonth)} icon={<TrendingUp size={18} />} />
        <Kpi label="Rata-rata Harian" value={formatRupiah(data.kpis.avgDailySales)} icon={<Clock size={18} />} />
        <Kpi label="Proyeksi Bulan" value={formatRupiah(data.kpis.projectedMonth)} icon={<Crown size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Jam Ramai">
          <List rows={data.peakHours.map(row => ({ left: row.hour, right: `${row.count} trx`, sub: formatRupiah(row.total) }))} empty="Belum ada transaksi 30 hari terakhir" />
        </Card>
        <Card title="Performa Kasir">
          <List rows={data.cashierPerformance.map(row => ({ left: row.username || '-', right: formatRupiah(row.total), sub: `${row.count} transaksi` }))} empty="Belum ada data kasir" />
        </Card>
        <Card title="Customer">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Segment label="VIP" value={data.customerSegments.vip} />
            <Segment label="Aktif" value={data.customerSegments.active} />
            <Segment label="Belum Belanja" value={data.customerSegments.inactive} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Reorder Prioritas" subtitle="Produk sudah menyentuh stok minimum">
          <ProductRows rows={data.reorder} empty="Tidak ada produk perlu reorder" mode="reorder" />
        </Card>
        <Card title="Slow Moving" subtitle="Produk tidak terjual dalam 30 hari">
          <ProductRows rows={data.slowMoving} empty="Tidak ada slow moving terdeteksi" mode="slow" />
        </Card>
      </div>

      <Card title="Margin per Kategori">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 text-left">
              <tr><th className="px-3 py-2">Kategori</th><th className="text-right">Revenue</th><th className="text-right pr-3">Margin</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.marginByCategory.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-slate-400">Belum ada data margin bulan ini</td></tr>
              ) : data.marginByCategory.map(row => (
                <tr key={row.category}>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="text-right">{formatRupiah(row.revenue)}</td>
                  <td className="text-right pr-3 font-semibold text-emerald-600">{formatRupiah(row.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 p-2 text-primary-600">{icon}</div>
      </div>
    </Card>
  )
}

function List({ rows, empty }: { rows: Array<{ left: string; right: string; sub?: string }>; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={`${row.left}-${row.right}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{row.left}</p>
            {row.sub && <p className="text-xs text-slate-400">{row.sub}</p>}
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">{row.right}</p>
        </div>
      ))}
    </div>
  )
}

function Segment({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function ProductRows({ rows, empty, mode }: { rows: Array<{ kd_barang: string; nama_barang: string; stok: number; stok_minimum?: number; last_sold_at?: string }>; empty: string; mode: 'reorder' | 'slow' }) {
  if (!rows.length) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.kd_barang} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{row.nama_barang}</p>
            <p className="text-xs text-slate-400 font-mono">{row.kd_barang}</p>
          </div>
          {mode === 'reorder' ? (
            <Badge label={`${row.stok}/${row.stok_minimum}`} variant="amber" />
          ) : (
            <Badge label={row.last_sold_at ? new Date(row.last_sold_at).toLocaleDateString('id-ID') : 'Belum terjual'} variant="gray" />
          )}
        </div>
      ))}
    </div>
  )
}
