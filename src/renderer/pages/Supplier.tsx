import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Building2, Mail, Phone } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { SkeletonPage } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Supplier } from '../../shared/types'

interface FormState {
  kd_suplier: string
  nama_suplier: string
  alamat_suplier: string
  no_telp_hp: string
  email: string
}

const EMPTY: FormState = {
  kd_suplier: '',
  nama_suplier: '',
  alamat_suplier: '',
  no_telp_hp: '',
  email: '',
}

export default function SupplierPage() {
  const toast = useToast()
  const [data, setData] = useState<Supplier[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const r = await api<Supplier[]>('supplier:getAll')
    if (r.success) setData(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ ...EMPTY })
    setModal('add')
  }

  const openEdit = (row: Supplier) => {
    setSelected(row)
    setForm({
      kd_suplier: row.kd_suplier,
      nama_suplier: row.nama_suplier ?? '',
      alamat_suplier: row.alamat_suplier ?? '',
      no_telp_hp: row.no_telp_hp ?? '',
      email: row.email ?? '',
    })
    setModal('edit')
  }

  const openDelete = (row: Supplier) => {
    setSelected(row)
    setModal('delete')
  }

  const closeModal = () => {
    setModal(null)
    setSelected(null)
  }

  const handleSave = async () => {
    if (!form.kd_suplier.trim() || !form.nama_suplier.trim()) {
      toast('Kode dan nama supplier wajib diisi', 'error')
      return
    }

    setLoading(true)
    const r = modal === 'add'
      ? await api('supplier:create', { ...form, nama_pengguna: 'admin' })
      : await api('supplier:update', selected!.kd_suplier, { ...form, nama_pengguna: 'admin' })
    setLoading(false)

    if (r.success) {
      toast(r.message as string, 'success')
      closeModal()
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('supplier:delete', selected!.kd_suplier)
    setLoading(false)

    if (r.success) {
      toast(r.message as string, 'success')
      closeModal()
      load()
    } else {
      toast(r.message as string, 'error')
    }
  }

  const columns: ColumnDef<Supplier>[] = [
    { accessorKey: 'kd_suplier', header: 'Kode', size: 120 },
    {
      accessorKey: 'nama_suplier',
      header: 'Nama Supplier',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Building2 size={16} className="text-primary-600 dark:text-primary-400" />
          </div>
          <span className="font-medium">{row.original.nama_suplier}</span>
        </div>
      ),
    },
    {
      accessorKey: 'no_telp_hp',
      header: 'Telepon',
      cell: ({ getValue }) => {
        const val = getValue() as string
        return val ? (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Phone size={14} />
            {val}
          </div>
        ) : '-'
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => {
        const val = getValue() as string
        return val ? (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Mail size={14} />
            {val}
          </div>
        ) : '-'
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return <Badge label={status ?? 'Aktif'} variant={status === 'Aktif' ? 'green' : 'red'} />
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(row.original)}
            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => openDelete(row.original)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const f = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-3 sm:space-y-4">
      {loadingData ? (
        <SkeletonPage rows={5} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Supplier</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {data.length} supplier terdaftar
              </p>
            </div>
            <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">
              Tambah Supplier
            </Button>
          </div>
          <Card>
            <DataTable data={data} columns={columns} searchPlaceholder="Cari supplier..." />
          </Card>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? '➕ Tambah Supplier' : '✏️ Edit Supplier'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button loading={loading} onClick={handleSave}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Kode Supplier *"
            value={form.kd_suplier}
            onChange={e => f('kd_suplier', e.target.value)}
            disabled={modal === 'edit'}
            placeholder="SUP001"
            helperText="Kode unik supplier"
          />
          <Input
            label="Nama Supplier *"
            value={form.nama_suplier}
            onChange={e => f('nama_suplier', e.target.value)}
            placeholder="PT. Supplier Jaya"
          />
          <div className="sm:col-span-2">
            <Input
              label="Alamat"
              value={form.alamat_suplier}
              onChange={e => f('alamat_suplier', e.target.value)}
              placeholder="Jl. Contoh No. 123"
            />
          </div>
          <Input
            label="No. Telepon"
            value={form.no_telp_hp}
            onChange={e => f('no_telp_hp', e.target.value)}
            placeholder="08123456789"
            icon={<Phone size={16} />}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => f('email', e.target.value)}
            placeholder="supplier@example.com"
            icon={<Mail size={16} />}
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmDialog
        open={modal === 'delete'}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Hapus Supplier"
        message={`Yakin ingin menghapus supplier "${selected?.nama_suplier}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="danger"
        loading={loading}
      />
    </div>
  )
}
