import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, TrendingUp, Package, AlertTriangle, Calendar,
  BarChart2, RefreshCw, Table2, Crown, Clock, Users2
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah } from '../utils/format'
import { dashboardSummaryToTsv as buildDashboardTsv } from '../../shared/googleSheetsExport'
import type { DashboardSummary } from '../../shared/types'
import { hasRole } from '../../shared/config/rbac'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  kpis: { salesToday: 0, salesMonth: 0, grossProfitMonth: 0, avgDailySales: 0, projectedMonth: 0 },
  peakHours: [],
  cashierPerformance: [],
  slowMoving: [],
  reorder: [],
  marginByCategory: [],
  customerSegments: { vip: 0, active: 0, inactive: 0 },
}

const EMPTY_SUMMARY: DashboardSummary = {
  today: { count: 0, total: 0 },
  week: { count: 0, total: 0 },
  month: { count: 0, total: 0 },
  totalBarang: 0,
  lowStockCount: 0,
  chartData: [],
  predictedTomorrow: 0,
  topProducts: [],
  lowStockProducts: [],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    return () => { isMountedRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [target, duration])
  return value
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs shadow-lg rounded-xl">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-primary-500">{formatRupiah(payload[0].value)}</p>
    </div>
  )
}

const GOOGLE_SHEETS_CREATE_URL = 'https://docs.google.com/spreadsheets/u/0/create'

function copyTextWithTextarea(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

async function copyTextToClipboard(text: string) {
  if (copyTextWithTextarea(text)) return
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return } catch { /**/ }
  }
  throw new Error('Clipboard tidak tersedia')
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeDashboardSummary(value: Partial<DashboardSummary> | null | undefined): DashboardSummary {
  return {
    today: {
      count: asNumber(value?.today?.count),
      total: asNumber(value?.today?.total),
    },
    week: {
      count: asNumber(value?.week?.count),
      total: asNumber(value?.week?.total),
    },
    month: {
      count: asNumber(value?.month?.count),
      total: asNumber(value?.month?.total),
    },
    totalBarang: asNumber(value?.totalBarang),
    lowStockCount: asNumber(value?.lowStockCount),
    chartData: Array.isArray(value?.chartData)
      ? value.chartData.map(item => ({ label: String(item?.label ?? '-'), total: asNumber(item?.total) }))
      : [],
    predictedTomorrow: asNumber(value?.predictedTomorrow),
    topProducts: Array.isArray(value?.topProducts)
      ? value.topProducts.map(item => ({
        kd_barang: item?.kd_barang ?? null,
        nama_barang: item?.nama_barang ?? null,
        total_qty: asNumber(item?.total_qty),
        total_revenue: asNumber(item?.total_revenue),
      }))
      : [],
    lowStockProducts: Array.isArray(value?.lowStockProducts)
      ? value.lowStockProducts.map(item => ({
        kd_barang: String(item?.kd_barang ?? ''),
        nama_barang: item?.nama_barang ?? null,
        stok: asNumber(item?.stok),
        stok_minimum: asNumber(item?.stok_minimum, 5),
      }))
      : [],
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exportingSheets, setExportingSheets] = useState(false)
  const [insights, setInsights] = useState<InsightData>(EMPTY_INSIGHTS)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const isAdmin = hasRole(user?.hak_akses, ['developer', 'super_admin', 'admin'])

  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true)
    setError(false)
    try {
      const r = await api<DashboardSummary>('dashboard:getSummary')
      if (r.success && r.data) {
        setSummary(normalizeDashboardSummary(r.data))
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

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError('')
    const r = await api<InsightData>('ownerDashboard:getInsights')
    if (r.success && r.data) {
      setInsights(r.data)
    } else {
      setInsights(EMPTY_INSIGHTS)
      setInsightsError(r.message || 'Gagal memuat data insight owner')
    }
    setInsightsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    api('notifikasi:checkStokMinimum').catch(() => {})
  }, [fetchData])

  // Owner insights live on the main dashboard so users do not see duplicate dashboard pages.
  useEffect(() => {
    if (isAdmin) {
      fetchInsights()
    } else {
      setInsights(EMPTY_INSIGHTS)
      setInsightsError('')
      setInsightsLoading(false)
    }
  }, [isAdmin, fetchInsights])

  const handleExportGoogleSheets = useCallback(async () => {
    if (!summary) { toast('Data dashboard belum siap', 'error'); return }
    setExportingSheets(true)
    try {
      const automatic = await api<{ mode: 'apps-script' | 'clipboard' }>('integrations:exportDashboardToSheets', summary)
      if (automatic.success && automatic.data?.mode === 'apps-script') {
        toast('Dashboard berhasil dikirim ke Google Sheets', 'success')
        return
      }
      const tsv = buildDashboardTsv(summary)
      const copiedBeforeOpen = copyTextWithTextarea(tsv)
      const sheetsWindow = window.api?.invoke ? null : window.open(GOOGLE_SHEETS_CREATE_URL, '_blank', 'noopener,noreferrer')
      if (!copiedBeforeOpen) await copyTextToClipboard(tsv)
      if (window.api?.invoke) {
        await window.api.invoke('app:openExternal', GOOGLE_SHEETS_CREATE_URL)
      } else if (!sheetsWindow) {
        window.location.href = GOOGLE_SHEETS_CREATE_URL
      }
      toast('Data disalin. Google Sheets dibuka — tempel di sel A1.', 'success')
    } catch (err) {
      toast(`Gagal export: ${err instanceof Error ? err.message : 'Error'}`, 'error')
    } finally {
      setExportingSheets(false)
    }
  }, [summary, toast])

  const dashboard = summary ?? EMPTY_SUMMARY

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
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
            onClick={() => { fetchData(true); if (isAdmin) fetchInsights() }}
            className="w-full sm:w-auto"
            loading={loading || (isAdmin && insightsLoading)}
          >
            Refresh
          </Button>
          <Button icon={<ShoppingCart size={16} />} onClick={() => navigate('/transaksi')} className="w-full sm:w-auto">
            Mulai Transaksi
          </Button>
        </div>
      </div>

      <>
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
              <Button onClick={() => fetchData(true)} icon={<RefreshCw size={15} />}>Coba Lagi</Button>
            </div>
          )}

          {!error && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : (
                    <>
                      <StatCard icon={<ShoppingCart size={20} />} label="Transaksi Hari Ini"
                        value={dashboard.today.count} sub={formatRupiah(dashboard.today.total)} color="bg-primary-500" />
                      <StatCard icon={<TrendingUp size={20} />} label="Pendapatan Bulan Ini"
                        value={dashboard.month.total} sub={`${dashboard.month.count} transaksi`} color="bg-emerald-500" isCurrency />
                      <StatCard icon={<Package size={20} />} label="Total Produk"
                        value={dashboard.totalBarang} sub="produk terdaftar" color="bg-pink-400" />
                      <StatCard icon={<AlertTriangle size={20} />} label="Stok Menipis"
                        value={dashboard.lowStockCount} sub="produk ≤ 5 unit" color="bg-amber-500" />
                    </>
                  )}
              </div>

              {/* Chart + Weekly Summary */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
                {loading ? <SkeletonChart className="xl:col-span-2" /> : (
                  <Card
                    title="Penjualan 7 Hari Terakhir"
                    subtitle="Grafik tren penjualan"
                    className="xl:col-span-2"
                    action={
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Prediksi Besok</p>
                          <p className="text-sm font-bold text-emerald-500">{formatRupiah(dashboard.predictedTomorrow || 0)}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleExportGoogleSheets}
                          icon={<Table2 size={14} />} loading={exportingSheets} disabled={!summary}>
                          Google Sheets
                        </Button>
                      </div>
                    }
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={dashboard.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dx={-8}
                          tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="total" stroke="#ec4899" strokeWidth={3} fill="url(#colorTotal)" animationDuration={800} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {loading ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card title="Ringkasan Minggu Ini">
                    <div className="space-y-3 sm:space-y-4 mt-1">
                      <SummaryRow icon={<Calendar size={16} />} label="Total Transaksi" value={String(dashboard.week.count)} />
                      <SummaryRow icon={<TrendingUp size={16} />} label="Total Pendapatan" value={formatRupiah(dashboard.week.total)} />
                      <SummaryRow icon={<BarChart2 size={16} />} label="Rata-rata/Hari" value={formatRupiah(Math.round(dashboard.week.total / 7))} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <Button variant="secondary" className="w-full" onClick={() => navigate('/riwayat')}>
                        Lihat Semua Riwayat
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Top Products + Low Stock */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <Card title="🏆 Produk Terlaris" subtitle="Top 5 produk minggu ini">
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                      : (dashboard.topProducts || []).length > 0
                        ? (dashboard.topProducts || []).map((product, idx) => (
                          <div key={product.kd_barang} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                              idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                              idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                              idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white' :
                              'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                            }`}>{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{product.nama_barang || 'Produk'}</p>
                              <p className="text-xs text-slate-400">{product.total_qty} terjual</p>
                            </div>
                            <p className="text-sm font-bold text-primary-500">{formatRupiah(product.total_revenue)}</p>
                          </div>
                        ))
                        : (
                          <div className="text-center py-8 text-slate-400">
                            <Package size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Belum ada data penjualan</p>
                          </div>
                        )}
                  </div>
                </Card>

                <Card title="Stok Menipis" subtitle="Produk yang perlu direstock">
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                      : (dashboard.lowStockProducts || []).length > 0
                        ? (dashboard.lowStockProducts || []).map(product => (
                          <div key={product.kd_barang} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <AlertTriangle size={16} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{product.nama_barang || 'Produk'}</p>
                              <p className="text-xs text-red-500 font-semibold">Sisa {product.stok ?? 0} unit</p>
                            </div>
                            <button onClick={() => navigate('/produk')}
                              className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors">
                              Restock
                            </button>
                          </div>
                        ))
                        : (
                          <div className="text-center py-8 text-slate-400">
                            <Package size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Semua stok aman</p>
                          </div>
                        )}
                  </div>
                </Card>
              </div>
            </>
          )}
      </>

      {/* Owner Insights */}
      {isAdmin && (
        <>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Crown size={20} className="text-primary-500" />
                Insight Owner
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data owner digabung di dashboard utama agar tidak ada halaman dashboard ganda.
              </p>
            </div>
          </div>

          {insightsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {insightsError}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {insightsLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : (
                <>
                  <KpiCard label="Hari Ini" value={formatRupiah(insights.kpis.salesToday)} icon={<TrendingUp size={18} />} color="bg-primary-500" />
                  <KpiCard label="Bulan Ini" value={formatRupiah(insights.kpis.salesMonth)} icon={<TrendingUp size={18} />} color="bg-emerald-500" />
                  <KpiCard label="Laba Kotor" value={formatRupiah(insights.kpis.grossProfitMonth)} icon={<BarChart2 size={18} />} color="bg-violet-500" />
                  <KpiCard label="Rata-rata Harian" value={formatRupiah(insights.kpis.avgDailySales)} icon={<Clock size={18} />} color="bg-amber-500" />
                  <KpiCard label="Proyeksi Bulan" value={formatRupiah(insights.kpis.projectedMonth)} icon={<Crown size={18} />} color="bg-pink-500" />
                </>
              )}
          </div>

          {/* Peak Hours / Cashier / Customer */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card title="⏰ Jam Ramai" subtitle="Berdasarkan 30 hari terakhir">
              {insightsLoading
                ? <InsightSkeleton />
                : insights.peakHours.length === 0
                  ? <EmptyInsight text="Belum ada transaksi 30 hari terakhir" />
                  : (
                    <div className="space-y-2">
                      {insights.peakHours.map(row => (
                        <div key={row.hour} className="flex justify-between items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{row.hour}</p>
                            <p className="text-xs text-slate-400">{row.count} transaksi</p>
                          </div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{formatRupiah(row.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
            </Card>

            <Card title="👨‍💼 Performa Kasir">
              {insightsLoading
                ? <InsightSkeleton />
                : insights.cashierPerformance.length === 0
                  ? <EmptyInsight text="Belum ada data kasir" />
                  : (
                    <div className="space-y-2">
                      {insights.cashierPerformance.map(row => (
                        <div key={row.username} className="flex justify-between items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                              <Users2 size={13} className="text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{row.username || '-'}</p>
                              <p className="text-xs text-slate-400">{row.count} transaksi</p>
                            </div>
                          </div>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">{formatRupiah(row.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
            </Card>

            <Card title="👥 Segmen Pelanggan">
              {insightsLoading
                ? <InsightSkeleton />
                : (
                  <div className="grid grid-cols-3 gap-2 text-center mt-1">
                    {[
                      { label: 'VIP', value: insights.customerSegments.vip, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                      { label: 'Aktif', value: insights.customerSegments.active, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      { label: 'Belum Belanja', value: insights.customerSegments.inactive, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' },
                    ].map(seg => (
                      <div key={seg.label} className={`rounded-xl ${seg.bg} p-3`}>
                        <p className={`text-2xl font-bold ${seg.color}`}>{seg.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{seg.label}</p>
                      </div>
                    ))}
                  </div>
                )}
            </Card>
          </div>

          {/* Reorder + Slow Moving */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="🚨 Reorder Prioritas" subtitle="Produk sudah menyentuh stok minimum">
              {insightsLoading
                ? <InsightSkeleton rows={4} />
                : insights.reorder.length === 0
                  ? <EmptyInsight text="Tidak ada produk perlu reorder" icon="✅" />
                  : (
                    <div className="space-y-2">
                      {insights.reorder.map(row => (
                        <div key={row.kd_barang} className="flex items-center justify-between gap-3 rounded-xl border border-red-100 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">{row.nama_barang}</p>
                            <p className="text-xs text-slate-400 font-mono">{row.kd_barang}</p>
                          </div>
                          <Badge label={`${row.stok}/${row.stok_minimum}`} variant="amber" />
                        </div>
                      ))}
                    </div>
                  )}
            </Card>

            <Card title="🐢 Slow Moving" subtitle="Produk tidak terjual dalam 30 hari">
              {insightsLoading
                ? <InsightSkeleton rows={4} />
                : insights.slowMoving.length === 0
                  ? <EmptyInsight text="Tidak ada slow moving terdeteksi" icon="✅" />
                  : (
                    <div className="space-y-2">
                      {insights.slowMoving.map(row => (
                        <div key={row.kd_barang} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">{row.nama_barang}</p>
                            <p className="text-xs text-slate-400 font-mono">{row.kd_barang}</p>
                          </div>
                          <Badge
                            label={row.last_sold_at ? new Date(row.last_sold_at).toLocaleDateString('id-ID') : 'Belum terjual'}
                            variant="gray"
                          />
                        </div>
                      ))}
                    </div>
                  )}
            </Card>
          </div>

          {/* Margin by Category */}
          <Card title="📊 Margin per Kategori" subtitle="Laba kotor berdasarkan kategori produk">
            {insightsLoading
              ? <InsightSkeleton rows={5} />
              : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase text-slate-500 dark:text-slate-400 text-left">
                      <tr>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                        <th className="px-4 py-3 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {insights.marginByCategory.length === 0
                        ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400">Belum ada data margin bulan ini</td>
                          </tr>
                        )
                        : insights.marginByCategory.map(row => (
                          <tr key={row.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{row.category}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatRupiah(row.revenue)}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(row.margin)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-white truncate">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white shrink-0`}>{icon}</div>
      </div>
    </Card>
  )
}

function InsightSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded self-center" />
        </div>
      ))}
    </div>
  )
}

function EmptyInsight({ text, icon = '📭' }: { text: string; icon?: string }) {
  return (
    <div className="text-center py-8">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">{text}</p>
    </div>
  )
}
