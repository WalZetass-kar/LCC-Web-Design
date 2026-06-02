import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Input from '../components/Input'
import DataTable from '../components/DataTable'
import { SkeletonPage } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import type { Kategori } from '../../shared/types'

export default function Kategori() {
  const toast = useToast()
  const [data, setData] = useState<Kategori[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [form, setForm] = useState({ kategori_barang: '' })
  const [selected, setSelected] = useState<Kategori | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const load = async () => {
    const r = await api<Kategori[]>('kategori:getAll')
    if (r.success) setData(r.data ?? [])
    setLoadingData(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ kategori_barang: '' }); setModal('add') }
  const openEdit = (row: Kategori) => { setSelected(row); setForm({ kategori_barang: row.kategori_barang ?? '' }); setModal('edit') }
  const openDelete = (row: Kategori) => { setSelected(row); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    setLoading(true)
    const r = modal === 'add'
      ? await api('kategori:create', form)
      : await api('kategori:update', selected!.kd_kategori_barang, form)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('kategori:delete', selected!.kd_kategori_barang)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const columns: ColumnDef<Kategori>[] = [
    { accessorKey: 'kd_kategori_barang', header: 'ID', size: 60 },
    { accessorKey: 'kategori_barang', header: 'Nama Kategori' },
    { 
      accessorKey: 'jumlah_produk', 
      header: 'Jumlah Produk',
      size: 120,
      cell: ({ row }) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-500 text-white">
          {row.original.jumlah_produk || 0} produk
        </span>
      )
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

  return (
    <div className="space-y-4">
      {loadingData ? (
        <SkeletonPage rows={4} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{data.length} kategori terdaftar</p>
            <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">Tambah Kategori</Button>
          </div>
          <Card>
            <DataTable data={data} columns={columns} searchPlaceholder="Cari kategori..." />
          </Card>
        </>
      )}

      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Tambah Kategori' : 'Edit Kategori'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handleSave} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <Input
          label="Nama Kategori *"
          value={form.kategori_barang}
          onChange={e => setForm({ kategori_barang: e.target.value })}
          placeholder="Contoh: Minuman, Makanan..."
        />
      </Modal>

      <ConfirmDialog
        open={modal === 'delete'}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${selected?.kategori_barang}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={loading}
      />
    </div>
  )
}
