import { useState, useEffect } from 'react'
import { Database, Download, Upload, Trash2, RefreshCw, Clock, HardDrive, Plus } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { SkeletonCard } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import type { Backup } from '../../shared/types'

const fmt = (bytes: number | null) => {
  if (!bytes) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`
}

const fmtDate = (d: string) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function BackupPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Backup | null>(null)
  const [modal, setModal] = useState<'restore' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await api<Backup[]>('backup:getAll')
    if (r.success) setBackups(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setCreating(true)
    const r = await api('backup:create', user?.nama_pengguna ?? 'system', 'Manual backup')
    setCreating(false)
    if (r.success) { toast('Backup berhasil dibuat'); load() }
    else toast(r.message as string, 'error')
  }

  const handleRestore = async () => {
    if (!selected) return
    setActionLoading(true)
    const r = await api('backup:restore', selected.kd_backup)
    setActionLoading(false)
    if (r.success) {
      toast('Restore berhasil. Aplikasi akan restart...')
      setModal(null)
      setTimeout(() => window.location.reload(), 1500)
    } else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    if (!selected) return
    setActionLoading(true)
    const r = await api('backup:delete', selected.kd_backup)
    setActionLoading(false)
    if (r.success) { toast('Backup dihapus'); setModal(null); load() }
    else toast(r.message as string, 'error')
  }

  const handleDownload = async (b: Backup) => {
    const r = await api<{ path: string }>('backup:download', b.kd_backup)
    if (r.success) toast(`File tersimpan di: ${r.data?.path}`)
    else toast(r.message as string, 'error')
  }

  const totalSize = backups.reduce((s, b) => s + (b.ukuran ?? 0), 0)
  const latest = backups[0]

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                <Database size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Backup</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{backups.length}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                <HardDrive size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Ukuran</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{fmt(totalSize)}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Backup Terakhir</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{latest ? fmtDate(latest.tgl_backup) : 'Belum ada'}</p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Backup List */}
      <Card
        title="Riwayat Backup"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={load} className="text-xs px-3 py-1.5">Refresh</Button>
            <Button icon={<Plus size={14} />} onClick={handleCreate} loading={creating} className="text-xs px-3 py-1.5">Buat Backup</Button>
          </div>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            Memuat...
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center">
            <Database size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 font-medium">Belum ada backup</p>
            <p className="text-sm text-slate-400 mt-1">Klik "Buat Backup" untuk membuat backup pertama</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 -mx-6">
            {backups.map((b, idx) => (
              <div key={b.kd_backup} className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <Database size={18} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium text-slate-700 dark:text-slate-200 truncate">{b.nama_file}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={11} />{fmtDate(b.tgl_backup)}</span>
                    <span className="flex items-center gap-1"><HardDrive size={11} />{fmt(b.ukuran)}</span>
                    {b.username && <span>oleh {b.username}</span>}
                  </div>
                  {b.keterangan && <p className="text-xs text-slate-400 mt-0.5">{b.keterangan}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleDownload(b)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="Download">
                    <Download size={15} />
                  </button>
                  <button onClick={() => { setSelected(b); setModal('restore') }} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-colors" title="Restore">
                    <Upload size={15} />
                  </button>
                  <button onClick={() => { setSelected(b); setModal('delete') }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restore Modal */}
      <Modal open={modal === 'restore'} onClose={() => setModal(null)} title="Restore Database" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button loading={actionLoading} onClick={handleRestore} className="w-full sm:w-auto">Restore Sekarang</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Database saat ini akan diganti. Database lama akan di-backup otomatis sebelum restore.
          </div>
          {selected && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm">
              <p className="font-mono text-slate-700 dark:text-slate-200">{selected.nama_file}</p>
              <p className="text-slate-400 text-xs mt-1">{fmtDate(selected.tgl_backup)} · {fmt(selected.ukuran)}</p>
            </div>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400">Aplikasi akan restart otomatis setelah restore.</p>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Hapus Backup" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={actionLoading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Yakin ingin menghapus backup ini?</p>
        {selected && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm font-mono text-slate-700 dark:text-slate-200">
            {selected.nama_file}
          </div>
        )}
      </Modal>
    </div>
  )
}
