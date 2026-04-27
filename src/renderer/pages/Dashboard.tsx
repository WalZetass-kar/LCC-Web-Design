import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Package, AlertTriangle, Calendar, BarChart2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import type { DashboardSummary } from '../../shared/types'

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api<DashboardSummary>('dashboard:getSummary').then(r => {
      if (r.success && r.data) setSummary(r.data)
    })
  }, [])

  const maxChart = Math.max(...(summary?.chartData.map(d => d.total) ?? [1]), 1)

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
        <StatCard
          icon={<ShoppingCart size={20} />}
          label="Transaksi Hari Ini"
          value={String(summary?.today.count ?? 0)}
          sub={formatRupiah(summary?.today.total)}
          color="bg-primary-500"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Pendapatan Bulan Ini"
          value={formatRupiah(summary?.month.total)}
          sub={`${summary?.month.count ?? 0} transaksi`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={<Package size={20} />}
          label="Total Produk"
          value={String(summary?.totalBarang ?? 0)}
          sub="produk terdaftar"
          color="bg-sky-500"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Stok Menipis"
          value={String(summary?.lowStockCount ?? 0)}
          sub="produk ≤ 5 unit"
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        {/* Bar Chart */}
        <Card title="Penjualan 7 Hari Terakhir" className="xl:col-span-2">
          <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-40 mt-2 overflow-x-auto">
            {summary?.chartData.map((d, i) => (
              <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center gap-1">
                <span className="text-[10px] sm:text-xs text-slate-400 truncate w-full text-center">
                  {formatRupiah(d.total).replace('Rp\u00a0', 'Rp').replace(/\.000$/, 'k')}
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary-400/80 hover:bg-primary-500 transition-all duration-300"
                  style={{ height: `${Math.max((d.total / maxChart) * 100, 4)}%` }}
                  title={formatRupiah(d.total)}
                />
                <span className="text-[10px] sm:text-xs text-slate-500 truncate w-full text-center">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly Summary */}
        <Card title="Ringkasan Minggu Ini">
          <div className="space-y-3 sm:space-y-4 mt-1">
            <SummaryRow icon={<Calendar size={16} />} label="Total Transaksi" value={String(summary?.week.count ?? 0)} />
            <SummaryRow icon={<TrendingUp size={16} />} label="Total Pendapatan" value={formatRupiah(summary?.week.total)} />
            <SummaryRow icon={<BarChart2 size={16} />} label="Rata-rata/Hari" value={formatRupiah((summary?.week.total ?? 0) / 7)} />
          </div>
          <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <Button variant="secondary" className="w-full" onClick={() => navigate('/riwayat')}>
              Lihat Semua Riwayat
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  return (
    <Card className="flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="font-bold text-slate-800 dark:text-white text-base sm:text-lg leading-tight truncate">{value}</p>
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
