import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tantml:react-table'
import { Plus, Pencil, Trash2, Key } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Pengguna } from '../../shared/types'

interface FormState {
  nama_pengguna: string
  nama_lengkap: string
  password: string
  role: 'ADMIN' | 'KASIR' | 'OWNER'
  email: string
  no_telp: string
}

const EMPTY: FormState = {
  nama_pengguna: '', nama_lengkap: '', password: '', role: 'KASIR', email: '', no_telp: '',
}

export default function Users() {
  const toast = useToast()
  const [data, setData] = useState<Pengguna[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'password' | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Pengguna | null>(null)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const load = async () => {
    const r = await api<Pengguna[]>('user:getAll')
    if (r.success) setData(r.data ?? [])
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (row: Pengguna) => {
    setSelected(row)
    setForm({
      nama_pengguna: row.nama_pengguna,
      nama_lengkap: row.nama_lengkap ?? '',
      password: '',
      role: (row.role as 'ADMIN' | 'KASIR' | 'OWNER') ?? 'KASIR',
      email: row.email ?? '',
      no_telp: row.no_telp ?? '',
    })
    setModal('edit')
  }
  const openDelete = (row: Pengguna) => { setSelected(row); setModal('delete') }
  const openPassword = (row: Pengguna) => { setSelected(row); setNewPassword(''); setModal('password') }
  const closeModal = () => { setModal(null); setSelected(null); setNewPassword('') }

  const handleSave = async () => {
    if (!form.nama_pengguna || !form.nama_lengkap) {
      return toast('Username dan nama lengkap wajib diisi', 'error')
    }
    if (modal === 'add' && !form.password) {
      return toast('Password wajib diisi', 'error')
    }
    setLoading(true)
    const r = modal === 'add'
      ? await api('user:create', form)
      : await api('user:update', selected!.nama_pengguna, form)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('user:delete', selected!.nama_pengguna)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleChangePassword = async () => {
    if (!newPassword) return toast('Password baru wajib diisi', 'error')
    setLoading(true)
    const r = await api('user:changePassword', selected!.nama_pengguna, { password: newPassword })
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal() }
    else toast(r.message as string, 'error')
  }

  const columns: ColumnDef<Pengguna>[] = [
    { accessorKey: 'nama_pengguna', header: 'Username', size: 120 },
    { accessorKey: 'nama_lengkap', header: 'Nama Lengkap' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'no_telp', header: 'No. Telp', size: 120 },
    {
      accessorKey: 'role', header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as string
        const variant = role === 'ADMIN' ? 'red' : role === 'OWNER' ? 'blue' : 'green'
        return <Badge label={role ?? 'KASIR'} variant={variant} />
      },
    },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => openPassword(row.original)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors" title="Ubah Password">
            <Key size={14} />
          </button>
          <button onClick={() => openDelete(row.original)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const f = (k: keyof FormState, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

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
            <Input label="Password *" type="password" value={form.password} onChange={e => f('password', e.target.value)} />
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role *</label>
            <select
              value={form.role}
              onChange={e => f('role', e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="KASIR">KASIR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OWNER">OWNER</option>
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
        <Input
          label="Password Baru *"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Masukkan password baru"
        />
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
    </div>
  )
}
