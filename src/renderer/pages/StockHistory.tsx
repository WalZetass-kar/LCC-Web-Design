import { useState, useEffect, useCallback } from 'react'
import { History, Search, ArrowUp, ArrowDown, ArrowLeftRight, RefreshCw, Filter } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Badge from '../components/Badge'
import { FilterBarSkeleton, DataTableSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'

interface StockLog {
  id: number
  kd_barang: string
  nama_barang: string
  jenis: 'masuk' | 'keluar' | 'adjustment' | 'transfer' | 'retur'
  qty: number
  stok_sebelum: number
  stok_sesudah: number
  keterangan: string
  username: string
  created_at: string
  direction?: 'masuk' | 'keluar' | 'neutral'
}

const JENIS_OPTIONS = [
  { value: '', label: 'Semua Jenis' },
  { value: 'masuk', label: 'Stok Masuk' },
  { value: 'keluar', label: 'Stok Keluar' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'retur', label: 'Retur' },
]

export default function StockHistory() {
  const toast = useToast()
  const [logs, setLogs] = useState<StockLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<StockLog[]>('stockHistory:getAll', search, filterJenis)
    if (r.success) setLogs(r.data ?? [])
    setLoading(false)
  }, [search, filterJenis])

  useEffect(() => { load() }, [load])

  const JENIS_STYLE: Record<string, { bg: string; icon: typeof ArrowUp }> = {
    masuk: { bg: 'green', icon: ArrowUp },
    keluar: { bg: 'red', icon: ArrowDown },
    adjustment: { bg: 'amber', icon: RefreshCw },
    transfer: { bg: 'blue', icon: ArrowLeftRight },
    retur: { bg: 'yellow', icon: ArrowDown },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <History size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Riwayat Stok</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Audit trail semua pergerakan stok masuk, keluar, dan adjustment</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} options={JENIS_OPTIONS} className="w-40" />
          <Button variant="secondary" icon={<Filter size={14} />} onClick={load}>Filter</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <DataTableSkeleton rows={8} cols={[
            { width: 'w-28' }, { width: 'flex-1' }, { width: 'w-24' }, { width: 'w-16' }, { width: 'w-20' }, { width: 'w-20' }, { width: 'w-40' }, { width: 'w-20' },
          ]} />
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <History size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada riwayat stok</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  {['Waktu', 'Produk', 'Jenis', 'Qty', 'Stok Sebelum', 'Stok Sesudah', 'Keterangan', 'Oleh'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {logs.map((log, i) => {
                  const style = JENIS_STYLE[log.jenis] ?? JENIS_STYLE.adjustment
                  const Icon = style.icon
                  const direction = log.direction ?? (log.jenis === 'masuk' ? 'masuk' : log.jenis === 'keluar' || log.jenis === 'retur' ? 'keluar' : 'neutral')
                  const qtyPrefix = direction === 'masuk' ? '+' : direction === 'keluar' ? '-' : ''
                  const qtyColor = direction === 'masuk' ? 'text-emerald-600' : direction === 'keluar' ? 'text-red-600' : 'text-slate-500'
                  const iconColor = direction === 'masuk' ? 'text-emerald-500' : direction === 'keluar' ? 'text-red-500' : 'text-slate-400'
                  return (
                    <tr key={log.id} className={`hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{log.nama_barang}</p>
                        <p className="text-xs text-slate-400 font-mono">{log.kd_barang}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Icon size={12} className={iconColor} />
                          <Badge label={log.jenis} variant={style.bg as any} />
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 font-bold ${qtyColor}`}>
                        {qtyPrefix}{log.qty}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{log.stok_sebelum}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{log.stok_sesudah}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[200px] truncate">{log.keterangan}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{log.username}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
