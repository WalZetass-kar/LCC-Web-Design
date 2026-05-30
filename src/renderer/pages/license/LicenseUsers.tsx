import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, RotateCcw, UserX, Trash2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'

interface UserRow {
  id: string
  name: string
  email: string
  phone?: string | null
  status: string
  plan_code: string | null
  sub_status: string | null
  expired_at: string | null
  active_devices: number
  force_popup_code?: string | null
  force_popup_until?: string | null
}
interface PlanRow { id: string; code: string; name: string; price: number; duration_days: number }
interface PopupRow { id: string; code: string; title: string; is_active: number | boolean }
type UserConfirmAction = 'inactive' | 'blocked' | 'delete'

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function LicenseUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPlan, setEditPlan] = useState<UserRow | null>(null)
  const [editPopup, setEditPopup] = useState<UserRow | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: UserConfirmAction; user: UserRow } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<UserRow[]>('license:getUsers', search)
    if (r.success) setUsers(r.data ?? [])
    else toast(r.message || 'Gagal memuat', 'error')
    setLoading(false)
  }, [search, toast])

  useEffect(() => { void load() }, [load])

  const visibleUsers = users.filter(u => !statusFilter || u.status === statusFilter || u.sub_status === statusFilter)

  async function runConfirmAction() {
    if (!confirmAction) return
    setConfirmLoading(true)
    const { type, user } = confirmAction
    const r = type === 'delete'
      ? await api('license:deleteUser', user.id)
      : await api('license:updateUser', user.id, { status: type })
    setConfirmLoading(false)
    if (!r.success) return toast(r.message || 'Aksi gagal diproses', 'error')
    toast(type === 'delete' ? 'User berhasil dihapus' : 'Status user berhasil diperbarui', 'success')
    setConfirmAction(null)
    void load()
  }

  const confirmTitle = confirmAction?.type === 'delete'
    ? 'Hapus User'
    : confirmAction?.type === 'blocked'
      ? 'Block User'
      : 'Nonaktifkan Lisensi'
  const confirmMessage = confirmAction?.type === 'delete'
    ? `Akun ${confirmAction.user.email} akan dihapus dari pusat lisensi.`
    : confirmAction?.type === 'blocked'
      ? `Akun ${confirmAction.user.email} akan diblokir dan semua device aktif ikut terkunci.`
      : `Lisensi ${confirmAction?.user.email ?? ''} akan dinonaktifkan.`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / email…"
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
            <option value="">Semua status</option>
            <option value="active">active</option>
            <option value="expired">expired</option>
            <option value="suspended">suspended</option>
            <option value="blocked">blocked</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
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
            ) : visibleUsers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Belum ada user</td></tr>
            ) : visibleUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{u.name}</td>
                <td className="text-slate-500">{u.email}</td>
                <td><span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs font-medium">{u.plan_code || '—'}</span></td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[u.status ?? ''] || 'bg-slate-100 text-slate-600'}`}>{u.status || '—'}</span>
                    <span className={`w-fit px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[u.sub_status ?? ''] || 'bg-slate-100 text-slate-600'}`}>{u.sub_status || '—'}</span>
                  </div>
                </td>
                <td className="text-xs text-slate-500">{u.expired_at ? new Date(u.expired_at).toLocaleDateString('id-ID') : '—'}</td>
                <td className="text-xs font-mono text-slate-500 text-center">{u.active_devices}</td>
                <td className="pr-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditPlan(u)} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">Ubah Paket</button>
                    <button onClick={async () => { const r = await api<{new_password:string}>('license:resetUserPassword', u.id); if (r.success) alert(`Password baru: ${r.data?.new_password}`) }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Reset Password"><RotateCcw className="w-3.5 h-3.5 text-slate-500" /></button>
                    <button onClick={() => setEditPopup(u)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Remote popup">
                      <Bell className="w-3.5 h-3.5 text-primary-500" />
                    </button>
                    {u.status !== 'active' && (
                      <button onClick={async () => { await api('license:updateUser', u.id, { status: 'active' }); load() }}
                        className="px-2 py-1 rounded-lg border border-green-200 text-xs text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20">Aktifkan</button>
                    )}
                    {u.status === 'active' && (
                      <button onClick={() => setConfirmAction({ type: 'inactive', user: u })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" title="Nonaktifkan lisensi"><UserX className="w-3.5 h-3.5 text-orange-500" /></button>
                    )}
                    <button onClick={() => setConfirmAction({ type: 'blocked', user: u })}
                      className="px-2 py-1 rounded-lg border border-red-200 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20">Block</button>
                    <button onClick={() => setConfirmAction({ type: 'delete', user: u })}
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
      {editPopup && <RemotePopupModal user={editPopup} onClose={() => setEditPopup(null)} onSaved={load} />}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmAction?.type === 'delete' ? 'Hapus' : 'Konfirmasi'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'warning'}
        loading={confirmLoading}
      >
        {confirmAction && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Nama</span><span className="font-semibold text-slate-800 dark:text-slate-100">{confirmAction.user.name}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Paket</span><span className="font-semibold text-slate-800 dark:text-slate-100">{confirmAction.user.plan_code || '-'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Device</span><span className="font-semibold text-slate-800 dark:text-slate-100">{confirmAction.user.active_devices}</span></div>
          </div>
        )}
      </ConfirmDialog>
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
  const [expiresAt, setExpiresAt] = useState(toDateInput(user.expired_at))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { api<PlanRow[]>('license:getPlans').then(r => { if (r.success) setPlans(r.data ?? []) }) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const r = await api('license:changeUserPlan', user.id, {
      plan_code: planCode,
      duration_days: Number(days),
      expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      notes,
    })
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
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Expired At</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
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

function RemotePopupModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [popups, setPopups] = useState<PopupRow[]>([])
  const [code, setCode] = useState(user.force_popup_code || 'REMOTE_ANNOUNCEMENT')
  const [until, setUntil] = useState(toDateTimeLocal(user.force_popup_until) || defaultPopupUntil())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<PopupRow[]>('license:getPopups').then(r => {
      if (r.success) setPopups((r.data ?? []).filter(p => p.is_active))
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await api('license:updateUser', user.id, {
      force_popup_code: code,
      force_popup_until: until ? new Date(until).toISOString() : null,
    })
    setLoading(false)
    if (r.success) { onSaved(); onClose() } else toast(r.message || 'Gagal mengirim popup', 'error')
  }

  async function clearPopup() {
    setLoading(true)
    const r = await api('license:updateUser', user.id, { force_popup_code: null, force_popup_until: null })
    setLoading(false)
    if (r.success) { onSaved(); onClose() } else toast(r.message || 'Gagal menghapus popup', 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Remote Popup - {user.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Popup</label>
            <select value={code} onChange={e => setCode(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
              {popups.map(p => <option key={p.code} value={p.code}>{p.code} - {p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tampilkan sampai</label>
            <input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <div className="flex justify-between gap-2 pt-1">
            <button type="button" onClick={clearPopup} disabled={loading}
              className="px-4 py-2 rounded-xl border border-red-200 text-sm text-red-600 dark:border-red-800 dark:text-red-300">Hapus</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50">{loading ? 'Mengirim...' : 'Kirim'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultPopupUntil() {
  return toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
}
