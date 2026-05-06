import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Package, AlertTriangle, Calendar, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Card from '../components/Card'
import Button from '../components/Button'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import type { DashboardSummary } from '../../shared/types'

// Count-up hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setValue(Math.floor(p * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

// Custom tooltip for recharts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-primary-500">{formatRupiah(payload[0].value)}</p>
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api<DashboardSummary>('dashboard:getSummary').then(r => {
      if (r.success && r.data) setSummary(r.data)
    })
    // Auto-check stok minimum and create notifications
    api('notifikasi:checkStokMinimum')
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Selamat Datang 👋</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button icon={<ShoppingCart size={16} />} onClick={() => navigate('/transaksi')} className="w-full sm:w-auto">
          Mulai Transaksi
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={<ShoppingCart size={20} />} label="Transaksi Hari Ini"
              value={summary.today.count} sub={formatRupiah(summary.today.total)} color="bg-primary-500" />
            <StatCard icon={<TrendingUp size={20} />} label="Pendapatan Bulan Ini"
              value={summary.month.total} sub={`${summary.month.count} transaksi`} color="bg-emerald-500" isCurrency />
            <StatCard icon={<Package size={20} />} label="Total Produk"
              value={summary.totalBarang} sub="produk terdaftar" color="bg-pink-400" />
            <StatCard icon={<AlertTriangle size={20} />} label="Stok Menipis"
              value={summary.lowStockCount} sub="produk ≤ 5 unit" color="bg-amber-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        {/* Recharts Bar Chart */}
        {!summary ? <SkeletonChart className="xl:col-span-2" /> : (
          <Card title="Penjualan 7 Hari Terakhir" className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(var(--glass-shadow-rgb,236,72,153),0.08)' }} />
                <Bar dataKey="total" fill="var(--chart-bar-color, #ec4899)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Weekly Summary */}
        {!summary ? (
          <div className="glass-card p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <Card title="Ringkasan Minggu Ini">
            <div className="space-y-3 sm:space-y-4 mt-1">
              <SummaryRow icon={<Calendar size={16} />} label="Total Transaksi" value={String(summary.week.count)} />
              <SummaryRow icon={<TrendingUp size={16} />} label="Total Pendapatan" value={formatRupiah(summary.week.total)} />
              <SummaryRow icon={<BarChart2 size={16} />} label="Rata-rata/Hari" value={formatRupiah(Math.round(summary.week.total / 7))} />
            </div>
            <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Button variant="secondary" className="w-full" onClick={() => navigate('/riwayat')}>
                Lihat Semua Riwayat
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, isCurrency = false }: {
  icon: React.ReactNode; label: string; value: number; sub: string; color: string; isCurrency?: boolean
}) {
  const animated = useCountUp(value)
  return (
    <Card className="flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="font-bold text-slate-800 dark:text-white text-base sm:text-lg leading-tight truncate">
          {isCurrency ? formatRupiah(animated) : animated.toLocaleString('id-ID')}
        </p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
    </Card>
  )
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
        {icon} <span className="truncate">{label}</span>
      </div>
      <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm whitespace-nowrap">{value}</span>
    </div>
  )
}
