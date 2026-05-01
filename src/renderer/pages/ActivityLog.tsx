import { useState, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Activity, Trash2, RefreshCw, Filter, X } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { api } from '../utils/api'
import { formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { ActivityLog } from '../../shared/types'

export default function ActivityLogPage() {
  const toast = useToast()
  const [data, setData] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUsername, setFilterUsername] = useState('')
  const [filterModul, setFilterModul] = useState('')

  const load = async () => {
    setLoading(true)
    const r = await api<ActivityLog[]>('activityLog:getAll')
    if (r.success) setData(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (kd: number) => {
    if (!confirm('Hapus log ini?')) return
    const r = await api('activityLog:delete', kd)
    if (r.success) { toast('Log dihapus'); load() }
    else toast(r.message as string, 'error')
  }

  const handleCleanOld = async () => {
    if (!confirm('Hapus log lebih dari 90 hari?')) return
    const r = await api('activityLog:deleteOldLogs', 90)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const filtered = data.filter(log => {
    if (filterUsername && !log.username?.toLowerCase().includes(filterUsername.toLowerCase())) return false
    if (filterModul && !log.modul?.toLowerCase().includes(filterModul.toLowerCase())) return false
    return true
  })

  const MODUL_COLOR: Record<string, string> = {
    AUTH: 'blue',
    BARANG: 'purple',
    PENJUALAN: 'green',
    PEMBELIAN: 'amber',
    CUSTOMER: 'pink',
    SUPPLIER: 'indigo',
    USER: 'red',
    KAS: 'emerald',
    SYSTEM: 'slate',
  }

  const columns: ColumnDef<ActivityLog>[] = [
    { accessorKey: 'tgl_aktivitas', header: 'Waktu', size: 150, cell: ({ getValue }) => formatDateTime(getValue() as string) },
    { accessorKey: 'username', header: 'User', size: 120 },
    {
      accessorKey: 'modul', header: 'Modul', size: 100,
      cell: ({ getValue }) => {
        const modul = getValue() as string
        return <Badge label={modul} variant={MODUL_COLOR[modul] as any ?? 'slate'} />
      }
    },
    { accessorKey: 'aktivitas', header: 'Aktivitas' },
    { accessorKey: 'detail', header: 'Detail', cell: ({ getValue }) => <span className="text-xs text-slate-500">{getValue() as string ?? '-'}</span> },
    {
      id: 'actions', header: 'Aksi', size: 60,
      cell: ({ row }) => (
        <button onClick={() => handleDelete(row.original.kd_aktivitas)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
          <Trash2 size={14} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Activity Log</h2>
            <p className="text-xs text-slate-500">{filtered.length} dari {data.length} log</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={load} loading={loading} className="text-xs px-3 py-1.5">
            Refresh
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleCleanOld} className="text-xs px-3 py-1.5">
            Hapus Log Lama
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <Input
            placeholder="Filter username..."
            value={filterUsername}
            onChange={e => setFilterUsername(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Filter modul..."
            value={filterModul}
            onChange={e => setFilterModul(e.target.value)}
            className="flex-1"
          />
          {(filterUsername || filterModul) && (
            <Button variant="secondary" icon={<X size={14} />} onClick={() => { setFilterUsername(''); setFilterModul('') }} className="text-xs">
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <DataTable data={filtered} columns={columns} searchPlaceholder="Cari aktivitas..." />
      </Card>
    </div>
  )
}
