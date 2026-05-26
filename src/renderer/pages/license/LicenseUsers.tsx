import { useState, useEffect, useCallback } from 'react'
import { Plus, RotateCcw, UserX, Trash2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface UserRow { id: string; name: string; email: string; plan_code: string | null; sub_status: string | null; expired_at: string | null; active_devices: number }
interface PlanRow { id: string; code: string; name: string; price: number; duration_days: number }

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function LicenseUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPlan, setEditPlan] = useState<UserRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<UserRow[]>('license:getUsers', search)
    if (r.success) setUsers(r.data ?? [])
    else toast(r.message || 'Gagal memuat', 'error')
    setLoading(false)
  }, [search, toast])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / email…"
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" />Buat Akun Pembeli
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">Nama</th><th>Email</th><th>Paket</th>
              <th>Status</th><th>Berakhir</th><th>Device</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Memuat…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Belum ada user</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{u.name}</td>
                <td className="text-slate-500">{u.email}</td>
                <td><span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs font-medium">{u.plan_code || '—'}</span></td>
                <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[u.sub_status ?? ''] || 'bg-slate-100 text-slate-600'}`}>{u.sub_status || '—'}</span></td>
                <td className="text-xs text-slate-500">{u.expired_at ? new Date(u.expired_at).toLocaleDateString('id-ID') : '—'}</td>
                <td className="text-xs font-mono text-slate-500 text-center">{u.active_devices}</td>
                <td className="pr-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditPlan(u)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">Ubah Paket</button>
                    <button onClick={async () => { const r = await api<{new_password:string}>('license:resetUserPassword', u.id); if (r.success) alert(`Password baru: ${r.data?.new_password}`) }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Reset Password"><RotateCcw className="w-3.5 h-3.5 text-slate-500" /></button>
                    <button onClick={async () => { if (!confirm(`Suspend ${u.email}?`)) return; await api('license:updateUser', u.id, { status: 'suspended' }); load() }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Suspend"><UserX className="w-3.5 h-3.5 text-orange-500" /></button>
                    <button onClick={async () => { if (!confirm(`HAPUS ${u.email}?`)) return; await api('license:deleteUser', u.id); load() }}
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editPlan && <ChangePlanModal user={editPlan} onClose={() => setEditPlan(null)} onSaved={load} />}
    </div>
  )
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', plan_code: 'BASIC_MONTHLY', duration_days: 30 })
  const [loading, setLoading] = useState(false)
  useEffect(() => { api<PlanRow[]>('license:getPlans').then(r => { if (r.success) setPlans(r.data ?? []) }) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const r = await api('license:createUser', { ...form, duration_days: Number(form.duration_days) })
    setLoading(false)
    if (r.success) { onSaved(); onClose() } else toast(r.message || 'Gagal', 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Buat Akun Pembeli</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {[['Nama / Toko','text','name',true],['Email','email','email',true],['Password (min 8)','password','password',true],['WhatsApp (opsional)','text','phone',false]].map(([label,type,key,req]) => (
            <div key={key as string}>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">{label as string}</label>
              <input type={type as string} required={req as boolean} minLength={key === 'password' ? 8 : undefined}
                value={(form as any)[key as string]} onChange={e => setForm({ ...form, [key as string]: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Paket</label>
              <select value={form.plan_code} onChange={e => setForm({ ...form, plan_code: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                {plans.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Durasi (hari)</label>
              <input type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: Number(e.target.value) })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50">{loading ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ChangePlanModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [planCode, setPlanCode] = useState(user.plan_code || 'BASIC_MONTHLY')
  const [days, setDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { api<PlanRow[]>('license:getPlans').then(r => { if (r.success) setPlans(r.data ?? []) }) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const r = await api('license:changeUserPlan', user.id, { plan_code: planCode, duration_days: Number(days), notes })
    setLoading(false)
    if (r.success) { onSaved(); onClose() } else toast(r.message || 'Gagal', 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Ubah Paket — {user.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs text-slate-500">
            Paket sekarang: <b className="text-slate-800 dark:text-white">{user.plan_code || '—'}</b>
            {user.expired_at && <> · berakhir {new Date(user.expired_at).toLocaleDateString('id-ID')}</>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Paket baru</label>
            <select value={planCode} onChange={e => setPlanCode(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
              {plans.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Durasi (hari)</label>
            <input type="number" value={days} onChange={e => setDays(Number(e.target.value))}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50">{loading ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
