import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Package, AlertTriangle, Calendar, BarChart2, RefreshCw } from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import Card from '../components/Card'
import Button from '../components/Button'
import { SkeletonCard, SkeletonChart, SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { formatRupiah } from '../utils/format'
import type { DashboardSummary } from '../../shared/types'

// Count-up hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    isMountedRef.current = true
    const start = performance.now()
    const tick = (now: number) => {
      if (!isMountedRef.current) return
      const p = Math.min((now - start) / duration, 1)
      setValue(Math.floor(p * target))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      isMountedRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true)
    setError(false)
    try {
      const r = await api<DashboardSummary>('dashboard:getSummary')
      if (r.success && r.data) {
        setSummary(r.data)
        if (showToast) toast('Data dashboard diperbarui', 'success')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
    // Auto-check stok minimum and create notifications
    api('notifikasi:checkStokMinimum').catch(err => {
      console.error('Failed to check minimum stock:', err)
    })
  }, [fetchData])

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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            icon={<RefreshCw size={15} />}
            onClick={() => fetchData(true)}
            className="w-full sm:w-auto"
            loading={loading}
          >
            Refresh
          </Button>
          <Button icon={<ShoppingCart size={16} />} onClick={() => navigate('/transaksi')} className="w-full sm:w-auto">
            Mulai Transaksi
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Gagal memuat data</p>
            <p className="text-sm text-slate-400 mt-1">Periksa koneksi lalu coba lagi</p>
          </div>
          <Button onClick={() => fetchData(true)} icon={<RefreshCw size={15} />}>
            Coba Lagi
          </Button>
        </div>
      )}

      {!error && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatCard icon={<ShoppingCart size={20} />} label="Transaksi Hari Ini"
                  value={summary!.today.count} sub={formatRupiah(summary!.today.total)} color="bg-primary-500" />
                <StatCard icon={<TrendingUp size={20} />} label="Pendapatan Bulan Ini"
                  value={summary!.month.total} sub={`${summary!.month.count} transaksi`} color="bg-emerald-500" isCurrency />
                <StatCard icon={<Package size={20} />} label="Total Produk"
                  value={summary!.totalBarang} sub="produk terdaftar" color="bg-pink-400" />
                <StatCard icon={<AlertTriangle size={20} />} label="Stok Menipis"
                  value={summary!.lowStockCount} sub="produk ≤ 5 unit" color="bg-amber-500" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
            {/* Area Chart with Gradient */}
            {loading ? <SkeletonChart className="xl:col-span-2" /> : (
              <Card 
                title="Penjualan 7 Hari Terakhir" 
                subtitle="Grafik tren penjualan" 
                className="xl:col-span-2"
                action={
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Prediksi Besok</p>
                      <p className="text-sm font-bold text-emerald-500">{formatRupiah(summary!.predictedTomorrow || 0)}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => toast('Fitur Export Google Sheets akan segera hadir!', 'info')} icon={<BarChart2 size={14} />}>
                      Export
                    </Button>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={summary!.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false}
                      dx={-8}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} 
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#ec4899" 
                      strokeWidth={3}
                      fill="url(#colorTotal)" 
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Weekly Summary */}
            {loading ? (
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
                  <SummaryRow icon={<Calendar size={16} />} label="Total Transaksi" value={String(summary!.week.count)} />
                  <SummaryRow icon={<TrendingUp size={16} />} label="Total Pendapatan" value={formatRupiah(summary!.week.total)} />
                  <SummaryRow icon={<BarChart2 size={16} />} label="Rata-rata/Hari" value={formatRupiah(Math.round(summary!.week.total / 7))} />
                </div>
                <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="secondary" className="w-full" onClick={() => navigate('/riwayat')}>
                    Lihat Semua Riwayat
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Produk Terlaris & Stok Menipis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Produk Terlaris */}
            <Card title="🏆 Produk Terlaris" subtitle="Top 5 produk minggu ini">
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : (summary!.topProducts || []).length > 0 ? (
                  (summary!.topProducts || []).map((product, idx) => (
                    <div key={product.kd_barang} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                        idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                        idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white' :
                        'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {product.nama_barang || 'Produk'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {product.total_qty} terjual
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary-500">
                          {formatRupiah(product.total_revenue)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Belum ada data penjualan</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Stok Menipis */}
            <Card title="⚠️ Stok Menipis" subtitle="Produk yang perlu direstock">
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : (summary!.lowStockProducts || []).length > 0 ? (
                  (summary!.lowStockProducts || []).map((product) => (
                    <div key={product.kd_barang} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {product.nama_barang || 'Produk'}
                        </p>
                        <p className="text-xs text-red-500 font-semibold">
                          Sisa {product.stok ?? 0} unit
                        </p>
                      </div>
                      <button 
                        onClick={() => navigate('/produk')}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        Restock
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Semua stok aman ✅</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
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
