import { useState } from 'react'
import { TrendingUp, Package, Users, DollarSign, Search, BarChart2, FileSpreadsheet, FileText } from 'lucide-react'
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

export default function Laporan() {
  const toast = useToast()
  const { guardPremiumFeature } = useDemoGuard()
  const [tab, setTab] = useState<TabType>('penjualan')
  const [dateRange, setDateRange] = useState({ start: firstDay, end: today })
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  // Data states
  const [penjualanData, setPenjualanData] = useState<{ transaksi: Penjualan[]; summary: any } | null>(null)
  const [labaRugiData, setLabaRugiData] = useState<LabaRugi | null>(null)
  const [produkData, setProdukData] = useState<ProdukTerlaris[]>([])
  const [stokData, setStokData] = useState<{ all: StokItem[]; stok_menipis: StokItem[] } | null>(null)
  const [customerData, setCustomerData] = useState<{ customers: CustomerLaporan[]; summary: any } | null>(null)

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

  const handleExport = async (format: 'excel' | 'pdf') => {
    // Block demo users from exporting — trigger pricing popup
    const featureKey = format === 'excel' ? 'export_excel' : 'export_pdf'
    if (guardPremiumFeature(featureKey, `Export ${format.toUpperCase()}`)) return

    // Show save dialog
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
      return // User cancelled
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
        // Use generic export with current data
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
          toast('Tampilkan data terlebih dahulu', 'error'); return
        }
      }
      if (r?.success) toast(`File berhasil disimpan ke ${savePath}`, 'success')
      else toast(r?.message ?? 'Export gagal', 'error')
    } finally {
      setExportLoading(null)
    }
  }

  const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'penjualan', label: 'Penjualan', icon: <TrendingUp size={15} /> },
    { key: 'laba-rugi', label: 'Laba Rugi', icon: <DollarSign size={15} /> },
    { key: 'produk', label: 'Produk Terlaris', icon: <BarChart2 size={15} /> },
    { key: 'stok', label: 'Stok', icon: <Package size={15} /> },
    { key: 'customer', label: 'Customer', icon: <Users size={15} /> },
  ]

  const needsDate = tab !== 'stok' && tab !== 'customer'

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-700/50'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Filter */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          {needsDate && (
            <>
              <Input label="Dari" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-40" />
              <Input label="Sampai" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-40" />
              <Button variant="secondary" onClick={() => setDateRange({ start: firstDay, end: today })} className="text-sm">Bulan Ini</Button>
            </>
          )}
          <Button icon={<Search size={14} />} onClick={load} loading={loading}>Tampilkan</Button>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet size={14} />}
              onClick={() => handleExport('excel')}
              loading={exportLoading === `${tab}-excel`}
              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-sm"
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              icon={<FileText size={14} />}
              onClick={() => handleExport('pdf')}
              loading={exportLoading === `${tab}-pdf`}
              className="text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 text-sm"
            >
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {tab === 'penjualan' && penjualanData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Transaksi', value: penjualanData.summary.total_transaksi, currency: false },
              { label: 'Total Qty', value: penjualanData.summary.total_qty, currency: false },
              { label: 'Total Penjualan', value: penjualanData.summary.total_penjualan, currency: true },
              { label: 'Total Pajak', value: penjualanData.summary.total_pajak, currency: true },
            ].map(s => (
              <Card key={s.label} className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                  {s.currency ? formatRupiah(s.value) : s.value.toLocaleString('id-ID')}
                </p>
              </Card>
            ))}
          </div>
          <Card title="Detail Transaksi">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    {['No. Transaksi', 'Tanggal', 'Kasir', 'Qty', 'Total', 'Pembayaran'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {penjualanData.transaksi.slice(0, 50).map((t: any, i: number) => (
                    <tr key={t.kd_tansaksi_jual} className={`transition-colors hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{t.kd_tansaksi_jual}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{t.tgl_wkt_transaksi ? new Date(t.tgl_wkt_transaksi).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{t.username_transaksi}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{t.total_qty}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary-600 dark:text-primary-400">{formatRupiah(t.yang_dibayar)}</td>
                      <td className="px-4 py-2.5"><Badge label={t.jenis_pembayaran ?? '-'} variant={t.jenis_pembayaran === 'TUNAI' ? 'green' : 'blue'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'laba-rugi' && labaRugiData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Transaksi', value: labaRugiData.total_transaksi, currency: false, color: 'text-slate-800 dark:text-white' },
            { label: 'Total Penjualan', value: labaRugiData.total_penjualan, currency: true, color: 'text-primary-600 dark:text-primary-400' },
            { label: 'Total Modal', value: labaRugiData.total_modal, currency: true, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Laba Kotor', value: labaRugiData.laba_kotor, currency: true, color: labaRugiData.laba_kotor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
            { label: 'Margin', value: labaRugiData.margin_persen, currency: false, suffix: '%', color: 'text-pink-600 dark:text-pink-400' },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {s.currency ? formatRupiah(s.value as number) : `${(s.value as number).toLocaleString('id-ID')}${s.suffix ?? ''}`}
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'produk' && produkData.length > 0 && (
        <Card title="Produk Terlaris">
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  {['#', 'Produk', 'Total Qty', 'Total Penjualan'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {produkData.map((p, i) => (
                  <tr key={p.kd_barang} className={`transition-colors hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{p.nama_barang}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{p.total_qty.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2.5 font-semibold text-primary-600 dark:text-primary-400">{formatRupiah(p.total_penjualan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'stok' && stokData && (
        <>
          {stokData.stok_menipis.length > 0 && (
            <Card title={`⚠️ Stok Menipis (${stokData.stok_menipis.length} produk)`}>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                    <tr>
                      {['Produk', 'Stok', 'Min. Stok', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {stokData.stok_menipis.map((s, i) => (
                      <tr key={s.kd_barang} className={`${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{s.nama_barang}</td>
                        <td className="px-4 py-2.5 font-bold text-red-600">{s.stok}</td>
                        <td className="px-4 py-2.5 text-slate-500">{s.stok_minimum}</td>
                        <td className="px-4 py-2.5"><Badge label="Menipis" variant="red" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <Card title={`Semua Stok (${stokData.all.length} produk)`}>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    {['Produk', 'Stok', 'Min. Stok', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {stokData.all.map((s, i) => {
                    const low = (s.stok ?? 0) <= (s.stok_minimum ?? 0)
                    return (
                      <tr key={s.kd_barang} className={`transition-colors hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{s.nama_barang}</td>
                        <td className={`px-4 py-2.5 font-bold ${low ? 'text-red-600' : 'text-emerald-600'}`}>{s.stok}</td>
                        <td className="px-4 py-2.5 text-slate-500">{s.stok_minimum}</td>
                        <td className="px-4 py-2.5"><Badge label={low ? 'Menipis' : 'Aman'} variant={low ? 'red' : 'green'} /></td>
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
              { label: 'Total Customer', value: customerData.summary.total_customer, currency: false },
              { label: 'Customer Aktif', value: customerData.summary.customer_aktif, currency: false },
              { label: 'Total Poin', value: customerData.summary.total_poin, currency: false },
              { label: 'Total Belanja', value: customerData.summary.total_belanja, currency: true },
            ].map(s => (
              <Card key={s.label} className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                  {s.currency ? formatRupiah(s.value) : s.value.toLocaleString('id-ID')}
                </p>
              </Card>
            ))}
          </div>
          <Card title="Data Customer">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                  <tr>
                    {['Nama', 'Poin', 'Total Belanja', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {customerData.customers.map((c: CustomerLaporan, i: number) => (
                    <tr key={c.kd_customer} className={`transition-colors hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{c.nama_customer}</td>
                      <td className="px-4 py-2.5 font-bold text-amber-600">{(c.poin ?? 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary-600 dark:text-primary-400">{formatRupiah(c.total_belanja ?? 0)}</td>
                      <td className="px-4 py-2.5"><Badge label={c.status ?? 'Aktif'} variant={c.status === 'Aktif' ? 'green' : 'red'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Loading state */}
      {loading && <SkeletonSpinner label="Memuat laporan..." />}

      {/* Empty state */}
      {!loading && tab === 'penjualan' && !penjualanData && (
        <Card><div className="py-10 text-center text-slate-400 text-sm">Pilih periode dan klik Tampilkan</div></Card>
      )}
      {!loading && tab === 'laba-rugi' && !labaRugiData && (
        <Card><div className="py-10 text-center text-slate-400 text-sm">Pilih periode dan klik Tampilkan</div></Card>
      )}
      {!loading && tab === 'produk' && produkData.length === 0 && (
        <Card><div className="py-10 text-center text-slate-400 text-sm">Pilih periode dan klik Tampilkan</div></Card>
      )}
    </div>
  )
}
