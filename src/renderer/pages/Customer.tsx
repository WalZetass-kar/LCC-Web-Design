import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Gift, ToggleLeft, ToggleRight, Minus, History } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Input from '../components/Input'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { api } from '../utils/api'
import { formatRupiah, formatDate } from '../utils/format'
import { useToast } from '../contexts/ToastContext'
import type { Customer, Penjualan } from '../../shared/types'

interface FormState {
  nama_customer: string
  no_telp: string
  email: string
  alamat: string
  tgl_lahir: string
}

const EMPTY: FormState = { nama_customer: '', no_telp: '', email: '', alamat: '', tgl_lahir: '' }

export default function CustomerPage() {
  const toast = useToast()
  const [data, setData] = useState<Customer[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'poin' | 'riwayat' | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [selected, setSelected] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [poinInput, setPoinInput] = useState('')
  const [poinMode, setPoinMode] = useState<'add' | 'sub'>('add')
  const [riwayat, setRiwayat] = useState<Penjualan[]>([])

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
      tgl_lahir: row.tgl_lahir ?? '',
    })
    setModal('edit')
  }
  const openDelete = (row: Customer) => { setSelected(row); setModal('delete') }
  const openPoin = (row: Customer) => { setSelected(row); setPoinInput(''); setPoinMode('add'); setModal('poin') }
  const openRiwayat = async (row: Customer) => {
    setSelected(row)
    setLoading(true)
    const r = await api<Penjualan[]>('customer:getRiwayatPembelian', row.kd_customer)
    setLoading(false)
    if (r.success) {
      setRiwayat(r.data ?? [])
      setModal('riwayat')
    } else {
      toast(r.message as string, 'error')
    }
  }
  const closeModal = () => { setModal(null); setSelected(null); setRiwayat([]) }

  const handleSave = async () => {
    if (!form.nama_customer) return toast('Nama customer wajib diisi', 'error')
    setLoading(true)
    const r = modal === 'add'
      ? await api('customer:create', form)
      : await api('customer:update', selected!.kd_customer, form)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleDelete = async () => {
    setLoading(true)
    const r = await api('customer:delete', selected!.kd_customer)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const handleToggleStatus = async (row: Customer) => {
    const r = await api('customer:toggleStatus', row.kd_customer)
    if (r.success) { toast(r.message as string); load() }
    else toast(r.message as string, 'error')
  }

  const handlePoin = async () => {
    const val = parseInt(poinInput)
    if (!val || val <= 0) return toast('Masukkan jumlah poin yang valid', 'error')
    setLoading(true)
    const finalPoin = poinMode === 'add' ? val : -val
    const r = await api('customer:addPoin', selected!.kd_customer, finalPoin)
    setLoading(false)
    if (r.success) { toast(r.message as string); closeModal(); load() }
    else toast(r.message as string, 'error')
  }

  const f = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: 'nama_customer', header: 'Nama Customer' },
    { accessorKey: 'no_telp', header: 'No. Telp', size: 120 },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'poin', header: 'Poin',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Gift size={13} className="text-amber-500" />
          <span className="font-semibold text-amber-600 dark:text-amber-400">{(getValue() as number ?? 0).toLocaleString('id-ID')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_belanja', header: 'Total Belanja',
      cell: ({ getValue }) => <span className="font-medium text-primary-600 dark:text-primary-400">{formatRupiah(getValue() as number ?? 0)}</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <button onClick={() => handleToggleStatus(row.original)} className="flex items-center gap-1 transition-colors" title="Toggle status">
          {row.original.status === 'Aktif'
            ? <><ToggleRight size={20} className="text-emerald-500" /><span className="text-xs text-emerald-600 dark:text-emerald-400">Aktif</span></>
            : <><ToggleLeft size={20} className="text-slate-400" /><span className="text-xs text-slate-400">Nonaktif</span></>
          }
        </button>
      ),
    },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700 text-primary-500 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => openPoin(row.original)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors" title="Kelola Poin">
            <Gift size={14} />
          </button>
          <button onClick={() => openRiwayat(row.original)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Riwayat Pembelian">
            <History size={14} />
          </button>
          <button onClick={() => openDelete(row.original)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Hapus">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{data.length} customer terdaftar</p>
        <Button icon={<Plus size={16} />} onClick={openAdd} className="w-full sm:w-auto">Tambah Customer</Button>
      </div>

      <Card>
        <DataTable data={data} columns={columns} searchPlaceholder="Cari customer..." />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'add' ? 'Tambah Customer' : 'Edit Customer'} size="md"
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
          <Input label="Tanggal Lahir" type="date" value={form.tgl_lahir} onChange={e => f('tgl_lahir', e.target.value)} />
          <div className="col-span-1 sm:col-span-2">
            <Input label="Alamat" value={form.alamat} onChange={e => f('alamat', e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Poin Modal */}
      <Modal open={modal === 'poin'} onClose={closeModal} title="Kelola Poin Loyalty" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Batal</Button>
            <Button loading={loading} onClick={handlePoin} className="w-full sm:w-auto">Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <span className="text-sm text-slate-600 dark:text-slate-300">Poin saat ini</span>
            <div className="flex items-center gap-1">
              <Gift size={16} className="text-amber-500" />
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {(selected?.poin ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setPoinMode('add')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${poinMode === 'add' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Plus size={14} /> Tambah
            </button>
            <button
              onClick={() => setPoinMode('sub')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${poinMode === 'sub' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Minus size={14} /> Kurangi
            </button>
          </div>

          <Input
            label={`Jumlah Poin yang ${poinMode === 'add' ? 'Ditambahkan' : 'Dikurangi'} *`}
            type="number"
            value={poinInput}
            onChange={e => setPoinInput(e.target.value)}
            placeholder="0"
          />

          {poinInput && parseInt(poinInput) > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm">
              <span className="text-slate-500">Poin setelah: </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {Math.max(0, (selected?.poin ?? 0) + (poinMode === 'add' ? parseInt(poinInput) : -parseInt(poinInput))).toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmDialog
        open={modal === 'delete'}
        onClose={closeModal}
        onConfirm={handleDelete}
        title="Hapus Customer"
        message={`Yakin ingin menghapus customer "${selected?.nama_customer}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={loading}
      />

      {/* Riwayat Pembelian Modal */}
      <Modal open={modal === 'riwayat'} onClose={closeModal} title={`Riwayat Pembelian — ${selected?.nama_customer}`} size="lg"
        footer={<Button variant="secondary" onClick={closeModal} className="w-full sm:w-auto">Tutup</Button>}
      >
        {loading ? (
          <div className="text-center py-8 text-slate-500">Memuat riwayat...</div>
        ) : riwayat.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Belum ada riwayat pembelian</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {riwayat.map(item => (
              <div key={item.kd_tansaksi_jual} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.kd_tansaksi_jual}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.tgl_wkt_transaksi)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatRupiah(item.yang_dibayar ?? 0)}</p>
                  <Badge label={item.jenis_pembayaran ?? 'Tunai'} variant={item.jenis_pembayaran === 'Transfer' ? 'blue' : 'green'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
