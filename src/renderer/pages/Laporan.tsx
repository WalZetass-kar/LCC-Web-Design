import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Package, Users, DollarSign, Search, BarChart2, FileSpreadsheet, FileText, Calendar, Filter, Download, ArrowUpRight } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { SkeletonSpinner } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import type { Penjualan } from '../../shared/types'
import { ensureStoragePermission } from '../utils/nativePermissions'

interface LabaRugi {
  total_transaksi: number
  total_penjualan: number
  total_modal: number
  laba_kotor: number
  margin_persen: number
}

interface ProdukTerlaris {
  kd_barang: string
  nama_barang: string
  total_qty: number
  total_penjualan: number
}

interface StokItem {
  kd_barang: string
  nama_barang: string | null
  stok: number | null
  stok_minimum: number | null
}

interface CustomerLaporan {
  kd_customer: string
  nama_customer: string
  poin: number | null
  total_belanja: number | null
  status: string | null
}

type TabType = 'penjualan' | 'laba-rugi' | 'produk' | 'stok' | 'customer'

const today = new Date().toISOString().split('T')[0]
const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

function shortDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function compactNumber(value: number) {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`
  if (value >= 1000) return `${Math.round(value / 1000)}rb`
  return String(value)
}

function moneyTooltip(value: unknown, name: unknown) {
  return [formatRupiah(Number(value ?? 0)), String(name)]
}

function numberTooltip(value: unknown, name: unknown) {
  return [Number(value ?? 0).toLocaleString('id-ID'), String(name)]
}

function chartAxisStyle() {
  return { fontSize: 11, fill: '#94a3b8' }
}

export default function Laporan() {
  const toast = useToast()
  const { guardPremiumFeature } = useDemoGuard()
  const [tab, setTab] = useState<TabType>('penjualan')
  const [dateRange, setDateRange] = useState({ start: firstDay, end: today })
  const [filterPreset, setFilterPreset] = useState<'thisMonth' | 'today' | 'yesterday' | 'last7days' | 'lastMonth' | 'thisYear' | 'custom'>('thisMonth')
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  // Data states
  const [penjualanData, setPenjualanData] = useState<{ transaksi: Penjualan[]; summary: any } | null>(null)
  const [labaRugiData, setLabaRugiData] = useState<LabaRugi | null>(null)
  const [produkData, setProdukData] = useState<ProdukTerlaris[]>([])
  const [stokData, setStokData] = useState<{ all: StokItem[]; stok_menipis: StokItem[] } | null>(null)
  const [customerData, setCustomerData] = useState<{ customers: CustomerLaporan[]; summary: any } | null>(null)

  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset as any)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    
    if (preset === 'today') {
      setDateRange({ start: todayStr, end: todayStr })
    } else if (preset === 'yesterday') {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const yStr = y.toISOString().split('T')[0]
      setDateRange({ start: yStr, end: yStr })
    } else if (preset === 'last7days') {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 6)
      setDateRange({ start: d7.toISOString().split('T')[0], end: todayStr })
    } else if (preset === 'thisMonth') {
      setDateRange({ start: firstDay, end: todayStr })
    } else if (preset === 'lastMonth') {
      const prevFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const prevLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      setDateRange({ start: prevFirst, end: prevLast })
    } else if (preset === 'thisYear') {
      const yrFirst = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      setDateRange({ start: yrFirst, end: todayStr })
    }
  }

  const load = async () => {
    if ((tab !== 'stok' && tab !== 'customer') && (!dateRange.start || !dateRange.end)) {
      return toast('Pilih rentang tanggal terlebih dahulu', 'error')
    }
    setLoading(true)
    try {
      if (tab === 'penjualan') {
        const r = await api<any>('laporan:penjualan', dateRange.start, dateRange.end)
        if (r.success) setPenjualanData(r.data)
        else toast(r.message as string, 'error')
      } else if (tab === 'laba-rugi') {
        const r = await api<LabaRugi>('laporan:labaRugi', dateRange.start, dateRange.end)
        if (r.success) setLabaRugiData(r.data ?? null)
        else toast(r.message as string, 'error')
      } else if (tab === 'produk') {
        const r = await api<ProdukTerlaris[]>('laporan:produkTerlaris', dateRange.start, dateRange.end, 10)
        if (r.success) setProdukData(r.data ?? [])
        else toast(r.message as string, 'error')
      } else if (tab === 'stok') {
        const r = await api<any>('laporan:stok')
        if (r.success) setStokData(r.data)
        else toast(r.message as string, 'error')
      } else if (tab === 'customer') {
        const r = await api<any>('laporan:customer')
        if (r.success) setCustomerData(r.data)
        else toast(r.message as string, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tab, dateRange.start, dateRange.end])

  const handleExport = async (format: 'excel' | 'pdf') => {
    const featureKey = format === 'excel' ? 'export_excel' : 'export_pdf'
    if (guardPremiumFeature(featureKey, `Export ${format.toUpperCase()}`)) return

    const permission = await ensureStoragePermission()
    if (!permission.granted) {
      toast(permission.message ?? 'Izin penyimpanan ditolak', 'error')
      return
    }

    const ext = format === 'excel' ? 'xlsx' : 'pdf'
    const defaultFilename = `laporan_${tab}_${new Date().toISOString().split('T')[0]}.${ext}`
    
    const dialogResult = await api<any>('dialog:showSaveDialog', {
      title: `Simpan Laporan ${format.toUpperCase()}`,
      defaultPath: defaultFilename,
      filters: [
        { name: format === 'excel' ? 'Excel Files' : 'PDF Files', extensions: [ext] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!dialogResult.success || !dialogResult.data || dialogResult.data.canceled) {
      return
    }

    const savePath = dialogResult.data.filePath
    const key = `${tab}-${format}`
    setExportLoading(key)
    let r: any
    try {
      if (tab === 'penjualan') {
        if (!dateRange.start || !dateRange.end) { toast('Pilih rentang tanggal', 'error'); return }
        r = format === 'excel'
          ? await api('export:penjualanExcel', dateRange.start, dateRange.end, savePath)
          : await api('export:penjualanPDF', dateRange.start, dateRange.end, savePath)
      } else if (tab === 'stok') {
        r = format === 'excel'
          ? await api('export:stokExcel', savePath)
          : await api('export:stokPDF', savePath)
      } else if (tab === 'laba-rugi' || tab === 'produk' || tab === 'customer') {
        if (tab === 'laba-rugi' && labaRugiData) {
          const rows = [['Total Transaksi', labaRugiData.total_transaksi], ['Total Penjualan', labaRugiData.total_penjualan], ['Total Modal', labaRugiData.total_modal], ['Laba Kotor', labaRugiData.laba_kotor], ['Margin (%)', labaRugiData.margin_persen]]
          r = format === 'excel'
            ? await api('export:toExcel', rows.map(([k, v]) => ({ Keterangan: k, Nilai: v })), 'laporan_laba_rugi', undefined, savePath)
            : await api('export:toPDF', 'Laporan Laba Rugi', ['Keterangan', 'Nilai'], rows, 'laporan_laba_rugi', undefined, savePath)
        } else if (tab === 'produk' && produkData.length > 0) {
          r = format === 'excel'
            ? await api('export:toExcel', produkData, 'laporan_produk_terlaris', undefined, savePath)
            : await api('export:toPDF', 'Produk Terlaris', ['Produk', 'Total Qty', 'Total Penjualan'], produkData.map(p => [p.nama_barang, p.total_qty, p.total_penjualan]), 'laporan_produk_terlaris', undefined, savePath)
        } else if (tab === 'customer' && customerData) {
          r = format === 'excel'
            ? await api('export:toExcel', customerData.customers, 'laporan_customer', undefined, savePath)
            : await api('export:toPDF', 'Laporan Customer', ['Nama', 'Poin', 'Total Belanja', 'Status'], customerData.customers.map((c: any) => [c.nama_customer, c.poin ?? 0, c.total_belanja ?? 0, c.status ?? '']), 'laporan_customer', undefined, savePath)
        } else {
          toast('Tampilkan data terlebih dahulu', 'error'); setExportLoading(null); return
        }
      }
      if (r?.success) {
        toast(`File berhasil disimpan ke ${savePath}`, 'success')
      } else {
        const errorMsg = r?.message ?? 'Export gagal'
        if (errorMsg.includes('permission') || errorMsg.includes('izin')) {
          toast('Izin penyimpanan ditolak. Periksa pengaturan folder.', 'error')
        } else if (errorMsg.includes('disk') || errorMsg.includes('space')) {
          toast('Penyimpanan penuh. Hapus file lain terlebih dahulu.', 'error')
        } else {
          toast(errorMsg, 'error')
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      if (errMsg.includes('network') || errMsg.includes('connection')) {
        toast('Koneksi gagal. Periksa koneksi internet Anda.', 'error')
      } else if (errMsg.includes('timeout')) {
        toast('Export timeout. Coba lagi dengan data yang lebih sedikit.', 'error')
      } else {
        toast(`Export gagal: ${errMsg}`, 'error')
      }
    } finally {
      setExportLoading(null)
    }
  }

  const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'penjualan', label: 'Penjualan', icon: <TrendingUp size={16} /> },
    { key: 'laba-rugi', label: 'Laba Rugi', icon: <DollarSign size={16} /> },
    { key: 'produk', label: 'Produk Terlaris', icon: <BarChart2 size={16} /> },
    { key: 'stok', label: 'Laporan Stok', icon: <Package size={16} /> },
    { key: 'customer', label: 'Pelanggan', icon: <Users size={16} /> },
  ]

  const needsDate = tab !== 'stok' && tab !== 'customer'
  const penjualanChartData = (penjualanData?.transaksi ?? []).reduce((rows, item) => {
    const key = (item.tgl_wkt_transaksi ?? '').slice(0, 10) || '-'
    const existing = rows.find(row => row.key === key)
    if (existing) {
      existing.total += Number(item.yang_dibayar ?? 0)
      existing.transaksi += 1
    } else {
      rows.push({ key, tanggal: shortDate(key), total: Number(item.yang_dibayar ?? 0), transaksi: 1 })
    }
    return rows
  }, [] as Array<{ key: string; tanggal: string; total: number; transaksi: number }>).sort((a, b) => a.key.localeCompare(b.key))
  
  const labaRugiChartData = labaRugiData ? [
    { label: 'Penjualan', value: labaRugiData.total_penjualan, color: '#DC2626' },
    { label: 'Modal', value: labaRugiData.total_modal, color: '#D97706' },
    { label: 'Laba', value: labaRugiData.laba_kotor, color: labaRugiData.laba_kotor >= 0 ? '#059669' : '#DC2626' },
  ] : []
  
  const produkChartData = produkData.map(p => ({
    label: p.nama_barang || p.kd_barang,
    qty: p.total_qty,
    penjualan: p.total_penjualan,
  }))
  
  const stokChartData = stokData ? [
    { label: 'Aman', value: Math.max(0, (stokData.all.length ?? 0) - stokData.stok_menipis.length), color: '#059669' },
    { label: 'Menipis', value: stokData.stok_menipis.length, color: '#DC2626' },
  ] : []
  
  const customerChartData = (customerData?.customers ?? []).slice(0, 8).map(customer => ({
    label: customer.nama_customer,
    belanja: customer.total_belanja ?? 0,
    poin: customer.poin ?? 0,
  }))

  return (
    <div className="space-y-5 select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Laporan & Analitik Keuangan</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Pantau arus kas, laba rugi, peringkat produk terlaris, dan ekspor data ke Excel/PDF.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              tab === t.key
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Card */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {needsDate && (
            <>
              {/* Preset Period Dropdown */}
              <div className="flex flex-col gap-1.5 min-w-[190px]">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-red-600" />
                  <span>Periode Laporan</span>
                </label>
                <select
                  value={filterPreset}
                  onChange={e => handlePresetChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-all cursor-pointer shadow-sm"
                >
                  <option value="thisMonth">Bulan Ini (Default)</option>
                  <option value="today">Hari Ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="last7days">7 Hari Terakhir</option>
                  <option value="lastMonth">Bulan Lalu</option>
                  <option value="thisYear">Tahun Ini</option>
                  <option value="custom">Kustom Rentang Tanggal...</option>
                </select>
              </div>

              {/* Custom Date Inputs (Only displayed when custom is selected) */}
              {filterPreset === 'custom' && (
                <>
                  <Input
                    label="Tanggal Mulai"
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                    className="w-full sm:w-40"
                  />
                  <Input
                    label="Tanggal Selesai"
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                    className="w-full sm:w-40"
                  />
                </>
              )}
            </>
          )}

          <Button
            icon={<Search size={15} />}
            onClick={load}
            loading={loading}
            className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs border-0 shadow-md shadow-red-600/20"
          >
            Tampilkan Laporan
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet size={15} />}
              onClick={() => handleExport('excel')}
              loading={exportLoading === `${tab}-excel`}
              className="h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 font-bold text-xs"
            >
              Export Excel
            </Button>
            <Button
              variant="secondary"
              icon={<FileText size={15} />}
              onClick={() => handleExport('pdf')}
              loading={exportLoading === `${tab}-pdf`}
              className="h-10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 font-bold text-xs"
            >
              Export PDF
            </Button>
          </div>
        </div>

        {/* Active Date Helper Badge when preset is selected */}
        {needsDate && filterPreset !== 'custom' && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <Filter size={13} className="text-red-600 shrink-0" />
            <span>Rentang data aktif: <strong className="text-slate-900 dark:text-white font-bold">{dateRange.start}</strong> s/d <strong className="text-slate-900 dark:text-white font-bold">{dateRange.end}</strong></span>
          </div>
        )}
      </Card>

      {/* Results Section */}
      {tab === 'penjualan' && penjualanData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Transaksi', value: penjualanData.summary.total_transaksi, currency: false },
              { label: 'Total Qty Terjual', value: penjualanData.summary.total_qty, currency: false },
              { label: 'Total Penjualan', value: penjualanData.summary.total_penjualan, currency: true },
              { label: 'Return Terdistribusi', value: penjualanData.summary.total_return ?? 0, currency: true },
              { label: 'Penjualan Bersih', value: penjualanData.summary.total_bersih ?? penjualanData.summary.total_penjualan, currency: true },
              { label: 'Total Pajak PPN', value: penjualanData.summary.total_pajak, currency: true },
            ].map(s => (
              <Card key={s.label} className="text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {s.currency ? formatRupiah(s.value ?? 0) : (s.value ?? 0).toLocaleString('id-ID')}
                </p>
              </Card>
            ))}
          </div>

          <Card title="Grafik Penjualan" subtitle="Tren omzet per tanggal sesuai periode yang dipilih">
            {penjualanChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={penjualanChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="laporanPenjualanTotalRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="tanggal" tick={chartAxisStyle()} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisStyle()} axisLine={false} tickLine={false} tickFormatter={v => compactNumber(Number(v))} />
                  <Tooltip formatter={moneyTooltip} />
                  <Area type="monotone" dataKey="total" name="Omzet" stroke="#DC2626" strokeWidth={3} fill="url(#laporanPenjualanTotalRed)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-xs font-bold text-slate-400">Belum ada transaksi pada periode ini</div>
            )}
          </Card>

          <Card title="Detail Rincian Transaksi">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-extrabold uppercase tracking-wider">
                  <tr>
                    {['No. Transaksi', 'Tanggal & Waktu', 'Kasir', 'Qty', 'Total', 'Pembayaran'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {penjualanData.transaksi.slice(0, 50).map((t: any, i: number) => (
                    <tr key={t.kd_tansaksi_jual} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{t.kd_tansaksi_jual}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{t.tgl_wkt_transaksi ? new Date(t.tgl_wkt_transaksi).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{t.username_transaksi}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{t.total_qty}</td>
                      <td className="px-4 py-3 font-extrabold text-red-600 dark:text-red-400">{formatRupiah(t.yang_dibayar)}</td>
                      <td className="px-4 py-3"><Badge label={t.jenis_pembayaran ?? '-'} variant={t.jenis_pembayaran === 'TUNAI' ? 'green' : 'blue'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'laba-rugi' && labaRugiData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Transaksi', value: labaRugiData.total_transaksi, currency: false, color: 'text-slate-900 dark:text-white' },
              { label: 'Total Penjualan', value: labaRugiData.total_penjualan, currency: true, color: 'text-red-600 dark:text-red-400' },
              { label: 'Total Modal HPP', value: labaRugiData.total_modal, currency: true, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Laba Kotor', value: labaRugiData.laba_kotor, currency: true, color: labaRugiData.laba_kotor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
              { label: 'Margin Perolehan', value: labaRugiData.margin_persen, currency: false, suffix: '%', color: 'text-violet-600 dark:text-violet-400' },
            ].map(s => (
              <Card key={s.label} className="text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>
                  {s.currency ? formatRupiah((s.value as number) ?? 0) : `${((s.value as number) ?? 0).toLocaleString('id-ID')}${s.suffix ?? ''}`}
                </p>
              </Card>
            ))}
          </div>

          <Card title="Grafik Perbandingan Laba Rugi" subtitle="Penjualan vs Modal vs Laba Kotor">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={labaRugiChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={chartAxisStyle()} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle()} axisLine={false} tickLine={false} tickFormatter={v => compactNumber(Number(v))} />
                <Tooltip formatter={moneyTooltip} />
                <Bar dataKey="value" name="Nominal" radius={[8, 8, 0, 0]}>
                  {labaRugiChartData.map(item => <Cell key={item.label} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {tab === 'produk' && produkData.length > 0 && (
        <>
          <Card title="Grafik Produk Terlaris" subtitle="Jumlah item terjual sesuai periode yang dipilih">
            <ResponsiveContainer width="100%" height={Math.max(280, produkChartData.length * 38)}>
              <BarChart data={produkChartData} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle()} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={chartAxisStyle()} axisLine={false} tickLine={false} width={120} />
                <Tooltip formatter={numberTooltip} />
                <Bar dataKey="qty" name="Qty Terjual" radius={[0, 8, 8, 0]} fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Peringkat Produk Terlaris">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-xs min-w-[400px]">
                <thead className="bg-slate-50 dark:bg-slate-950 font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {['#', 'Nama Produk', 'Total Terjual', 'Total Omzet'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {produkData.map((p, i) => (
                    <tr key={p.kd_barang} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.nama_barang}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{p.total_qty.toLocaleString('id-ID')} unit</td>
                      <td className="px-4 py-3 font-extrabold text-red-600 dark:text-red-400">{formatRupiah(p.total_penjualan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'stok' && stokData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Grafik Status Ketersediaan Stok" subtitle="Perbandingan produk aman vs menipis">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip formatter={numberTooltip} />
                  <Pie data={stokChartData} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={4}>
                    {stokChartData.map(item => <Cell key={item.label} fill={item.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                {stokChartData.map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}: {item.value.toLocaleString('id-ID')} Produk
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Grafik Stok Paling Menipis" subtitle="8 produk dengan sisa stok terkecil">
              {stokData.stok_menipis.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stokData.stok_menipis.slice(0, 8).map(s => ({ label: s.nama_barang || s.kd_barang, stok: s.stok ?? 0 }))} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                    <XAxis type="number" tick={chartAxisStyle()} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={chartAxisStyle()} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={numberTooltip} />
                    <Bar dataKey="stok" name="Sisa Stok" radius={[0, 8, 8, 0]} fill="#DC2626" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-xs font-bold text-slate-400">Semua Stok Barang Tergolong Aman</div>
              )}
            </Card>
          </div>

          <Card title={`Daftar Keseluruhan Stok (${stokData.all.length} Produk)`}>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-xs min-w-[400px]">
                <thead className="bg-slate-50 dark:bg-slate-950 font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {['Nama Produk', 'Stok Saat Ini', 'Batas Minimum', 'Status Stok'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stokData.all.map((s, i) => {
                    const low = (s.stok ?? 0) <= (s.stok_minimum ?? 0)
                    return (
                      <tr key={s.kd_barang} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{s.nama_barang}</td>
                        <td className={`px-4 py-3 font-black ${low ? 'text-red-600' : 'text-emerald-600'}`}>{s.stok} unit</td>
                        <td className="px-4 py-3 text-slate-500 font-medium">{s.stok_minimum} unit</td>
                        <td className="px-4 py-3"><Badge label={low ? 'Menipis' : 'Aman'} variant={low ? 'red' : 'green'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'customer' && customerData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Pelanggan', value: customerData.summary.total_customer, currency: false },
              { label: 'Pelanggan Aktif', value: customerData.summary.customer_aktif, currency: false },
              { label: 'Total Poin Member', value: customerData.summary.total_poin, currency: false },
              { label: 'Total Omzet Member', value: customerData.summary.total_belanja, currency: true },
            ].map(s => (
              <Card key={s.label} className="text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {s.currency ? formatRupiah(s.value ?? 0) : (s.value ?? 0).toLocaleString('id-ID')}
                </p>
              </Card>
            ))}
          </div>

          <Card title="Data Pelanggan Toko">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-xs min-w-[500px]">
                <thead className="bg-slate-50 dark:bg-slate-950 font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {['Nama Pelanggan', 'Poin Loyalty', 'Total Belanja', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerData.customers.map((c: CustomerLaporan) => (
                    <tr key={c.kd_customer} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{c.nama_customer}</td>
                      <td className="px-4 py-3 font-black text-amber-600">{(c.poin ?? 0).toLocaleString('id-ID')} Poin</td>
                      <td className="px-4 py-3 font-extrabold text-red-600 dark:text-red-400">{formatRupiah(c.total_belanja ?? 0)}</td>
                      <td className="px-4 py-3"><Badge label={c.status ?? 'Aktif'} variant={c.status === 'Aktif' ? 'green' : 'red'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Loading State */}
      {loading && <SkeletonSpinner label="Memuat data laporan..." />}

      {/* Empty States */}
      {!loading && tab === 'penjualan' && !penjualanData && (
        <Card><div className="py-12 text-center text-xs font-bold text-slate-400">Pilih rentang tanggal dan klik Tampilkan Laporan</div></Card>
      )}
      {!loading && tab === 'laba-rugi' && !labaRugiData && (
        <Card><div className="py-12 text-center text-xs font-bold text-slate-400">Pilih rentang tanggal dan klik Tampilkan Laporan</div></Card>
      )}
      {!loading && tab === 'produk' && produkData.length === 0 && (
        <Card><div className="py-12 text-center text-xs font-bold text-slate-400">Pilih rentang tanggal dan klik Tampilkan Laporan</div></Card>
      )}
    </div>
  )
}
