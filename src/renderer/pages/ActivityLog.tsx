import { useState, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Activity, Trash2, RefreshCw, Filter, X } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { TableSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatDateTime } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { ActivityLog } from '../../shared/types'

export default function ActivityLogPage() {
  const toast = useToast()
  const [data, setData] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [filterUsername, setFilterUsername] = useState('')
  const [filterModul, setFilterModul] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [modal, setModal] = useState<'delete' | 'clean' | null>(null)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  const load = async () => {
    setLoading(true)
    const r = await api<ActivityLog[]>('activityLog:getAll')
    if (r.success) setData(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!selectedLog) return
    setActionLoading(true)
    const r = await api('activityLog:delete', selectedLog.kd_log)
    setActionLoading(false)
    if (r.success) { 
      toast('Log dihapus')
      setModal(null)
      setSelectedLog(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleCleanOld = async () => {
    setActionLoading(true)
    const r = await api('activityLog:deleteOldLogs', 90)
    setActionLoading(false)
    if (r.success) { 
      toast(r.message as string)
      setModal(null)
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const filtered = data.filter(log => {
    if (filterUsername && !log.username?.toLowerCase().includes(filterUsername.toLowerCase())) return false
    if (filterModul && !log.modul?.toLowerCase().includes(filterModul.toLowerCase())) return false
    if (filterEventType && log.event_type !== filterEventType) return false
    return true
  })

  const MODUL_COLOR: Record<string, string> = {
    AUTH: 'blue',
    BARANG: 'purple',
    PENJUALAN: 'green',
    PEMBELIAN: 'amber',
    CUSTOMER: 'purple',
    SUPPLIER: 'blue',
    USER: 'red',
    KAS: 'green',
    SYSTEM: 'gray',
    SECURITY: 'red',
    SUBSCRIPTION: 'purple',
    ECOMMERCE_API: 'amber',
  }

  const columns: ColumnDef<ActivityLog>[] = [
    { accessorKey: 'tgl_aktivitas', header: 'Waktu', size: 150, cell: ({ getValue }) => formatDateTime(getValue() as string) },
    { accessorKey: 'username', header: 'User', size: 120 },
    {
      accessorKey: 'modul', header: 'Modul', size: 100,
      cell: ({ getValue }) => {
        const modul = getValue() as string
        return <Badge label={modul} variant={MODUL_COLOR[modul] as any ?? 'gray'} />
      }
    },
    {
      accessorKey: 'event_type', header: 'Event', size: 100,
      cell: ({ getValue }) => <Badge label={String(getValue() ?? 'general').toUpperCase()} variant="gray" />
    },
    { accessorKey: 'aktivitas', header: 'Aktivitas' },
    { accessorKey: 'detail', header: 'Detail', cell: ({ getValue }) => <span className="text-xs text-slate-500">{getValue() as string ?? '-'}</span> },
    {
      id: 'actions', header: 'Aksi', size: 60,
      cell: ({ row }) => (
        <button onClick={() => { setSelectedLog(row.original); setModal('delete') }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
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
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setModal('clean')} className="text-xs px-3 py-1.5">
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
          <select
            value={filterEventType}
            onChange={e => setFilterEventType(e.target.value)}
            className="rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Semua event</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="device">Device</option>
            <option value="subscription">Subscription</option>
            <option value="payment">Payment</option>
            <option value="revoke">Revoke</option>
            <option value="error">Error/API</option>
          </select>
          {(filterUsername || filterModul || filterEventType) && (
            <Button variant="secondary" icon={<X size={14} />} onClick={() => { setFilterUsername(''); setFilterModul(''); setFilterEventType('') }} className="text-xs">
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : (
          <DataTable data={filtered} columns={columns} searchPlaceholder="Cari aktivitas..." />
        )}
      </Card>

      <ConfirmDialog
        open={modal === 'delete'}
        onClose={() => { setModal(null); setSelectedLog(null) }}
        onConfirm={handleDelete}
        title="Hapus Log"
        message={`Yakin ingin menghapus log aktivitas "${selectedLog?.aktivitas}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={modal === 'clean'}
        onClose={() => setModal(null)}
        onConfirm={handleCleanOld}
        title="Hapus Log Lama"
        message="Yakin ingin menghapus semua log lebih dari 90 hari? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Semua"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}
