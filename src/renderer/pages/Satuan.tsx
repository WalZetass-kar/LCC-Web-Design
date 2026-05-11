import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonPage } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Satuan } from '../../shared/types'

interface FormState {
  nama_satuan: string
}

const EMPTY: FormState = { nama_satuan: '' }

export default function SatuanPage() {
  const toast = useToast()
  const [data, setData] = useState<Satuan[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Satuan | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const r = await api<Satuan[]>('satuan:getAll')
    if (r.success) setData(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY }); setModal('add') }
  const openEdit = (row: Satuan) => {
    setSelected(row)
    setForm({ nama_satuan: row.nama_satuan ?? '' })
    setModal('edit')
  }
  const openDelete = (row: Satuan) => { setSelected(row); setConfirmDelete(true) }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.nama_satuan.trim()) {
      toast('Nama satuan wajib diisi', 'error')
      return
    }
    setLoading(true)
    const r = modal === 'add'
      ? await api('satuan:create', form)
      : await api('satuan:update', selected!.kd_satuan, form)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('satuan:delete', selected!.kd_satuan)
    setLoading(false)
    if (r.success) { toast(r.message as string); setConfirmDelete(false); setSelected(null); load() }
    else toast(r.message as string, 'error')
  }

  const columns: ColumnDef<Satuan>[] = [
    { accessorKey: 'kd_satuan', header: 'Kode', size: 100 },
    { accessorKey: 'nama_satuan', header: 'Nama Satuan' },
    {
      id: 'actions',
      header: 'Aksi',
      size: 120,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="danger" onClick={() => openDelete(row.original)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonPage rows={4} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Satuan</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Kelola satuan produk</p>
            </div>
            <Button onClick={openAdd}>
              <Plus size={18} />
              Tambah Satuan
            </Button>
          </div>
          <Card>
            <DataTable data={data} columns={columns} searchPlaceholder="Cari satuan..." />
          </Card>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Tambah Satuan' : 'Edit Satuan'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Batal</Button>
            <Button loading={loading} onClick={handleSave}>Simpan</Button>
          </>
        }
      >
        <Input
          label="Nama Satuan *"
          value={form.nama_satuan}
          onChange={e => setForm({ nama_satuan: e.target.value })}
          placeholder="Contoh: Pcs, Box, Kg, Liter"
        />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => { setConfirmDelete(false); setSelected(null) }}
        onConfirm={handleDelete}
        loading={loading}
        title="Hapus Satuan"
        message={`Yakin ingin menghapus satuan "${selected?.nama_satuan}"?`}
      />
    </div>
  )
}
