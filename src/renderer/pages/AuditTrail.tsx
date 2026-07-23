import { useState, useEffect, useCallback } from 'react'
import { Shield, Search, Filter, Eye, ArrowLeftRight } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { FilterBarSkeleton, AuditListSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'

interface AuditEntry {
  id: number
  module: string
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'reset'
  entity_type: string
  entity_id: string
  entity_name: string
  changes_before: string | null
  changes_after: string | null
  username: string
  ip_address: string | null
  created_at: string
}

const MODULE_OPTIONS = [
  { value: '', label: 'Semua Modul' },
  { value: 'produk', label: 'Produk' },
  { value: 'transaksi', label: 'Transaksi' },
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'pengguna', label: 'Pengguna' },
  { value: 'auth', label: 'Autentikasi' },
  { value: 'system', label: 'Sistem' },
]

const ACTION_STYLE: Record<string, { bg: string; label: string }> = {
  create: { bg: 'green', label: 'Tambah' },
  update: { bg: 'blue', label: 'Ubah' },
  delete: { bg: 'red', label: 'Hapus' },
  login: { bg: 'amber', label: 'Login' },
  logout: { bg: 'gray', label: 'Logout' },
  reset: { bg: 'red', label: 'Reset' },
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<AuditEntry[]>('audit:getAll', search, filterModule)
    if (r.success) setEntries(r.data ?? [])
    setLoading(false)
  }, [search, filterModule])

  useEffect(() => { load() }, [load])

  const parseJSON = (str: string | null): Record<string, unknown> | null => {
    if (!str) return null
    try { return JSON.parse(str) } catch { return null }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Shield size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Audit Trail</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log perubahan data — siapa ubah apa dan kapan</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Input placeholder="Cari user, modul, atau data..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <Select value={filterModule} onChange={e => setFilterModule(e.target.value)} options={MODULE_OPTIONS} className="w-44" />
          <Button variant="secondary" icon={<Filter size={14} />} onClick={load}>Filter</Button>
        </div>
      </Card>

      {loading ? (
        <Card><AuditListSkeleton rows={8} /></Card>
      ) : entries.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            <Shield size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada audit trail</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                <tr>
                  {['Waktu', 'User', 'Aksi', 'Modul', 'Data', 'IP', 'Detail'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {entries.map((entry, i) => {
                  const action = ACTION_STYLE[entry.action] ?? ACTION_STYLE.update
                  return (
                    <tr key={entry.id} className={`hover:bg-primary-50/50 dark:hover:bg-slate-700/30 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">{entry.username}</td>
                      <td className="px-4 py-2.5"><Badge label={action.label} variant={action.bg as any} /></td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{entry.module}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{entry.entity_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{entry.entity_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{entry.ip_address ?? '-'}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => { setSelected(entry); setShowDetail(true) }} aria-label="Detail"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Perubahan" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">User:</span> <strong>{selected.username}</strong></div>
              <div><span className="text-slate-400">Waktu:</span> <strong>{new Date(selected.created_at).toLocaleString('id-ID')}</strong></div>
              <div><span className="text-slate-400">Modul:</span> <strong className="capitalize">{selected.module}</strong></div>
              <div><span className="text-slate-400">Aksi:</span> <Badge label={selected.action} variant={ACTION_STYLE[selected.action]?.bg as any ?? 'blue'} /></div>
            </div>
            {selected.changes_before && (
              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Sebelum</p>
                <pre className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs overflow-x-auto text-red-800 dark:text-red-300">
                  {JSON.stringify(parseJSON(selected.changes_before), null, 2)}
                </pre>
              </div>
            )}
            {selected.changes_after && (
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Sesudah</p>
                <pre className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-xs overflow-x-auto text-emerald-800 dark:text-emerald-300">
                  {JSON.stringify(parseJSON(selected.changes_after), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
