import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Key, ShieldCheck, Lock, Power } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { useDemoGuard } from '../hooks/useDemoGuard'
import { MENU_GROUPS } from '../layouts/Sidebar'
import type { Pengguna } from '../../shared/types'

interface FormState {
  nama_pengguna: string
  nama_lengkap: string
  password: string
  confirmPassword: string
  hak_akses: 'developer' | 'superadmin' | 'admin' | 'operator' | 'kasir'
  email: string
  no_telp: string
}

const EMPTY: FormState = {
  nama_pengguna: '', nama_lengkap: '', password: '', confirmPassword: '', hak_akses: 'kasir', email: '', no_telp: '',
}

const PROTECTED = ['Developer'] // Only Developer is fully protected

// Password validation
const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Password minimal 8 karakter'
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar'
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka'
  return null
}

// Collect unique menu items from MENU_GROUPS for permission modal
const PERMISSION_MENUS = MENU_GROUPS.flatMap(g =>
  g.items.map(item => ({ group: g.label, label: item.label, code: item.code }))
).filter((item, idx, arr) => arr.findIndex(x => x.code === item.code && x.label === item.label) === idx)

export default function Users() {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const { guardPremiumFeature } = useDemoGuard()
  const [data, setData] = useState<Pengguna[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'password' | 'permissions' | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Pengguna | null>(null)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  const load = async () => {
    const r = await api<Pengguna[]>('user:getAll')
    if (r.success) setData(r.data ?? [])
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    if (guardPremiumFeature('multi_user', 'Tambah User')) return
    setForm({ ...EMPTY }); setModal('add')
  }
  const openEdit = (row: Pengguna) => {
    setSelected(row)
    setForm({
      nama_pengguna: row.nama_pengguna,
      nama_lengkap: row.nama_lengkap ?? '',
      password: '',
      hak_akses: (row.hak_akses as FormState['hak_akses']) ?? 'kasir',
      email: row.email ?? '',
      no_telp: row.no_telp ?? '',
    })
    setModal('edit')
  }
  const openDelete = (row: Pengguna) => { setSelected(row); setModal('delete') }
  const openPassword = (row: Pengguna) => { setSelected(row); setNewPassword(''); setConfirmNewPassword(''); setModal('password') }
  const openPermissions = async (row: Pengguna) => {
    setSelected(row)
    const r = await api<Record<string, boolean>>('user:getPermissions', row.nama_pengguna)
    setPermissions(r.success ? (r.data ?? {}) : {})
    setModal('permissions')
  }
  const closeModal = () => { setModal(null); setSelected(null); setNewPassword(''); setConfirmNewPassword('') }

  const handleSave = async () => {
    if (!form.nama_pengguna || !form.nama_lengkap) {
      return toast('Username dan nama lengkap wajib diisi', 'error')
    }
    if (modal === 'add' && !form.password) {
      return toast('Password wajib diisi', 'error')
    }
    if (form.password) {
      const passwordError = validatePassword(form.password)
      if (passwordError) return toast(passwordError, 'error')
      if (form.password !== form.confirmPassword) {
        return toast('Password dan konfirmasi password tidak cocok', 'error')
      }
    }
    setLoading(true)
    const r = modal === 'add'
      ? await api('user:create', { ...form, _caller: currentUser?.nama_pengguna })
      : await api('user:update', selected!.nama_pengguna, { ...form, _caller: currentUser?.nama_pengguna })
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('user:delete', selected!.nama_pengguna, currentUser?.nama_pengguna)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleChangePassword = async () => {
    if (!newPassword) return toast('Password baru wajib diisi', 'error')
    const passwordError = validatePassword(newPassword)
    if (passwordError) return toast(passwordError, 'error')
    if (newPassword !== confirmNewPassword) {
      return toast('Password dan konfirmasi password tidak cocok', 'error')
    }
    setLoading(true)
    const r = await api('user:resetPassword', selected!.nama_pengguna, newPassword, currentUser?.nama_pengguna)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal() }
    else toast(r.message as string, 'error')
  }

  const handleSavePermissions = async () => {
    setLoading(true)
    const r = await api('user:savePermissions', selected!.nama_pengguna, permissions)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal() }
    else toast(r.message as string, 'error')
  }

  const handleToggleStatus = async (user: Pengguna) => {
    const r = await api('user:toggleStatus', user.nama_pengguna, currentUser?.nama_pengguna)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const togglePerm = (code: string) =>
    setPermissions(prev => ({ ...prev, [code]: !prev[code] }))

  const toggleGroup = (codes: string[], checked: boolean) =>
    setPermissions(prev => {
      const next = { ...prev }
      codes.forEach(c => { next[c] = checked })
      return next
    })

  const columns: ColumnDef<Pengguna>[] = [
    { accessorKey: 'nama_pengguna', header: 'Username', size: 120 },
    { accessorKey: 'nama_lengkap', header: 'Nama Lengkap' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'no_telp', header: 'No. Telp', size: 120 },
    {
      accessorKey: 'status_user', header: 'Status', size: 100,
      cell: ({ getValue }) => {
        const status = getValue() as string
        return <Badge label={status ?? 'Aktif'} variant={status === 'Aktif' ? 'green' : 'red'} />
      },
    },
    {
      accessorKey: 'hak_akses', header: 'Hak Akses',
      cell: ({ getValue }) => {
        const hak = getValue() as string
        const variant = 
          hak === 'developer' ? 'purple' :
          hak === 'superadmin' ? 'red' :
          hak === 'admin' ? 'blue' :
          hak === 'operator' ? 'amber' : 'green'
        return <Badge label={hak?.toUpperCase() ?? 'KASIR'} variant={variant} />
      },
    },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }) => {
        const isProtected = PROTECTED.includes(row.original.nama_pengguna)
        const canManagePermissions = ['developer', 'superadmin'].includes(currentUser?.hak_akses ?? '')
        
        // Developer account: only show lock icon
        if (isProtected) {
          return (
            <div className="flex gap-1">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400" title="Akun Terkunci">
                <Lock size={14} />
              </div>
            </div>
          )
        }
        
        return (
          <div className="flex gap-1">
            <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={() => openPassword(row.original)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors" title="Ubah Password">
              <Key size={14} />
            </button>
            <button 
              onClick={() => handleToggleStatus(row.original)} 
              className={`p-1.5 rounded-lg transition-colors ${
                row.original.status_user === 'Aktif' 
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' 
                  : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500'
              }`}
              title={row.original.status_user === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
            >
              <Power size={14} />
            </button>
            {canManagePermissions && (
              <button onClick={() => openPermissions(row.original)} className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 transition-colors" title="Izin Akses">
                <ShieldCheck size={14} />
              </button>
            )}
            <button onClick={() => openDelete(row.original)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
              <Trash2 size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  const f = (k: keyof FormState, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // Group permission menus by group label
  const permGroups = MENU_GROUPS.map(g => ({
    label: g.label,
    items: g.items.filter((item, idx, arr) => arr.findIndex(x => x.code === item.code) === idx),
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{data.length} user terdaftar</p>
        <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">Tambah User</Button>
      </div>

      <Card>
        <DataTable data={data} columns={columns} searchPlaceholder="Cari user..." />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Tambah User' : 'Edit User'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Username *" value={form.nama_pengguna} onChange={e => f('nama_pengguna', e.target.value)} disabled={modal === 'edit'} />
          <Input label="Nama Lengkap *" value={form.nama_lengkap} onChange={e => f('nama_lengkap', e.target.value)} />
          {modal === 'add' && (
            <>
              <Input label="Password *" type="password" value={form.password} onChange={e => f('password', e.target.value)} />
              <Input label="Konfirmasi Password *" type="password" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} />
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Hak Akses *</label>
            <select
              value={form.hak_akses}
              onChange={e => f('hak_akses', e.target.value)}
              disabled={
                modal === 'edit' && (
                  PROTECTED.includes(selected?.nama_pengguna ?? '') ||
                  !['developer', 'superadmin'].includes(currentUser?.hak_akses ?? '')
                )
              }
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="kasir">Kasir</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
              <option value="developer">Developer</option>
            </select>
          </div>
          <Input label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
          <Input label="No. Telepon" value={form.no_telp} onChange={e => f('no_telp', e.target.value)} />
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={modal === 'password'}
        onClose={closeModal}
        title="Ubah Password"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleChangePassword} className="w-full sm:w-auto">Ubah Password</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Ubah password untuk user <strong>{selected?.nama_lengkap}</strong>
        </p>
        <div className="space-y-3">
          <Input
            label="Password Baru *"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Masukkan password baru"
          />
          <Input
            label="Konfirmasi Password Baru *"
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            placeholder="Konfirmasi password baru"
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Hapus User"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Yakin ingin menghapus user <strong>{selected?.nama_lengkap}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        open={modal === 'permissions'}
        onClose={closeModal}
        title={`Izin Akses — ${selected?.nama_pengguna}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleSavePermissions} className="w-full sm:w-auto">Simpan Izin</Button>
          </>
        }
      >
        <div className="space-y-4">
          {permGroups.map(group => {
            const codes = group.items.map(i => i.code)
            const uniqueCodes = [...new Set(codes)]
            const allChecked = uniqueCodes.every(c => permissions[c])
            const someChecked = uniqueCodes.some(c => permissions[c])
            return (
              <div key={group.label} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Group header with select-all */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = !allChecked && someChecked }}
                    onChange={e => toggleGroup(uniqueCodes, e.target.checked)}
                    className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {group.label}
                  </span>
                </div>
                {/* Menu items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {group.items.map(item => (
                    <label key={`${item.code}-${item.label}`} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-primary-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!permissions[item.code]}
                        onChange={() => togglePerm(item.code)}
                        className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
