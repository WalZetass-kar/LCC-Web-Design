import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Gift } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { Customer } from '../../shared/types'

interface FormState {
  nama_customer: string
  no_telp: string
  email: string
  alamat: string
  tanggal_lahir: string
}

const EMPTY: FormState = {
  nama_customer: '', no_telp: '', email: '', alamat: '', tanggal_lahir: '',
}

export default function Customer() {
  const toast = useToast()
  const [data, setData] = useState<Customer[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const r = await api<Customer[]>('customer:getAll')
    if (r.success) setData(r.data ?? [])
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (row: Customer) => {
    setSelected(row)
    setForm({
      nama_customer: row.nama_customer ?? '',
      no_telp: row.no_telp ?? '',
      email: row.email ?? '',
      alamat: row.alamat ?? '',
      tanggal_lahir: row.tanggal_lahir ?? '',
    })
    setModal('edit')
  }
  const openDelete = (row: Customer) => { setSelected(row); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.nama_customer) {
      return toast('Nama customer wajib diisi', 'error')
    }
    setLoading(true)
    const r = modal === 'add'
      ? await api('customer:create', form)
      : await api('customer:update', selected!.id_customer, form)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('customer:delete', selected!.id_customer)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: 'nama_customer', header: 'Nama Customer' },
    { accessorKey: 'no_telp', header: 'No. Telp', size: 120 },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'poin_loyalty', header: 'Poin',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Gift size={14} className="text-amber-500" />
          <span className="font-semibold text-amber-600 dark:text-amber-400">{getValue() as number ?? 0}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_belanja', header: 'Total Belanja',
      cell: ({ getValue }) => <span className="font-medium text-primary-600 dark:text-primary-400">{formatRupiah(getValue() as number ?? 0)}</span>,
    },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => openDelete(row.original)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
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
        <p className="text-sm text-slate-500 dark:text-slate-400">{data.length} customer terdaftar</p>
        <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">Tambah Customer</Button>
      </div>

      <Card>
        <DataTable data={data} columns={columns} searchPlaceholder="Cari customer..." />
      </Card>

      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Tambah Customer' : 'Edit Customer'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nama Customer *" value={form.nama_customer} onChange={e => f('nama_customer', e.target.value)} />
          <Input label="No. Telepon" value={form.no_telp} onChange={e => f('no_telp', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
          <Input label="Tanggal Lahir" type="date" value={form.tanggal_lahir} onChange={e => f('tanggal_lahir', e.target.value)} />
          <div className="col-span-1 sm:col-span-2">
            <Input label="Alamat" value={form.alamat} onChange={e => f('alamat', e.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Hapus Customer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete} className="w-full sm:w-auto">Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Yakin ingin menghapus customer <strong>{selected?.nama_customer}</strong>?
        </p>
      </Modal>
    </div>
  )
}
