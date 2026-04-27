import { useState } from 'react'
import { FileText, Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

export default function Laporan() {
  const toast = useToast()
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [loading, setLoading] = useState(false)

  const reports = [
    {
      title: 'Laporan Penjualan',
      description: 'Laporan detail transaksi penjualan per periode',
      icon: TrendingUp,
      color: 'emerald',
      action: 'penjualan',
    },
    {
      title: 'Laporan Laba Rugi',
      description: 'Perhitungan laba rugi berdasarkan harga modal dan jual',
      icon: DollarSign,
      color: 'blue',
      action: 'laba-rugi',
    },
    {
      title: 'Laporan Stok Barang',
      description: 'Daftar stok barang saat ini dan riwayat pergerakan',
      icon: Package,
      color: 'amber',
      action: 'stok',
    },
    {
      title: 'Laporan Customer',
      description: 'Data customer dan total pembelian',
      icon: Users,
      color: 'rose',
      action: 'customer',
    },
  ]

  const handleExport = async (type: string, format: 'excel' | 'pdf') => {
    if (!dateRange.start || !dateRange.end) {
      return toast('Pilih rentang tanggal terlebih dahulu', 'error')
    }
    setLoading(true)
    toast(`Mengekspor laporan ${type} ke ${format.toUpperCase()}...`, 'info')
    
    // Simulate export
    setTimeout(() => {
      setLoading(false)
      toast(`Laporan ${type} berhasil diekspor!`, 'success')
    }, 2000)
  }

  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card title="Filter Periode Laporan">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
              setDateRange({ start: firstDay, end: today })
            }}
            className="w-full"
          >
            Bulan Ini
          </Button>
        </div>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(report => {
          const Icon = report.icon
          return (
            <Card key={report.action}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${colorClasses[report.color as keyof typeof colorClasses]} flex items-center justify-center shrink-0`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1">{report.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{report.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Download size={14} />}
                      onClick={() => handleExport(report.action, 'excel')}
                      loading={loading}
                      className="text-xs"
                    >
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Download size={14} />}
                      onClick={() => handleExport(report.action, 'pdf')}
                      loading={loading}
                      className="text-xs"
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Info */}
      <Card>
        <div className="flex items-start gap-3">
          <FileText size={20} className="text-primary-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Cara Menggunakan Laporan
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Pilih rentang tanggal yang ingin dilaporkan</li>
              <li>Klik tombol Excel atau PDF untuk mengekspor laporan</li>
              <li>File akan otomatis terdownload ke folder Downloads</li>
              <li>Laporan dapat dibuka dengan Microsoft Excel atau PDF Reader</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Coming Soon Features */}
      <Card title="Fitur Segera Hadir">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'Laporan Top Produk Terlaris',
            'Laporan Kas Harian',
            'Laporan Pembelian Supplier',
            'Grafik Penjualan Bulanan',
            'Laporan Pajak (PPN)',
            'Laporan Produk Expired',
          ].map(feature => (
            <div key={feature} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <p className="text-sm text-slate-600 dark:text-slate-300">{feature}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
